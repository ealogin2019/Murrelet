// Shipping an order: label, dispatch, delivery.
//
// The three verbs the admin and the Sendcloud webhook share. Everything they
// both need to agree on -- what a label changes and what it doesn't, when the
// dispatch email goes, who may send it -- lives here once.

import {
  Order,
  garmentTypeFromSku,
  getOrderById,
  markOrderDelivered,
  markOrderShipped,
  saveShipment,
} from "./orders";
import { announce, fetchLabel, parcelWeightKg, pickOption, sendcloudConfig, senderAddress } from "./sendcloud";
import { putObject, signedUrl } from "./r2";
import { sendEmail } from "./email";
import { orderShipped } from "./emails/order-shipped";

const LABEL_PREFIX = "labels/"; // in the PRIVATE R2 bucket, which has no public URL
const LABEL_URL_TTL = 60 * 60; // an hour; re-signed on every admin load

export class ShippingError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

/** Stripe's address shape, as the webhook stored it. */
type StripeAddress = {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
};

/**
 * Buys a label for a paid order and stores it. Idempotent: an order that
 * already has a parcel gets its existing label back. The order's status is
 * untouched -- see the migration for why a label is not a shipment.
 */
export async function createLabel(orderId: string): Promise<Order> {
  const cfg = sendcloudConfig();
  if (!cfg) throw new ShippingError("Sendcloud is not configured (SENDCLOUD_PUBLIC_KEY / SECRET_KEY).", 503);

  const order = await getOrderById(orderId);
  if (!order) throw new ShippingError("Order not found.", 404);
  if (order.shipment.sendcloudParcelId) return order;
  if (order.status !== "paid") {
    throw new ShippingError(`Order is ${order.status}; a label can only be made for a paid order.`);
  }

  const a = (order.shippingAddress ?? {}) as StripeAddress;
  if (!a.line1 || !a.city || !a.postal_code || !a.country) {
    throw new ShippingError("The order has no complete delivery address.");
  }
  // Stripe gives ISO-2. Anything else is a bug upstream, and Sendcloud will
  // reject it with a message that does not say so; refuse it here.
  if (!/^[A-Z]{2}$/.test(a.country)) {
    throw new ShippingError(`Country "${a.country}" is not an ISO-2 code.`);
  }
  const name = order.customerName?.trim();
  if (!name) throw new ShippingError("The order has no customer name for the label.");

  // Test mode buys Sendcloud's free unstamped letter, which has a low weight
  // limit: a real garment weight is rejected. Hyms found this the hard way and
  // pinned 100 g; the same here. Only in test mode -- a real label must carry
  // the real weight or the carrier re-weighs it and bills the difference.
  const weightKg = cfg.testMode
    ? "0.100"
    : parcelWeightKg(
        order.items.map((i) => ({ productType: garmentTypeFromSku(i.skuId), quantity: i.quantity }))
      );
  const from = await senderAddress(cfg);
  const option = await pickOption(cfg, {
    fromCountry: from.country_code || "GB",
    fromPostal: from.postal_code || "",
    toCountry: a.country,
    toPostal: a.postal_code,
    weightKg,
  }, order.shippingService);

  const announced = await announce(cfg, {
    orderNumber: order.orderNumber,
    from,
    to: {
      name,
      line1: a.line1,
      line2: a.line2,
      city: a.city,
      postal: a.postal_code,
      country: a.country,
      email: order.email,
    },
    option,
    weightKg,
  });

  // Re-host the label privately. A failure here is logged, not fatal: the
  // parcel exists at Sendcloud and the label can be re-fetched from the panel.
  let labelPath: string | null = null;
  if (announced.labelLink) {
    try {
      const bytes = await fetchLabel(cfg, announced.labelLink);
      const path = `${LABEL_PREFIX}${order.orderNumber}.pdf`;
      await putObject(path, bytes, "application/pdf", true);
      labelPath = path;
    } catch (e) {
      console.error(`[shipping] label fetch/upload failed for ${order.orderNumber}:`, e);
    }
  }

  await saveShipment(order.id, {
    carrier: announced.carrier ?? option.carrier ?? null,
    trackingNumber: announced.trackingNumber,
    trackingUrl: announced.trackingUrl,
    labelPath,
    sendcloudParcelId: announced.parcelId,
    carrierCostPence: option.pricePence,
  });
  console.log(
    `[shipping] label for ${order.orderNumber}: parcel ${announced.parcelId}, ${announced.trackingNumber}` +
      (cfg.testMode ? " [TEST MODE, sendcloud:letter, £0]" : "")
  );
  return (await getOrderById(order.id))!;
}

/** A short-lived URL for the stored label PDF, or null if there is none. */
export async function labelUrl(order: Order): Promise<string | null> {
  if (!order.shipment.labelPath) return null;
  try {
    return await signedUrl(order.shipment.labelPath, LABEL_URL_TTL);
  } catch (e) {
    console.error(`[shipping] could not sign label URL for ${order.orderNumber}:`, e);
    return null;
  }
}

/**
 * paid -> shipped, and the dispatch email -- once. Called by the admin's
 * button and by the webhook's first movement scan; whichever is second finds
 * the transition already made and sends nothing.
 */
export async function shipOrder(orderId: string, by: "admin" | "carrier"): Promise<{ transitioned: boolean }> {
  const moved = await markOrderShipped(orderId);
  if (!moved) return { transitioned: false };
  const order = await getOrderById(orderId);
  if (order?.email) {
    const { subject, html, text } = orderShipped(order);
    const sent = await sendEmail({ to: order.email, subject, html, text });
    console.log(
      sent.sent
        ? `[shipping] dispatch email sent for ${order.orderNumber} (${by}, ${sent.id})`
        : `[shipping] dispatch email NOT sent for ${order.orderNumber}: ${sent.reason}`
    );
  }
  return { transitioned: true };
}

export async function deliverOrder(orderId: string): Promise<{ transitioned: boolean }> {
  return { transitioned: await markOrderDelivered(orderId) };
}

// Orders.
//
// An order row is written BEFORE the customer reaches Stripe, holding the
// exact line items and unit prices the server resolved. The webhook then only
// has to confirm payment and fill in what Stripe knows (email, address,
// shipping cost). Doing it the other way round — building the order from the
// webhook payload — means the record of what you sold depends on a request
// you don't control arriving intact.
//
// Every function here uses the service role and must only run server-side.

import { supabaseAdmin } from "./supabase";

export type OrderLine = {
  skuId: string;
  productName: string;
  colour: string;
  size: string;
  unitPricePence: number;
  quantity: number;
  imageUrl: string | null;
};

export type Shipment = {
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  labelPath: string | null;
  sendcloudParcelId: number | null;
  carrierCostPence: number | null;
  labelCreatedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
};

export type Order = {
  id: string;
  orderNumber: string;
  email: string | null;
  customerName: string | null;
  status: string;
  shipment: Shipment;
  subtotalPence: number;
  shippingPence: number;
  totalPence: number | null;
  createdAt: string;
  /** Whatever Stripe collected at checkout. Shape is Stripe's, not ours. */
  shippingAddress: unknown;
  items: OrderLine[];
};

/** MUR-260729-4F2A9C — sortable by eye, short enough to read down a phone. */
export function generateOrderNumber(): string {
  const d = new Date();
  const date =
    String(d.getUTCFullYear()).slice(2) +
    String(d.getUTCMonth() + 1).padStart(2, "0") +
    String(d.getUTCDate()).padStart(2, "0");
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1
  let suffix = "";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  for (const b of bytes) suffix += alphabet[b % alphabet.length];
  return `MUR-${date}-${suffix}`;
}

export async function createPendingOrder(
  lines: OrderLine[],
  subtotalPence: number
): Promise<{ id: string; orderNumber: string }> {
  const db = supabaseAdmin();
  const orderNumber = generateOrderNumber();

  const { data, error } = await db
    .from("orders")
    .insert({
      order_number: orderNumber,
      status: "pending",
      subtotal_pence: subtotalPence,
      shipping_pence: 0,
      total_pence: null,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(`Failed to create order: ${error?.message}`);

  const { error: itemsError } = await db.from("order_items").insert(
    lines.map((l) => ({
      order_id: data.id,
      sku_id: l.skuId,
      product_name: l.productName,
      colour: l.colour,
      size: l.size,
      unit_price_pence: l.unitPricePence,
      quantity: l.quantity,
      image_url: l.imageUrl,
    }))
  );

  if (itemsError) {
    // A headless order with no lines is worse than no order, and it would
    // still occupy the session's unique index. Roll it back.
    await db.from("orders").delete().eq("id", data.id);
    throw new Error(`Failed to create order items: ${itemsError.message}`);
  }

  return { id: data.id, orderNumber };
}

export async function attachStripeSession(orderId: string, sessionId: string) {
  const { error } = await supabaseAdmin()
    .from("orders")
    .update({ stripe_session_id: sessionId })
    .eq("id", orderId);
  if (error) throw new Error(`Failed to attach session: ${error.message}`);
}

/**
 * Marks a pending order paid. Idempotent: Stripe retries webhooks, and the
 * same event may arrive more than once, so this only transitions rows that
 * are still pending and reports whether it actually changed anything.
 */
export async function markOrderPaid(
  sessionId: string,
  details: {
    email: string | null;
    customerName: string | null;
    paymentIntent: string | null;
    shippingPence: number;
    totalPence: number;
    shippingAddress: unknown;
  }
): Promise<{ updated: boolean; orderNumber: string | null; orderId: string | null }> {
  const { data, error } = await supabaseAdmin()
    .from("orders")
    .update({
      status: "paid",
      email: details.email,
      customer_name: details.customerName,
      stripe_payment_intent: details.paymentIntent,
      shipping_pence: details.shippingPence,
      total_pence: details.totalPence,
      shipping_address: details.shippingAddress,
    })
    .eq("stripe_session_id", sessionId)
    .eq("status", "pending")
    .select("id,order_number");

  if (error) throw new Error(`Failed to mark order paid: ${error.message}`);
  const row = data?.[0];
  return {
    updated: Boolean(row),
    orderNumber: row?.order_number ?? null,
    orderId: row?.id ?? null,
  };
}

const ORDER_SELECT =
  "id,order_number,email,customer_name,status,subtotal_pence,shipping_pence,total_pence,created_at,shipping_address," +
  "carrier,tracking_number,tracking_url,label_path,sendcloud_parcel_id,carrier_cost_pence," +
  "label_created_at,shipped_at,delivered_at," +
  "order_items(sku_id,product_name,colour,size,unit_price_pence,quantity,image_url)";

function toOrder(row: any): Order {
  return {
    id: row.id,
    orderNumber: row.order_number,
    email: row.email,
    customerName: row.customer_name ?? null,
    status: row.status,
    subtotalPence: row.subtotal_pence,
    shippingPence: row.shipping_pence,
    totalPence: row.total_pence,
    createdAt: row.created_at,
    shippingAddress: row.shipping_address ?? null,
    shipment: {
      carrier: row.carrier ?? null,
      trackingNumber: row.tracking_number ?? null,
      trackingUrl: row.tracking_url ?? null,
      labelPath: row.label_path ?? null,
      sendcloudParcelId: row.sendcloud_parcel_id ?? null,
      carrierCostPence: row.carrier_cost_pence ?? null,
      labelCreatedAt: row.label_created_at ?? null,
      shippedAt: row.shipped_at ?? null,
      deliveredAt: row.delivered_at ?? null,
    },
    items: (row.order_items ?? []).map((i: any) => ({
      skuId: i.sku_id,
      productName: i.product_name,
      colour: i.colour,
      size: i.size,
      unitPricePence: i.unit_price_pence,
      quantity: i.quantity,
      imageUrl: i.image_url,
    })),
  };
}

export async function getOrderBySession(sessionId: string): Promise<Order | null> {
  const { data, error } = await supabaseAdmin()
    .from("orders")
    .select(ORDER_SELECT)
    .eq("stripe_session_id", sessionId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load order: ${error.message}`);
  return data ? toOrder(data) : null;
}

export async function getOrderById(id: string): Promise<Order | null> {
  const { data, error } = await supabaseAdmin()
    .from("orders")
    .select(ORDER_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Failed to load order: ${error.message}`);
  return data ? toOrder(data) : null;
}

export async function getOrderByParcel(parcelId: number): Promise<Order | null> {
  const { data, error } = await supabaseAdmin()
    .from("orders")
    .select(ORDER_SELECT)
    .eq("sendcloud_parcel_id", parcelId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load order: ${error.message}`);
  return data ? toOrder(data) : null;
}

/** Everything that has been paid for, newest first. Pending rows are
 *  abandoned checkouts and are not the admin's business. */
export async function listOrders(limit = 200): Promise<Order[]> {
  const { data, error } = await supabaseAdmin()
    .from("orders")
    .select(ORDER_SELECT)
    .neq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Failed to list orders: ${error.message}`);
  return (data ?? []).map(toOrder);
}

/** Records a label. The status does NOT change: a label is not a shipment. */
export async function saveShipment(
  orderId: string,
  s: {
    carrier: string | null;
    trackingNumber: string;
    trackingUrl: string;
    labelPath: string | null;
    sendcloudParcelId: number;
    carrierCostPence: number | null;
  }
) {
  const { error } = await supabaseAdmin()
    .from("orders")
    .update({
      carrier: s.carrier,
      tracking_number: s.trackingNumber,
      tracking_url: s.trackingUrl,
      label_path: s.labelPath,
      sendcloud_parcel_id: s.sendcloudParcelId,
      carrier_cost_pence: s.carrierCostPence,
      label_created_at: new Date().toISOString(),
    })
    .eq("id", orderId);
  if (error) throw new Error(`Failed to save shipment: ${error.message}`);
}

/**
 * paid -> shipped, once. Returns whether THIS call made the transition, so a
 * carrier scan and a button press racing for the same order send one email
 * between them, not two.
 */
export async function markOrderShipped(orderId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin()
    .from("orders")
    .update({ status: "shipped", shipped_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("status", "paid")
    .select("id");
  if (error) throw new Error(`Failed to mark shipped: ${error.message}`);
  return Boolean(data?.length);
}

export async function markOrderDelivered(orderId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin()
    .from("orders")
    .update({ status: "delivered", delivered_at: new Date().toISOString() })
    .eq("id", orderId)
    .in("status", ["paid", "shipped"])
    .select("id");
  if (error) throw new Error(`Failed to mark delivered: ${error.message}`);
  return Boolean(data?.length);
}

/**
 * Garment family from the numeric SKU: digits 3-4 are the garment code
 * (90 tees, 91 hoodies -- see lib/catalog.ts). Order lines snapshot no type
 * of their own, and the number was designed to carry exactly this.
 */
export function garmentTypeFromSku(skuId: string | null): string | null {
  if (!skuId || !/^\d{10}$/.test(skuId)) return null;
  const t: Record<string, string> = { "90": "t-shirts", "91": "hoodies", "92": "sweatshirts" };
  return t[skuId.slice(2, 4)] ?? null;
}

/**
 * Takes the sold quantities off the tracked SKUs in a paid order.
 *
 * Call this only for the webhook delivery that actually moved the order from
 * pending to paid. markOrderPaid reports that with `updated`, and Stripe's
 * retries all find the row already paid, so a repeat delivery never reaches
 * here. That is the whole idempotency story — the SQL function itself has no
 * memory of having run.
 *
 * SKUs with stock = null are untracked and left alone.
 */
export async function decrementStockForOrder(
  orderId: string
): Promise<{ skuId: string; remaining: number; sold: number }[]> {
  const { data, error } = await supabaseAdmin().rpc("decrement_stock_for_order", {
    p_order_id: orderId,
  });

  if (error) throw new Error(`Failed to decrement stock: ${error.message}`);

  return (data ?? []).map((r: any) => ({
    skuId: r.sku_id,
    remaining: r.remaining,
    sold: r.sold,
  }));
}

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { decrementStockForOrder, markOrderPaid } from "@/lib/orders";

// The signature is computed over the exact bytes Stripe sent, so the body
// must be read raw. Any parsing or re-serialising first breaks verification.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey || !webhookSecret) {
    console.error("Stripe webhook is not configured (STRIPE_WEBHOOK_SECRET).");
    // 500 rather than 200: Stripe should retry once this is configured, not
    // treat the event as delivered and drop it.
    return NextResponse.json({ error: "Not configured." }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const stripe = new Stripe(secretKey);
  const body = await req.text();

  let event: Stripe.Event;
  try {
    // This is the only thing standing between a public URL and anyone being
    // able to mark orders paid. Never skip it, never fall back to trusting
    // the body if it fails.
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err: any) {
    console.error("Stripe signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      // A session can complete without being paid (e.g. an async payment
      // method still processing). Only settle the order once money is in.
      if (session.payment_status !== "paid") {
        return NextResponse.json({ received: true, skipped: "unpaid" });
      }

      const result = await markOrderPaid(session.id, {
        email: session.customer_details?.email ?? null,
        paymentIntent:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id ?? null,
        shippingPence: session.total_details?.amount_shipping ?? 0,
        totalPence: session.amount_total ?? 0,
        shippingAddress:
          session.customer_details?.address ?? null,
      });

      // Not an error: Stripe retries, and a repeat delivery finds the order
      // already paid. Acknowledge so it stops retrying.
      console.log(
        result.updated
          ? `Order ${result.orderNumber} marked paid (${session.id}).`
          : `Duplicate or unknown session, no change (${session.id}).`
      );

      // Inventory moves once, on the delivery that actually made the
      // pending -> paid transition. Retries report updated: false and skip it.
      if (result.updated && result.orderId) {
        try {
          const moved = await decrementStockForOrder(result.orderId);
          for (const m of moved) {
            if (m.remaining === 0) {
              // Either the last one sold, or more was sold than was held. The
              // SQL clamps at zero rather than raising, so this line is the
              // only trace of the difference. Worth a look either way: the
              // SKU is now off sale.
              console.warn(
                `SKU ${m.skuId} hit zero after selling ${m.sold} (order ${result.orderNumber}); now off sale.`
              );
            }
          }
          if (moved.length) {
            console.log(`Stock decremented for ${moved.length} tracked sku(s).`);
          }
        } catch (stockErr: any) {
          // Deliberately swallowed. The order IS paid and that transition has
          // already been written, so a 500 here would have Stripe retry into a
          // handler that now finds the order settled, reports updated: false,
          // and skips the decrement anyway. Retrying cannot fix this; it would
          // only bury a completed payment under failed deliveries. Log loudly
          // and reconcile by hand.
          console.error(
            `PAID BUT STOCK NOT DECREMENTED for order ${result.orderNumber} (${result.orderId}):`,
            stockErr
          );
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    // Returning non-2xx asks Stripe to retry, which is what we want if the
    // database was briefly unavailable.
    console.error("Webhook handling failed:", err);
    return NextResponse.json({ error: "Handler failed." }, { status: 500 });
  }
}

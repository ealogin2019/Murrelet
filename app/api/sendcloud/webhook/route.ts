import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { getOrderByParcel } from "@/lib/orders";
import { DELIVERED_CODES, SHIPPED_CODES } from "@/lib/sendcloud";
import { deliverOrder, shipOrder } from "@/lib/shipping";

// Sendcloud's parcel_status_changed webhook.
//
// Authentication, as Hyms settled it: a shared secret in the query string
// (?secret=...) is what Sendcloud's custom-integration webhooks reliably
// carry; an HMAC-SHA256 header is verified as well when present. Configure
// the URL in Sendcloud as
//   https://murrelet.co.uk/api/sendcloud/webhook?secret=<SENDCLOUD_WEBHOOK_SECRET>
// This path is exempt from the site password in middleware.ts.
//
// A label's own "announced" scans are deliberately not in SHIPPED_CODES; only
// a real movement advances an order, and only the first of scan-or-button
// sends the dispatch email.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function equal(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function POST(req: NextRequest) {
  const secret = process.env.SENDCLOUD_WEBHOOK_SECRET;
  if (!secret) {
    console.error("Sendcloud webhook is not configured (SENDCLOUD_WEBHOOK_SECRET).");
    return NextResponse.json({ error: "Not configured." }, { status: 500 });
  }
  const body = await req.text();
  const q = req.nextUrl.searchParams.get("secret");
  const sig = req.headers.get("sendcloud-signature");
  let ok = false;
  if (q) ok = equal(q, secret);
  else if (sig) ok = equal(sig, createHmac("sha256", secret).update(body).digest("hex"));
  if (!ok) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

  let event: any;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  if (event?.action !== "parcel_status_changed") {
    return NextResponse.json({ received: true, ignored: event?.action ?? "unknown" });
  }

  const parcel = event.parcel ?? {};
  const parcelId = Number(parcel.id);
  const code = Number(parcel.status?.id);
  if (!parcelId || !Number.isFinite(code)) {
    return NextResponse.json({ received: true, ignored: "no parcel/status" });
  }

  const order = await getOrderByParcel(parcelId);
  if (!order) return NextResponse.json({ received: true, ignored: "unknown parcel" });

  try {
    if (DELIVERED_CODES.has(code)) {
      // A delivery scan on an order never marked shipped: ship it first so the
      // customer still gets the dispatch email, then deliver.
      if (order.status === "paid") await shipOrder(order.id, "carrier");
      const r = await deliverOrder(order.id);
      console.log(`[sendcloud] ${order.orderNumber} status ${code} -> delivered (${r.transitioned ? "moved" : "no change"})`);
    } else if (SHIPPED_CODES.has(code)) {
      const r = await shipOrder(order.id, "carrier");
      console.log(`[sendcloud] ${order.orderNumber} status ${code} -> shipped (${r.transitioned ? "moved" : "no change"})`);
    } else {
      console.log(`[sendcloud] ${order.orderNumber} status ${code} (${parcel.status?.message ?? ""}) -- no transition`);
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[sendcloud] webhook failed:", err);
    return NextResponse.json({ error: "Handler failed." }, { status: 500 });
  }
}

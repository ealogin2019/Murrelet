// The dispatch email: "it's on its way", with tracking.
//
// Sent once, on the paid -> shipped transition, whichever of the carrier's
// first scan or the admin's button gets there first (markOrderShipped makes
// that a single event). Same 2005 table markup as the confirmation, for the
// same reasons -- see order-confirmation.ts.

import { Order } from "@/lib/orders";
import { SITE_URL } from "@/lib/site";

const INK = "#141414";
const MUTED = "#6b6b6b";
const RULE = "#e3e1dd";
const PAPER = "#faf9f7";

const ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};
function esc(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ENTITIES[c]);
}

function addressLines(a: unknown): string[] {
  if (!a || typeof a !== "object") return [];
  const x = a as Record<string, string | null>;
  return [x.line1, x.line2, x.city, x.state, x.postal_code, x.country].filter(
    (v): v is string => Boolean(v && v.trim())
  );
}

export function orderShipped(order: Order): { subject: string; html: string; text: string } {
  const subject = `Your Murrelet order ${order.orderNumber} is on its way`;
  const addr = addressLines(order.shippingAddress);
  const { trackingNumber, trackingUrl, carrier } = order.shipment;
  const items = order.items
    .map(
      (i) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid ${RULE};font-family:Georgia,'Times New Roman',serif;font-size:15px;color:${INK};">
          ${esc(i.productName)}
          <span style="font-family:Helvetica,Arial,sans-serif;font-size:12px;color:${MUTED};letter-spacing:.04em;"> &middot; ${esc(i.colour)} &middot; ${esc(i.size)} &middot; Qty ${i.quantity}</span>
        </td>
      </tr>`
    )
    .join("");

  const trackBlock = trackingUrl
    ? `<a href="${esc(trackingUrl)}" style="display:inline-block;padding:13px 30px;background:${INK};color:#ffffff;text-decoration:none;font-family:Helvetica,Arial,sans-serif;font-size:13px;letter-spacing:.1em;text-transform:uppercase;">Track your parcel</a>
          <p style="margin:14px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:12px;color:${MUTED};">${carrier ? esc(carrier) + " &middot; " : ""}${esc(trackingNumber ?? "")}</p>`
    : `<p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.65;color:${INK};">Tracking will follow from the carrier.</p>`;

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${PAPER};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Order ${esc(order.orderNumber)} has been dispatched.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;">
        <tr><td style="padding:40px 40px 0;text-align:center;">
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;letter-spacing:.22em;color:${INK};text-transform:uppercase;">Murrelet</div>
        </td></tr>
        <tr><td style="padding:36px 40px 0;">
          <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:26px;line-height:1.3;color:${INK};">It&rsquo;s on its way</h1>
          <p style="margin:10px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:13px;letter-spacing:.08em;color:${MUTED};text-transform:uppercase;">Order ${esc(order.orderNumber)}</p>
          <p style="margin:20px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.65;color:${INK};">
            Your parcel has left us and is with the carrier.
          </p>
        </td></tr>
        <tr><td style="padding:28px 40px 0;">${trackBlock}</td></tr>
        <tr><td style="padding:28px 40px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items}</table>
        </td></tr>
${
  addr.length
    ? `
        <tr><td style="padding:28px 40px 0;">
          <p style="margin:0 0 8px;font-family:Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:.1em;color:${MUTED};text-transform:uppercase;">Delivering to</p>
          <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.6;color:${INK};">${addr.map(esc).join("<br />")}</p>
        </td></tr>`
    : ""
}
        <tr><td style="padding:32px 40px 36px;border-top:1px solid ${RULE};margin-top:32px;">
          <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.7;color:${MUTED};">
            Questions? Reply to this email and quote ${esc(order.orderNumber)}. <a href="${SITE_URL}/shipping-returns" style="color:${MUTED};">Delivery &amp; returns</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = [
    `Your Murrelet order ${order.orderNumber} is on its way.`,
    "",
    trackingUrl ? `Track it: ${trackingUrl}` : "Tracking will follow from the carrier.",
    trackingNumber ? `${carrier ? carrier + " " : ""}${trackingNumber}` : "",
    "",
    ...order.items.map((i) => `${i.productName} - ${i.colour} / ${i.size} x${i.quantity}`),
    "",
    ...(addr.length ? ["Delivering to:", ...addr, ""] : []),
    `Questions? Reply to this email and quote ${order.orderNumber}.`,
  ]
    .filter((l, idx, arr) => !(l === "" && arr[idx - 1] === ""))
    .join("\n");

  return { subject, html, text };
}

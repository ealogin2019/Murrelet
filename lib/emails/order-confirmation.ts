// The order confirmation.
//
// Written as tables with inline styles on purpose. Outlook renders HTML with
// Word's engine, some Gmail clients strip <style> blocks, and neither flexbox
// nor grid can be relied on. This looks like 2005 markup because that is what
// survives the trip.
//
// Every colour is stated explicitly rather than inherited. A client applying
// its own dark mode inverts what it can, and unstated colours are what produce
// black text on a black background.

import { Order } from "@/lib/orders";
import { formatPrice } from "@/lib/format";
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

// Product names, colours and addresses are customer- and admin-supplied text
// landing in markup. Escape everything interpolated, without exception.
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

export function orderConfirmation(order: Order): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Your Murrelet order ${order.orderNumber}`;
  const addr = addressLines(order.shippingAddress);
  const total = order.totalPence ?? order.subtotalPence;
  const delivery = order.shippingPence === 0 ? "Free" : formatPrice(order.shippingPence);

  const rows = order.items
    .map((i) => {
      const cell = "padding:16px 0;border-bottom:1px solid " + RULE + ";vertical-align:top;";
      const thumb = i.imageUrl
        ? `<img src="${esc(i.imageUrl)}" width="64" alt="${esc(i.productName)}" style="display:block;width:64px;height:auto;border:0;background:${PAPER};" />`
        : "";
      return `
      <tr>
        <td style="${cell}width:72px;">${thumb}</td>
        <td style="${cell}padding-left:12px;padding-right:12px;font-family:Georgia,'Times New Roman',serif;color:${INK};font-size:15px;line-height:1.5;">
          ${esc(i.productName)}
          <div style="font-family:Helvetica,Arial,sans-serif;font-size:12px;color:${MUTED};letter-spacing:.04em;padding-top:4px;">
            ${esc(i.colour)} &middot; ${esc(i.size)} &middot; Qty ${i.quantity}
          </div>
        </td>
        <td style="${cell}text-align:right;font-family:Helvetica,Arial,sans-serif;font-size:14px;color:${INK};white-space:nowrap;">
          ${formatPrice(i.unitPricePence * i.quantity)}
        </td>
      </tr>`;
    })
    .join("");

  function totalRow(label: string, value: string, strong = false) {
    const weight = strong ? "600" : "400";
    const size = strong ? "16px" : "14px";
    const pad = strong ? "14px" : "6px";
    const base = `font-family:Helvetica,Arial,sans-serif;font-size:${size};font-weight:${weight};`;
    return `
      <tr>
        <td style="padding:${pad} 0 6px;${base}color:${strong ? INK : MUTED};">${label}</td>
        <td style="padding:${pad} 0 6px;text-align:right;${base}color:${INK};">${value}</td>
      </tr>`;
  }

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${PAPER};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    Order ${esc(order.orderNumber)} &mdash; ${order.items.length} item${order.items.length === 1 ? "" : "s"}, ${formatPrice(total)}.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;">

        <tr><td style="padding:40px 40px 0;text-align:center;">
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;letter-spacing:.22em;color:${INK};text-transform:uppercase;">Murrelet</div>
        </td></tr>

        <tr><td style="padding:36px 40px 0;">
          <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:26px;line-height:1.3;color:${INK};">Thank you for your order</h1>
          <p style="margin:10px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:13px;letter-spacing:.08em;color:${MUTED};text-transform:uppercase;">Order ${esc(order.orderNumber)}</p>
          <p style="margin:20px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.65;color:${INK};">
            We have your order and your payment. You will hear from us again when it leaves us, with tracking so you can follow it.
          </p>
        </td></tr>

        <tr><td style="padding:28px 40px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
        </td></tr>

        <tr><td style="padding:8px 40px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${totalRow("Subtotal", formatPrice(order.subtotalPence))}
            ${totalRow("Delivery", delivery)}
            ${totalRow("Total", formatPrice(total), true)}
          </table>
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
        <tr><td style="padding:32px 40px 40px;">
          <a href="${SITE_URL}" style="display:inline-block;padding:13px 30px;background:${INK};color:#ffffff;text-decoration:none;font-family:Helvetica,Arial,sans-serif;font-size:13px;letter-spacing:.1em;text-transform:uppercase;">Continue shopping</a>
        </td></tr>

        <tr><td style="padding:24px 40px 36px;border-top:1px solid ${RULE};">
          <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.7;color:${MUTED};">
            Questions about this order? Reply to this email and quote ${esc(order.orderNumber)}.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = [
    "MURRELET",
    "",
    "Thank you for your order",
    `Order ${order.orderNumber}`,
    "",
    "We have your order and your payment. You will hear from us again",
    "when it leaves us, with tracking so you can follow it.",
    "",
    ...order.items.map(
      (i) =>
        `  ${i.productName} - ${i.colour}, ${i.size} x${i.quantity}   ` +
        formatPrice(i.unitPricePence * i.quantity)
    ),
    "",
    `  Subtotal  ${formatPrice(order.subtotalPence)}`,
    `  Delivery  ${delivery}`,
    `  Total     ${formatPrice(total)}`,
    ...(addr.length ? ["", "Delivering to:", ...addr.map((l) => `  ${l}`)] : []),
    "",
    SITE_URL,
    "",
    `Questions about this order? Reply to this email and quote ${order.orderNumber}.`,
  ].join("\n");

  return { subject, html, text };
}

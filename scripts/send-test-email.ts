// Sends the real order confirmation, built from a sample order, to one
// address -- so the key, the sending domain and the template are proven in
// an actual inbox before a customer's receipt depends on them.
//
//   npx tsx scripts/send-test-email.ts you@example.com
//
// Reads RESEND_API_KEY and MAIL_FROM from .env.local. Unconfigured, it prints
// what it would have sent and exits 1, the same path the webhook takes.
//
// Nothing here touches the database or Stripe. The order number is marked as
// a test in the subject so it cannot be mistaken for a sale.

import { config } from "dotenv";
config({ path: ".env.local" });

import type { Order } from "../lib/orders";

async function main() {
  const to = process.argv[2];
  if (!to || !to.includes("@")) {
    console.error("Usage: npx tsx scripts/send-test-email.ts you@example.com");
    process.exit(2);
  }

  // Imported after dotenv so the modules see the loaded env.
  const { sendEmail } = await import("../lib/email");
  const { orderConfirmation } = await import("../lib/emails/order-confirmation");

  const order: Order = {
    id: "test",
    orderNumber: "MUR-TEST-000000",
    email: to,
    status: "paid",
    subtotalPence: 7000,
    shippingPence: 495,
    totalPence: 7495,
    createdAt: new Date().toISOString(),
    shippingAddress: {
      line1: "1 Example Street",
      line2: null,
      city: "London",
      state: null,
      postal_code: "SW1A 1AA",
      country: "GB",
    },
    items: [
      {
        skuId: "2690001003",
        productName: "Large Text Tee",
        colour: "Black",
        size: "M",
        unitPricePence: 3500,
        quantity: 1,
        imageUrl: "/images/catalog/large-text-tee/black/1.webp",
      },
      {
        skuId: "2691206004",
        productName: "Small Text Logo Hoodie",
        colour: "Navy",
        size: "L",
        unitPricePence: 3500,
        quantity: 1,
        imageUrl: "/images/catalog/small-text-logo-hoodie/navy-blue/1.webp",
      },
    ],
  };

  const { subject, html, text } = orderConfirmation(order);
  console.log(`From:    ${process.env.MAIL_FROM ?? "(MAIL_FROM unset)"}`);
  console.log(`To:      ${to}`);
  console.log(`Subject: [TEST] ${subject}`);
  console.log(`Size:    html ${html.length} chars, text ${text.length} chars\n`);

  const result = await sendEmail({ to, subject: `[TEST] ${subject}`, html, text });
  if (result.sent) {
    console.log(`Sent. Resend id ${result.id}`);
  } else {
    console.error(`NOT sent: ${result.reason}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

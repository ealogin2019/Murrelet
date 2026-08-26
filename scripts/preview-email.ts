// Renders the order confirmation to an HTML file you can open in a browser.
//
//   npx tsx scripts/preview-email.ts
//
// Uses a real order from the database when one exists, so the preview shows
// actual product names, colours and photography rather than invented copy.
// Falls back to a fixture if the table is empty. Sends nothing.

import { config } from "dotenv";
import { writeFileSync } from "fs";
import { join } from "path";

config({ path: ".env.local" });

import { orderConfirmation } from "../lib/emails/order-confirmation";
import type { Order } from "../lib/orders";

const FIXTURE: Order = {
  id: "fixture",
  orderNumber: "MUR-260826-K7QW2M",
  email: "preview@example.com",
  status: "paid",
  subtotalPence: 12000,
  shippingPence: 495,
  totalPence: 12495,
  createdAt: new Date().toISOString(),
  shippingAddress: {
    line1: "14 Marlborough Place",
    line2: null,
    city: "London",
    state: null,
    postal_code: "NW8 0PL",
    country: "GB",
  },
  items: [
    {
      skuId: "fixture-1",
      productName: "Plain Short Sleeve Shirt",
      colour: "Navy",
      size: "M",
      unitPricePence: 6500,
      quantity: 1,
      imageUrl: null,
    },
    {
      skuId: "fixture-2",
      productName: "Casual Polo Shirt",
      colour: "Chambray",
      size: "L",
      unitPricePence: 5500,
      quantity: 1,
      imageUrl: null,
    },
  ],
};

async function realOrder(): Promise<Order | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    const { supabaseAdmin } = await import("../lib/supabase");
    const { data } = await supabaseAdmin()
      .from("orders")
      .select(
        "id,order_number,email,status,subtotal_pence,shipping_pence,total_pence," +
          "created_at,shipping_address,order_items(sku_id,product_name,colour,size," +
          "unit_price_pence,quantity,image_url)"
      )
      .order("created_at", { ascending: false })
      .limit(1);

    const row = data?.[0] as any;
    if (!row?.order_items?.length) return null;

    return {
      id: row.id,
      orderNumber: row.order_number,
      email: row.email ?? "preview@example.com",
      status: row.status,
      subtotalPence: row.subtotal_pence,
      shippingPence: row.shipping_pence,
      totalPence: row.total_pence,
      createdAt: row.created_at,
      shippingAddress: row.shipping_address ?? null,
      items: row.order_items.map((i: any) => ({
        skuId: i.sku_id,
        productName: i.product_name,
        colour: i.colour,
        size: i.size,
        unitPricePence: i.unit_price_pence,
        quantity: i.quantity,
        imageUrl: i.image_url,
      })),
    };
  } catch {
    return null;
  }
}

async function main() {
  const live = await realOrder();
  const order = live ?? FIXTURE;
  console.log(live ? `Using real order ${order.orderNumber}` : "No orders found, using fixture");

  const { subject, html, text } = orderConfirmation(order);
  // Project root, not public/ -- this must never be served from the live site.
  const out = join("email-preview.html");
  writeFileSync(out, html, "utf-8");

  console.log(`\nSubject: ${subject}`);
  console.log(`HTML:    ${out} (${(html.length / 1024).toFixed(1)} KB)`);
  console.log(`\n--- plain text alternative ---\n${text}`);
}

main();

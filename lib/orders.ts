// Orders.
//
// An order row is written BEFORE the customer reaches Stripe, holding the
// exact line items and unit prices the server resolved. The webhook then only
// has to confirm payment and fill in what Stripe knows (email, address,
// shipping cost). Doing it the other way round — building the order from the
// webhook payload — means the record of what you sold depends on a request
// you don't control arriving intact.
//
// Every function here must only run server-side.

import { db, Sql } from "./db";

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
  const sql = db();
  const orderNumber = generateOrderNumber();
  // The id is minted here so the order and its lines can go in one
  // transaction: a headless order with no lines is worse than no order.
  const id = crypto.randomUUID();
  const items = JSON.stringify(
    lines.map((l) => ({
      order_id: id,
      sku_id: l.skuId,
      product_name: l.productName,
      colour: l.colour,
      size: l.size,
      unit_price_pence: l.unitPricePence,
      quantity: l.quantity,
      image_url: l.imageUrl,
    }))
  );

  try {
    await sql.transaction([
      sql`insert into orders (id, order_number, status, subtotal_pence, shipping_pence, total_pence)
           values (${id}, ${orderNumber}, 'pending', ${subtotalPence}, 0, null)`,
      sql`insert into order_items
             (order_id, sku_id, product_name, colour, size, unit_price_pence, quantity, image_url)
           select order_id, sku_id, product_name, colour, size, unit_price_pence, quantity, image_url
             from jsonb_to_recordset(${items}::jsonb) as t(
               order_id uuid, sku_id text, product_name text, colour text, size text,
               unit_price_pence int, quantity int, image_url text)`,
    ]);
  } catch (e) {
    throw new Error(`Failed to create order: ${(e as Error).message}`);
  }

  return { id, orderNumber };
}

export async function attachStripeSession(orderId: string, sessionId: string) {
  try {
    await db()`update orders set stripe_session_id = ${sessionId} where id = ${orderId}`;
  } catch (e) {
    throw new Error(`Failed to attach session: ${(e as Error).message}`);
  }
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
  let data: { id: string; order_number: string }[];
  try {
    data = (await db()`
      update orders set
        status = 'paid',
        email = ${details.email},
        customer_name = ${details.customerName},
        stripe_payment_intent = ${details.paymentIntent},
        shipping_pence = ${details.shippingPence},
        total_pence = ${details.totalPence},
        shipping_address = ${JSON.stringify(details.shippingAddress ?? null)}::jsonb
      where stripe_session_id = ${sessionId} and status = 'pending'
      returning id, order_number
    `) as { id: string; order_number: string }[];
  } catch (e) {
    throw new Error(`Failed to mark order paid: ${(e as Error).message}`);
  }
  const row = data[0];
  return {
    updated: Boolean(row),
    orderNumber: row?.order_number ?? null,
    orderId: row?.id ?? null,
  };
}

// One order per row, its lines nested as JSON. `where` is a fragment built
// by the caller with the same tagged template, so it stays parameterised.
async function selectOrders(where: ReturnType<Sql>, limit: number): Promise<any[]> {
  return (await db()`
    select o.id, o.order_number, o.email, o.customer_name, o.status, o.subtotal_pence,
           o.shipping_pence, o.total_pence, o.created_at, o.shipping_address,
           o.carrier, o.tracking_number, o.tracking_url, o.label_path, o.sendcloud_parcel_id,
           o.carrier_cost_pence, o.label_created_at, o.shipped_at, o.delivered_at,
           coalesce((
             select jsonb_agg(jsonb_build_object(
               'sku_id', i.sku_id, 'product_name', i.product_name, 'colour', i.colour,
               'size', i.size, 'unit_price_pence', i.unit_price_pence,
               'quantity', i.quantity, 'image_url', i.image_url))
             from order_items i where i.order_id = o.id
           ), '[]'::jsonb) as order_items
    from orders o
    where ${where}
    order by o.created_at desc
    limit ${limit}
  `) as any[];
}

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
    // The driver hands timestamps back as Date; the app has always passed
    // ISO strings around.
    createdAt: new Date(row.created_at).toISOString(),
    shippingAddress: row.shipping_address ?? null,
    shipment: {
      carrier: row.carrier ?? null,
      trackingNumber: row.tracking_number ?? null,
      trackingUrl: row.tracking_url ?? null,
      labelPath: row.label_path ?? null,
      sendcloudParcelId: row.sendcloud_parcel_id ?? null,
      carrierCostPence: row.carrier_cost_pence ?? null,
      labelCreatedAt: iso(row.label_created_at),
      shippedAt: iso(row.shipped_at),
      deliveredAt: iso(row.delivered_at),
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

function iso(v: unknown): string | null {
  return v == null ? null : new Date(v as string | Date).toISOString();
}

async function findOrder(where: ReturnType<Sql>): Promise<Order | null> {
  try {
    const rows = await selectOrders(where, 1);
    return rows[0] ? toOrder(rows[0]) : null;
  } catch (e) {
    throw new Error(`Failed to load order: ${(e as Error).message}`);
  }
}

export async function getOrderBySession(sessionId: string): Promise<Order | null> {
  return findOrder(db()`o.stripe_session_id = ${sessionId}`);
}

export async function getOrderById(id: string): Promise<Order | null> {
  return findOrder(db()`o.id = ${id}::uuid`);
}

export async function getOrderByParcel(parcelId: number): Promise<Order | null> {
  return findOrder(db()`o.sendcloud_parcel_id = ${parcelId}`);
}

/** Everything that has been paid for, newest first. Pending rows are
 *  abandoned checkouts and are not the admin's business. */
export async function listOrders(limit = 200): Promise<Order[]> {
  try {
    const rows = await selectOrders(db()`o.status <> 'pending'`, limit);
    return rows.map(toOrder);
  } catch (e) {
    throw new Error(`Failed to list orders: ${(e as Error).message}`);
  }
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
  try {
    await db()`
      update orders set
        carrier = ${s.carrier},
        tracking_number = ${s.trackingNumber},
        tracking_url = ${s.trackingUrl},
        label_path = ${s.labelPath},
        sendcloud_parcel_id = ${s.sendcloudParcelId},
        carrier_cost_pence = ${s.carrierCostPence},
        label_created_at = now()
      where id = ${orderId}::uuid
    `;
  } catch (e) {
    throw new Error(`Failed to save shipment: ${(e as Error).message}`);
  }
}

/**
 * paid -> shipped, once. Returns whether THIS call made the transition, so a
 * carrier scan and a button press racing for the same order send one email
 * between them, not two.
 */
export async function markOrderShipped(orderId: string): Promise<boolean> {
  try {
    const rows = await db()`
      update orders set status = 'shipped', shipped_at = now()
      where id = ${orderId}::uuid and status = 'paid'
      returning id
    `;
    return rows.length > 0;
  } catch (e) {
    throw new Error(`Failed to mark shipped: ${(e as Error).message}`);
  }
}

export async function markOrderDelivered(orderId: string): Promise<boolean> {
  try {
    const rows = await db()`
      update orders set status = 'delivered', delivered_at = now()
      where id = ${orderId}::uuid and status in ('paid', 'shipped')
      returning id
    `;
    return rows.length > 0;
  } catch (e) {
    throw new Error(`Failed to mark delivered: ${(e as Error).message}`);
  }
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
  let data: any[];
  try {
    data = await db()`select * from decrement_stock_for_order(${orderId}::uuid)`;
  } catch (e) {
    throw new Error(`Failed to decrement stock: ${(e as Error).message}`);
  }

  return data.map((r: any) => ({
    skuId: r.sku_id,
    remaining: r.remaining,
    sold: r.sold,
  }));
}

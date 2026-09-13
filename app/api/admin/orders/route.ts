import { NextResponse } from "next/server";
import { listOrders } from "@/lib/orders";
import { labelUrl } from "@/lib/shipping";
import { sendcloudConfig } from "@/lib/sendcloud";

export const dynamic = "force-dynamic";

// Protected by middleware.ts (admin session cookie).
export async function GET() {
  const orders = await listOrders();
  // Signed label URLs are minted per load; they expire and are not stored.
  const withLabels = await Promise.all(
    orders.map(async (o) => ({ ...o, labelUrl: await labelUrl(o) }))
  );
  const cfg = sendcloudConfig();
  return NextResponse.json({
    orders: withLabels,
    sendcloud: cfg ? (cfg.testMode ? "test" : "live") : "unconfigured",
  });
}

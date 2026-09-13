import { NextRequest, NextResponse } from "next/server";
import { createLabel, labelUrl, ShippingError } from "@/lib/shipping";

export const dynamic = "force-dynamic";

// Buys (or re-returns) the label for one paid order. Status stays 'paid'.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const order = await createLabel(params.id);
    return NextResponse.json({ order: { ...order, labelUrl: await labelUrl(order) } });
  } catch (err: any) {
    const status = err instanceof ShippingError ? err.status : 502;
    console.error(`[admin/orders/${params.id}/label]`, err);
    return NextResponse.json({ error: err.message || "Label failed." }, { status });
  }
}

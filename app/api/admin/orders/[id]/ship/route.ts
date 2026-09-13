import { NextRequest, NextResponse } from "next/server";
import { getOrderById } from "@/lib/orders";
import { shipOrder, deliverOrder } from "@/lib/shipping";

export const dynamic = "force-dynamic";

// The admin's "Mark shipped" / "Mark delivered". The dispatch email goes on
// the first of button or carrier scan to make the paid -> shipped move.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const to = body?.to === "delivered" ? "delivered" : "shipped";
  try {
    const r = to === "delivered" ? await deliverOrder(params.id) : await shipOrder(params.id, "admin");
    const order = await getOrderById(params.id);
    return NextResponse.json({ ok: true, transitioned: r.transitioned, order });
  } catch (err: any) {
    console.error(`[admin/orders/${params.id}/ship]`, err);
    return NextResponse.json({ error: err.message || "Update failed." }, { status: 500 });
  }
}

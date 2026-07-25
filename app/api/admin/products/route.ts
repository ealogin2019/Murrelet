import { NextRequest, NextResponse } from "next/server";
import { getProducts, saveProducts } from "@/lib/blob-store";
import { Product } from "@/lib/products";

export const dynamic = "force-dynamic";

// Protected by middleware.ts (requires a valid admin session cookie).

export async function GET() {
  const products = await getProducts();
  return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const products = body?.products as Product[] | undefined;

  if (!Array.isArray(products)) {
    return NextResponse.json({ error: "Expected { products: Product[] }." }, { status: 400 });
  }

  for (const p of products) {
    if (!p.id || !p.slug || !p.name || typeof p.price !== "number") {
      return NextResponse.json(
        { error: `Product "${p.name || p.id || "unknown"}" is missing required fields.` },
        { status: 400 }
      );
    }
  }

  try {
    await saveProducts(products);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to save products." }, { status: 500 });
  }
}

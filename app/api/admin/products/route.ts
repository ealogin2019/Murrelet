import { NextRequest, NextResponse } from "next/server";
import { getCatalog, saveCatalog } from "@/lib/catalog-store";
import { Product } from "@/lib/catalog";

export const dynamic = "force-dynamic";

// Protected by middleware.ts (requires a valid admin session cookie).

export async function GET() {
  const products = await getCatalog();
  return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const products = body?.products as Product[] | undefined;

  if (!Array.isArray(products)) {
    return NextResponse.json({ error: "Expected { products: Product[] }." }, { status: 400 });
  }

  // Structural validation. The admin UI cannot yet author variants, so this
  // guards against a client posting the old flat shape and wiping the colour
  // data — a save that looks successful and silently destroys the catalog is
  // the worst possible failure here.
  for (const p of products) {
    if (!p.id || !p.slug || !p.name || typeof p.price !== "number") {
      return NextResponse.json(
        { error: `Product "${p.name || p.id || "unknown"}" is missing required fields.` },
        { status: 400 }
      );
    }
    if (!Array.isArray(p.variants) || p.variants.length === 0) {
      return NextResponse.json(
        { error: `Product "${p.name}" has no variants. Refusing to save.` },
        { status: 400 }
      );
    }
    for (const v of p.variants) {
      if (!v.id || !v.colour || !Array.isArray(v.skus) || v.skus.length === 0) {
        return NextResponse.json(
          { error: `Colour "${v.colour || v.id}" on "${p.name}" is incomplete.` },
          { status: 400 }
        );
      }
      // A colour with no photo renders as a broken image on the live site —
      // reject at save time rather than let that reach a shopper.
      if (!Array.isArray(v.images) || v.images.length === 0) {
        return NextResponse.json(
          { error: `"${v.colour}" on "${p.name}" has no photo yet. Add at least one before saving.` },
          { status: 400 }
        );
      }
      if (v.price != null && (typeof v.price !== "number" || v.price < 0)) {
        return NextResponse.json(
          { error: `Colour "${v.colour}" on "${p.name}" has an invalid price override.` },
          { status: 400 }
        );
      }
    }
  }

  try {
    await saveCatalog(products);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to save products." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getCatalog, saveCatalog, catalogVersion } from "@/lib/catalog-store";
import { Product, productTypes } from "@/lib/catalog";

export const dynamic = "force-dynamic";

// Protected by middleware.ts (requires a valid admin session cookie).

export async function GET() {
  const products = await getCatalog();
  return NextResponse.json({ products, version: catalogVersion(products) });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const products = body?.products as Product[] | undefined;
  const baseVersion = body?.baseVersion as string | undefined;

  if (!Array.isArray(products)) {
    return NextResponse.json({ error: "Expected { products: Product[] }." }, { status: 400 });
  }
  if (typeof baseVersion !== "string") {
    return NextResponse.json(
      { error: "Expected baseVersion -- the catalogue version this page loaded." },
      { status: 400 }
    );
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
    // type is optional (null = not yet categorised) but if set must be a
    // real value — otherwise a typo silently drops a product out of every
    // type filter with no error to explain why.
    if (p.type != null && !(productTypes as readonly string[]).includes(p.type)) {
      return NextResponse.json(
        { error: `Product "${p.name}" has an unrecognised type "${p.type}".` },
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

  // This is a whole-catalogue write. Refuse it if the catalogue is not the
  // one the page loaded -- see catalogVersion for the deletion this stops.
  const current = catalogVersion(await getCatalog());
  if (current !== baseVersion) {
    return NextResponse.json(
      {
        error:
          "The catalogue has changed since this page loaded -- saving now would "
          + "overwrite those changes. Reload the catalogue, then make your edits again.",
        version: current,
      },
      { status: 409 }
    );
  }

  try {
    await saveCatalog(products);
    const after = await getCatalog();
    return NextResponse.json({ ok: true, version: catalogVersion(after) });
  } catch (err: any) {
    // A 500 with no server-side trace is undiagnosable afterwards; one such
    // save failed on 2026-09-12 and left nothing to read.
    console.error("[admin/products] save failed:", err);
    return NextResponse.json({ error: err.message || "Failed to save products." }, { status: 500 });
  }
}

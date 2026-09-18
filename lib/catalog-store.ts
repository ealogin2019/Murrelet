// Catalog persistence against Postgres (Neon).
//
// This is the seam lib/blob-store.ts used to hold. Reads return active
// products only; writes must only ever run in a server route.
//
// The DB is snake_case and the app is camelCase — that translation lives here
// and nowhere else.

import { createHash } from "crypto";
import { Product, Variant, Sku, Category, ProductType, seedCatalog } from "./catalog";
import { db, dbConfigured } from "./db";

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  category: Category;
  type: ProductType | null;
  description: string;
  details: string[];
  badges: string[];
  price: number;
  position: number;
  variants: VariantRow[];
};

type VariantRow = {
  id: string;
  colour: string;
  swatch: string;
  price: number | null;
  images: string[];
  position: number;
  skus: SkuRow[];
};

type SkuRow = {
  id: string;
  size: string;
  in_stock: boolean;
  stock: number | null;
  position: number;
};

function toProduct(row: ProductRow): Product {
  // The query orders the nested arrays, but sort here too rather than trust
  // whatever order a future edit of it happens to return.
  const variants: Variant[] = [...(row.variants ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((v) => ({
      id: v.id,
      colour: v.colour,
      swatch: v.swatch,
      price: v.price,
      images: v.images ?? [],
      skus: [...(v.skus ?? [])]
        .sort((a, b) => a.position - b.position)
        .map<Sku>((s) => ({
          id: s.id,
          size: s.size,
          inStock: s.in_stock,
          stock: s.stock,
        })),
    }));

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    type: row.type,
    description: row.description ?? "",
    details: row.details ?? [],
    badges: row.badges ?? [],
    price: row.price,
    variants,
  };
}

/**
 * The catalog, for every reader in the app.
 *
 * With no DATABASE_URL (a fresh clone) this returns the seed so the
 * site still runs. With credentials it queries — and a query failure throws
 * rather than silently serving seed data, because a store quietly falling
 * back to fake products is worse than a store that errors.
 */
export async function getCatalog(): Promise<Product[]> {
  if (!dbConfigured()) {
    // A fresh clone gets the seed. A production build without DATABASE_URL
    // fails here on purpose: the alternative is a live store serving the
    // showcase placeholders as if they were the catalogue.
    if (process.env.NODE_ENV === "production") {
      throw new Error("DATABASE_URL is not set; refusing to serve the seed catalog in production.");
    }
    return seedCatalog;
  }
  try {
    return await getCatalogFromDb();
  } catch (error) {
    // Keep local design and preview work usable when the configured database
    // is unreachable or temporarily unavailable. Production
    // still throws so a live store never quietly serves stale seed products.
    if (process.env.NODE_ENV === "development") {
      console.warn("Catalog unavailable in development; using seed catalog.", error);
      return seedCatalog;
    }
    throw error;
  }
}

/**
 * A fingerprint of the catalogue as it stands, for the admin's save.
 *
 * saveCatalog is a WHOLE-catalogue write: what the client sends replaces what
 * is there, and anything absent is deleted. That is right for a client that
 * holds the current catalogue and wrong for one that does not -- an /admin
 * page loaded before a product was grafted in from the command line, then
 * saved, deleted that product without anyone asking it to. It happened on
 * 2026-09-12, twice within the hour, and only a failed request saved the
 * second one.
 *
 * So the page is told the version it loaded, sends it back, and the server
 * refuses the save if the catalogue has moved on. Hash of the full shape, not
 * a counter: any edit anywhere -- an image reordered from another tab, a
 * price changed in a script -- is a reason to reload before overwriting it.
 */
export function catalogVersion(products: Product[]): string {
  return createHash("sha256").update(JSON.stringify(products)).digest("hex").slice(0, 16);
}

export async function saveCatalog(products: Product[]): Promise<void> {
  return saveCatalogToDb(products);
}

export async function getCatalogFromDb(): Promise<Product[]> {
  // One round trip: the variants and skus come back nested as JSON.
  const rows = (await db()`
    select p.id, p.slug, p.name, p.category, p.type, p.description, p.details,
           p.badges, p.price, p.position,
           coalesce((
             select jsonb_agg(jsonb_build_object(
               'id', v.id, 'colour', v.colour, 'swatch', v.swatch, 'price', v.price,
               'images', v.images, 'position', v.position,
               'skus', coalesce((
                 select jsonb_agg(jsonb_build_object(
                   'id', s.id, 'size', s.size, 'in_stock', s.in_stock,
                   'stock', s.stock, 'position', s.position
                 ) order by s.position)
                 from skus s where s.variant_id = v.id
               ), '[]'::jsonb)
             ) order by v.position)
             from variants v where v.product_id = p.id
           ), '[]'::jsonb) as variants
    from products p
    where p.active
    order by p.position
  `) as ProductRow[];
  return rows.map(toProduct);
}

/**
 * Replaces the catalog wholesale, in one transaction.
 *
 * Products absent from `products` are deleted; variants and skus cascade from
 * that. Rows are upserted rather than dropped-and-recreated so that a sku id
 * referenced by an existing order_item survives an edit.
 */
export async function saveCatalogToDb(products: Product[]): Promise<void> {
  const sql = db();

  const keepProducts = products.map((p) => p.id);
  const keepVariants = products.flatMap((p) => p.variants.map((v) => v.id));
  const keepSkus = products.flatMap((p) =>
    p.variants.flatMap((v) => v.skus.map((s) => s.id))
  );

  // Rows travel as one JSON document per table and are unpacked by
  // jsonb_to_recordset, so each table is a single statement however many
  // rows it has.
  const productRows = JSON.stringify(
    products.map((p, i) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      category: p.category,
      type: p.type,
      description: p.description,
      details: p.details,
      badges: p.badges,
      price: p.price,
      position: i,
    }))
  );
  const variantRows = JSON.stringify(
    products.flatMap((p) =>
      p.variants.map((v, i) => ({
        id: v.id,
        product_id: p.id,
        colour: v.colour,
        swatch: v.swatch,
        price: v.price,
        images: v.images,
        position: i,
      }))
    )
  );
  const skuRows = JSON.stringify(
    products.flatMap((p) =>
      p.variants.flatMap((v) =>
        v.skus.map((s, i) => ({
          id: s.id,
          variant_id: v.id,
          size: s.size,
          in_stock: s.inStock,
          stock: s.stock,
          position: i,
        }))
      )
    )
  );

  try {
    await sql.transaction([
      // Upsert resolves conflicts on the primary key, but `slug` carries its
      // own unique constraint. If a product keeps its slug and changes its
      // id, the insert collides on slug instead of updating. Clear exactly
      // those rows first — same slug, different id — and nothing else.
      sql`delete from products
           where slug = any(${products.map((p) => p.slug)}::text[])
             and not (id = any(${keepProducts}::text[]))`,
      sql`insert into products
             (id, slug, name, category, type, description, details, badges, price, active, position)
           select id, slug, name, category, type, description, details, badges, price, true, position
             from jsonb_to_recordset(${productRows}::jsonb) as t(
               id text, slug text, name text, category product_category, type product_type,
               description text, details text[], badges text[], price int, position int)
           on conflict (id) do update set
             slug = excluded.slug, name = excluded.name, category = excluded.category,
             type = excluded.type, description = excluded.description,
             details = excluded.details, badges = excluded.badges, price = excluded.price,
             active = true, position = excluded.position`,
      sql`insert into variants (id, product_id, colour, swatch, price, images, position)
           select id, product_id, colour, swatch, price, images, position
             from jsonb_to_recordset(${variantRows}::jsonb) as t(
               id text, product_id text, colour text, swatch text, price int,
               images text[], position int)
           on conflict (id) do update set
             product_id = excluded.product_id, colour = excluded.colour,
             swatch = excluded.swatch, price = excluded.price, images = excluded.images,
             position = excluded.position`,
      sql`insert into skus (id, variant_id, size, in_stock, stock, position)
           select id, variant_id, size, in_stock, stock, position
             from jsonb_to_recordset(${skuRows}::jsonb) as t(
               id text, variant_id text, size text, in_stock boolean, stock int, position int)
           on conflict (id) do update set
             variant_id = excluded.variant_id, size = excluded.size,
             in_stock = excluded.in_stock, stock = excluded.stock,
             position = excluded.position`,
      // Delete removed rows last, deepest first. An empty keep-list means
      // "keep nothing" — delete everything. Skipping the delete when the
      // list is empty would silently turn "remove the last product" into a
      // no-op.
      sql`delete from skus where not (id = any(${keepSkus}::text[]))`,
      sql`delete from variants where not (id = any(${keepVariants}::text[]))`,
      sql`delete from products where not (id = any(${keepProducts}::text[]))`,
    ]);
  } catch (e) {
    throw new Error(`Failed to save catalog: ${(e as Error).message}`);
  }
}

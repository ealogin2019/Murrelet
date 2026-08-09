// Catalog persistence against Supabase.
//
// This is the seam lib/blob-store.ts used to hold. Reads go through the anon
// client and are gated by RLS (active products only); writes use the service
// role and must only ever run in a server route.
//
// The DB is snake_case and the app is camelCase — that translation lives here
// and nowhere else.

import { Product, Variant, Sku, Category, ProductType, seedCatalog } from "./catalog";
import { supabaseAdmin, supabasePublic, supabaseConfigured } from "./supabase";

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

const SELECT =
  "id,slug,name,category,type,description,details,badges,price,position," +
  "variants(id,colour,swatch,price,images,position," +
  "skus(id,size,in_stock,stock,position))";

function toProduct(row: ProductRow): Product {
  // PostgREST does not order embedded rows, so sort here rather than trusting
  // whatever order the join happens to return.
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
 * With no Supabase credentials (a fresh clone) this returns the seed so the
 * site still runs. With credentials it queries — and a query failure throws
 * rather than silently serving seed data, because a store quietly falling
 * back to fake products is worse than a store that errors.
 */
export async function getCatalog(): Promise<Product[]> {
  if (!supabaseConfigured()) return seedCatalog;
  return getCatalogFromDb();
}

export async function saveCatalog(products: Product[]): Promise<void> {
  return saveCatalogToDb(products);
}

export async function getCatalogFromDb(): Promise<Product[]> {
  const { data, error } = await supabasePublic()
    .from("products")
    .select(SELECT)
    .eq("active", true)
    .order("position");

  if (error) throw new Error(`Failed to load catalog: ${error.message}`);
  return ((data ?? []) as unknown as ProductRow[]).map(toProduct);
}

/**
 * Replaces the catalog wholesale.
 *
 * Products absent from `products` are deleted; variants and skus cascade from
 * that. Rows are upserted rather than dropped-and-recreated so that a sku id
 * referenced by an existing order_item survives an edit.
 */
export async function saveCatalogToDb(products: Product[]): Promise<void> {
  const db = supabaseAdmin();

  const keepProducts = products.map((p) => p.id);
  const keepVariants = products.flatMap((p) => p.variants.map((v) => v.id));
  const keepSkus = products.flatMap((p) =>
    p.variants.flatMap((v) => v.skus.map((s) => s.id))
  );

  // Upsert resolves conflicts on the primary key, but `slug` carries its own
  // unique constraint. If a product keeps its slug and changes its id, the
  // insert collides on slug instead of updating. Clear exactly those rows
  // first — same slug, different id — and nothing else.
  if (keepProducts.length) {
    const slugs = products.map((p) => `"${p.slug}"`).join(",");
    const ids = keepProducts.map((id) => `"${id}"`).join(",");
    const { error } = await db
      .from("products")
      .delete()
      .filter("slug", "in", `(${slugs})`)
      .filter("id", "not.in", `(${ids})`);
    if (error) throw new Error(`Failed to clear renamed products: ${error.message}`);
  }

  const { error: pErr } = await db.from("products").upsert(
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
      active: true,
      position: i,
    }))
  );
  if (pErr) throw new Error(`Failed to save products: ${pErr.message}`);

  const variantRows = products.flatMap((p) =>
    p.variants.map((v, i) => ({
      id: v.id,
      product_id: p.id,
      colour: v.colour,
      swatch: v.swatch,
      price: v.price,
      images: v.images,
      position: i,
    }))
  );
  if (variantRows.length) {
    const { error } = await db.from("variants").upsert(variantRows);
    if (error) throw new Error(`Failed to save colours: ${error.message}`);
  }

  const skuRows = products.flatMap((p) =>
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
  );
  if (skuRows.length) {
    const { error } = await db.from("skus").upsert(skuRows);
    if (error) throw new Error(`Failed to save sizes: ${error.message}`);
  }

  // Delete removed rows last, deepest first, so nothing is orphaned mid-write
  // if a later step fails.
  //
  // An empty keep-list means "keep nothing" — delete everything. Skipping the
  // delete when the list is empty would silently turn "remove the last
  // product" into a no-op.
  await deleteExcept(db, "skus", keepSkus);
  await deleteExcept(db, "variants", keepVariants);
  await deleteExcept(db, "products", keepProducts);
}

async function deleteExcept(
  db: ReturnType<typeof supabaseAdmin>,
  table: string,
  keep: string[]
) {
  const query = db.from(table).delete();
  const { error } = keep.length
    ? // Ids are slugs, so quoting each one keeps a value containing a comma
      // from being read as a list separator.
      await query.not("id", "in", `(${keep.map((id) => `"${id}"`).join(",")})`)
    : await query.neq("id", "");
  if (error) throw new Error(`Failed to prune ${table}: ${error.message}`);
}

// Builds the catalog from content/catalog.json + the photo folders, then
// writes it to Supabase.
//
//   npm run catalog:sync            check only, changes nothing
//   npm run catalog:sync -- --write push it to the database
//
// Photography is never listed in the JSON. Images are discovered at
//   public/images/catalog/<product slug>/<colour folder>/*.jpg
// sorted naturally, so 1.jpg, 2.jpg, 10.jpg order the way you'd expect.
//
// The point of this over the admin panel: adding six colours with three shots
// each is 18 uploads through a form, or one drag of a folder tree here.

import { config } from "dotenv";
import { readFileSync, readdirSync, existsSync, statSync } from "fs";
import { join } from "path";
import { Product, Variant, Sku, Category, categories } from "../lib/catalog";

config({ path: ".env.local" });

const CATALOG_JSON = "content/catalog.json";
const IMAGE_ROOT = join("public", "images", "catalog");
const IMAGE_EXT = /\.(jpe?g|png|webp|avif)$/i;

type ColourSpec = {
  folder: string;
  name: string;
  swatch?: string;
  price?: number | null;
};

type ProductSpec = {
  slug: string;
  name: string;
  category: Category;
  price: number;
  badges?: string[];
  description?: string;
  details?: string[];
  sizes: string[];
  colours: ColourSpec[];
};

const problems: string[] = [];
const notes: string[] = [];

/** 1.jpg, 2.jpg, 10.jpg — not 1, 10, 2. */
function naturalSort(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function imagesFor(slug: string, folder: string): string[] {
  const dir = join(IMAGE_ROOT, slug, folder);
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return [];
  return readdirSync(dir)
    .filter((f) => IMAGE_EXT.test(f))
    .sort(naturalSort)
    .map((f) => `/images/catalog/${slug}/${folder}/${f}`);
}

/**
 * Suggests a swatch colour from the first photo when the JSON omits one.
 *
 * Samples a band across the middle of the frame, drops near-white, near-black
 * and flat-grey pixels (backdrop, skin, shadow), and takes the median of what
 * is left. On flat product shots it lands close; on the full-body lifestyle
 * shots used here it is often well off, so the caller treats the result as a
 * suggestion to verify rather than a value to use.
 */
async function guessSwatch(imagePath: string): Promise<string | null> {
  try {
    const { default: sharp } = await import("sharp");
    const file = join("public", imagePath.replace(/^\//, ""));
    const meta = await sharp(file).metadata();
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;
    if (!w || !h) return null;

    const { data, info } = await sharp(file)
      .extract({
        left: Math.floor(w * 0.35),
        top: Math.floor(h * 0.3),
        width: Math.floor(w * 0.3),
        height: Math.floor(h * 0.25),
      })
      .resize(40, 40, { fit: "fill" })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const px: number[][] = [];
    for (let i = 0; i < data.length; i += info.channels) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const isNearWhite = min > 205;
      const isNearBlack = max < 25;
      const isFlatGrey = max - min < 12 && min > 90 && max < 205;
      if (!isNearWhite && !isNearBlack && !isFlatGrey) px.push([r, g, b]);
    }
    if (px.length < 40) return null;

    const median = (idx: number) => {
      const s = px.map((p) => p[idx]).sort((a, b) => a - b);
      return s[Math.floor(s.length / 2)];
    };
    const hex = (n: number) => n.toString(16).padStart(2, "0");
    return `#${hex(median(0))}${hex(median(1))}${hex(median(2))}`.toUpperCase();
  } catch {
    // sharp is optional; without it, swatches simply must be given by hand.
    return null;
  }
}

async function build(): Promise<Product[]> {
  const spec = JSON.parse(readFileSync(CATALOG_JSON, "utf8")) as {
    products: ProductSpec[];
  };

  const seenSlugs = new Set<string>();
  const products: Product[] = [];

  for (const p of spec.products) {
    if (seenSlugs.has(p.slug)) problems.push(`duplicate slug "${p.slug}"`);
    seenSlugs.add(p.slug);

    if (!categories.includes(p.category)) {
      problems.push(`"${p.slug}": category "${p.category}" is not one of ${categories.join(", ")}`);
    }
    if (!Number.isInteger(p.price) || p.price < 0) {
      problems.push(`"${p.slug}": price must be whole pence, got ${p.price}`);
    }
    if (!p.colours?.length) problems.push(`"${p.slug}": no colours`);
    if (!p.sizes?.length) problems.push(`"${p.slug}": no sizes`);

    const variants: Variant[] = [];
    for (const c of p.colours ?? []) {
      const images = imagesFor(p.slug, c.folder);
      if (!images.length) {
        problems.push(
          `"${p.slug}" / "${c.name}": no images in ${join(IMAGE_ROOT, p.slug, c.folder)}`
        );
        continue;
      }

      let swatch = c.swatch;
      if (!swatch) {
        // Sampling is only a starting point. On full-body lifestyle shots it
        // regularly lands on backdrop or shadow — "Light Blue" came back as
        // #757377 in testing. So a missing swatch BLOCKS the write and the
        // sample is offered as a suggestion to check, never used silently.
        const guessed = await guessSwatch(images[0]);
        swatch = guessed ?? "#CCCCCC";
        problems.push(
          guessed
            ? `"${p.slug}" / "${c.name}": no swatch set. Sampled ${guessed} from the photo — check it against the garment, then add "swatch": "${guessed}" to the JSON.`
            : `"${p.slug}" / "${c.name}": no swatch set, and none could be sampled. Add one to the JSON.`
        );
      }

      if (c.price != null && c.price >= p.price) {
        problems.push(
          `"${p.slug}" / "${c.name}": override ${c.price} is not below the list price ${p.price} — it would never show as a reduction`
        );
      }

      const variantId = `${p.slug}-${c.folder}`;
      const skus: Sku[] = p.sizes.map((size) => ({
        id: `${variantId}-${size.toLowerCase()}`,
        size,
        inStock: true,
        stock: null,
      }));

      variants.push({
        id: variantId,
        colour: c.name,
        swatch,
        price: c.price ?? null,
        images,
        skus,
      });
    }

    products.push({
      id: p.slug,
      slug: p.slug,
      name: p.name,
      category: p.category,
      // This JSON+filesystem path is retired in favour of authoring
      // everything through /admin. Not worth adding a "type" field to the
      // legacy JSON schema for a script that's no longer how products get
      // added — admin is where "type" actually gets set.
      type: null,
      description: p.description ?? "",
      details: p.details ?? [],
      badges: p.badges ?? [],
      price: p.price,
      variants,
    });
  }

  // Photo folders with no entry in the JSON are almost always a typo or a
  // colour someone forgot to declare, so they are worth surfacing.
  if (existsSync(IMAGE_ROOT)) {
    for (const slug of readdirSync(IMAGE_ROOT)) {
      const dir = join(IMAGE_ROOT, slug);
      if (!statSync(dir).isDirectory()) continue;
      const known = spec.products.find((p) => p.slug === slug);
      if (!known) {
        notes.push(`orphan folder: ${dir} has no product in ${CATALOG_JSON}`);
        continue;
      }
      for (const folder of readdirSync(dir)) {
        if (!statSync(join(dir, folder)).isDirectory()) continue;
        if (!known.colours.some((c) => c.folder === folder)) {
          notes.push(`orphan folder: ${join(dir, folder)} has no colour in ${CATALOG_JSON}`);
        }
      }
    }
  }

  return products;
}

async function main() {
  const write = process.argv.includes("--write");
  const products = await build();

  for (const n of notes) console.log(`  note:    ${n}`);
  for (const p of problems) console.log(`  PROBLEM: ${p}`);

  console.log("");
  for (const p of products) {
    const shots = p.variants.reduce((n, v) => n + v.images.length, 0);
    console.log(
      `  ${p.slug}  £${(p.price / 100).toFixed(2)}  ${p.variants.length} colours, ${shots} photos, ` +
        `${p.variants.reduce((n, v) => n + v.skus.length, 0)} SKUs`
    );
    for (const v of p.variants) {
      const price = v.price == null ? "list" : `£${(v.price / 100).toFixed(2)}`;
      console.log(`      ${v.colour.padEnd(16)} ${v.swatch}  ${price.padEnd(8)} ${v.images.length} photo(s)`);
    }
  }

  if (problems.length) {
    console.log(`\n${problems.length} problem(s). Nothing written.`);
    process.exit(1);
  }

  if (!write) {
    console.log("\nLooks good. Re-run with --write to push it to Supabase.");
    return;
  }

  const { saveCatalogToDb } = await import("../lib/catalog-store");
  await saveCatalogToDb(products);
  console.log("\nWritten to Supabase.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

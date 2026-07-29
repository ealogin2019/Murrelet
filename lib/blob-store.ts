// Persistence seam.
//
// Everything the app reads about the catalog goes through getCatalog(). Today
// that resolves to a JSON document in Vercel Blob (falling back to the seed);
// when Supabase credentials land, only the bodies of getCatalog/saveCatalog
// change — see supabase/migrations/0001_catalog.sql for the target schema.
// No caller outside this file knows where the data lives.

import { head, put } from "@vercel/blob";
import { Product, seedCatalog } from "./catalog";
import { HeroSlide, seedHeroSlides } from "./hero";

const CATALOG_PATH = "data/catalog.json";
/** Pre-variant catalog. Read-only, kept so the old data can be recovered. */
const LEGACY_PRODUCTS_PATH = "data/products.json";
const HERO_PATH = "data/hero.json";

function blobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

async function readJson<T>(pathname: string): Promise<T | null> {
  if (!blobConfigured()) return null;
  try {
    const meta = await head(pathname);
    const res = await fetch(meta.url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (err: any) {
    // BlobNotFoundError (or any lookup failure) just means nothing has been
    // saved yet — callers fall back to seed data.
    return null;
  }
}

async function writeJson(pathname: string, data: unknown) {
  if (!blobConfigured()) {
    throw new Error(
      "Blob storage isn't configured (missing BLOB_READ_WRITE_TOKEN). Add a Blob store to this project in the Vercel dashboard, then redeploy."
    );
  }
  await put(pathname, JSON.stringify(data, null, 2), {
    access: "public",
    contentType: "application/json",
    allowOverwrite: true,
  });
}

export async function getCatalog(): Promise<Product[]> {
  const stored = await readJson<Product[]>(CATALOG_PATH);
  // Guard against a half-written or pre-variant document: anything without a
  // variants array is not this model, so prefer the seed over rendering junk.
  if (Array.isArray(stored) && stored.every((p) => Array.isArray(p?.variants))) {
    return stored;
  }
  return seedCatalog;
}

export async function saveCatalog(products: Product[]): Promise<void> {
  await writeJson(CATALOG_PATH, products);
}

/**
 * The flat pre-variant catalog, if one was ever saved. Nothing renders from
 * this — it exists so the old Blob document (which holds uploaded product
 * photos) can be exported before the Supabase migration rather than silently
 * abandoned.
 */
export async function getLegacyProducts(): Promise<unknown[] | null> {
  return readJson<unknown[]>(LEGACY_PRODUCTS_PATH);
}

export async function getHeroSlides(): Promise<HeroSlide[]> {
  const stored = await readJson<HeroSlide[]>(HERO_PATH);
  return stored ?? seedHeroSlides;
}

export async function saveHeroSlides(slides: HeroSlide[]): Promise<void> {
  await writeJson(HERO_PATH, slides);
}

export async function uploadImage(pathname: string, file: File): Promise<string> {
  if (!blobConfigured()) {
    throw new Error(
      "Blob storage isn't configured (missing BLOB_READ_WRITE_TOKEN). Add a Blob store to this project in the Vercel dashboard, then redeploy."
    );
  }
  const blob = await put(pathname, file, {
    access: "public",
    addRandomSuffix: true,
  });
  return blob.url;
}

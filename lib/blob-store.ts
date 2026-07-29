// Vercel Blob: hero slides and uploaded imagery.
//
// The catalog itself moved to Supabase — see lib/catalog-store.ts. Blob is
// kept for what it is genuinely good at (holding image files) plus the small
// hero document.

import { head, put } from "@vercel/blob";
import { HeroSlide, seedHeroSlides } from "./hero";

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

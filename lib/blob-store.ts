// Files on R2: hero slides and uploaded imagery.
//
// Was Vercel Blob until 2026-09-20; the name of this module is kept so the
// three routes that import it did not have to change. The catalog itself
// lives in Postgres — see lib/catalog-store.ts.

import { HeroSlide, seedHeroSlides } from "./hero";
import { getObject, publicUrl, putObject, r2Configured } from "./r2";

const HERO_KEY = "data/hero.json";

async function readJson<T>(key: string): Promise<T | null> {
  if (!r2Configured()) return null;
  try {
    const res = await getObject(key);
    return res ? ((await res.json()) as T) : null;
  } catch {
    // A lookup failure just means nothing has been saved yet — callers fall
    // back to seed data.
    return null;
  }
}

export async function getHeroSlides(): Promise<HeroSlide[]> {
  const stored = await readJson<HeroSlide[]>(HERO_KEY);
  return stored ?? seedHeroSlides;
}

export async function saveHeroSlides(slides: HeroSlide[]): Promise<void> {
  await putObject(HERO_KEY, JSON.stringify(slides, null, 2), "application/json");
}

/** Stores an uploaded image publicly and returns its URL. */
export async function uploadImage(pathname: string, file: File): Promise<string> {
  await putObject(pathname, file, file.type || "application/octet-stream");
  return publicUrl(pathname);
}

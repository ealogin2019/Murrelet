import { NextRequest, NextResponse } from "next/server";
import { getHeroSlides, saveHeroSlides } from "@/lib/blob-store";
import { HeroSlide } from "@/lib/hero";

export const dynamic = "force-dynamic";

// Protected by middleware.ts (requires a valid admin session cookie).

export async function GET() {
  const slides = await getHeroSlides();
  return NextResponse.json({ slides });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const slides = body?.slides as HeroSlide[] | undefined;

  if (!Array.isArray(slides)) {
    return NextResponse.json({ error: "Expected { slides: HeroSlide[] }." }, { status: 400 });
  }

  try {
    await saveHeroSlides(slides);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to save hero slides." }, { status: 500 });
  }
}

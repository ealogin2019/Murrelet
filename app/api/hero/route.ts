import { NextResponse } from "next/server";
import { getHeroSlides } from "@/lib/blob-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const slides = await getHeroSlides();
  return NextResponse.json({ slides });
}

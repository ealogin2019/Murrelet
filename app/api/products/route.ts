import { NextResponse } from "next/server";
import { getCatalog } from "@/lib/blob-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const products = await getCatalog();
  return NextResponse.json({ products });
}

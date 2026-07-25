import { NextResponse } from "next/server";
import { getProducts } from "@/lib/blob-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const products = await getProducts();
  return NextResponse.json({ products });
}

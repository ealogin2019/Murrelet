import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCatalog } from "@/lib/catalog-store";
import { findProduct, lowestOverride } from "@/lib/catalog";
import ProductDetail from "@/components/ProductDetail";

export const dynamic = "force-dynamic";

type Props = {
  params: { slug: string };
  searchParams: { colour?: string };
};

// Product pages are the pages that need to be findable, so the title and
// description come from real catalog data rather than the layout default.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = findProduct(await getCatalog(), params.slug);
  if (!product) return { title: "Product not found — Murrelet" };

  const from = lowestOverride(product);
  const price = ((from ?? product.price) / 100).toFixed(2);
  return {
    title: `${product.name} — Murrelet`,
    description: `${product.description} From £${price}.`,
  };
}

export default async function ProductPage({ params, searchParams }: Props) {
  const product = findProduct(await getCatalog(), params.slug);
  // A real 404 rather than a rendered "not found" panel, so a removed product
  // returns the right status code instead of a 200 with apology text.
  if (!product) notFound();

  return <ProductDetail product={product} initialColour={searchParams.colour} />;
}

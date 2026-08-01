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

// Product pages are the pages that need to be findable, so the title,
// description, and share image come from real catalog data rather than the
// layout default. The layout's title template appends "— Murrelet".
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const product = findProduct(await getCatalog(), params.slug);
  if (!product) return { title: "Product not found" };

  const from = lowestOverride(product);
  const price = ((from ?? product.price) / 100).toFixed(2);
  const description = `${product.description} From £${price}.`;

  // The colour in the URL if one is set, otherwise the first — so sharing a
  // link to a specific colour shows that colour's photo, not always the
  // default.
  const variant =
    product.variants.find((v) => v.id === searchParams.colour) ?? product.variants[0];
  const image = variant?.images[0];

  return {
    title: product.name,
    description,
    openGraph: {
      title: product.name,
      description,
      images: image ? [{ url: image, width: 1200, height: 1500 }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function ProductPage({ params, searchParams }: Props) {
  const product = findProduct(await getCatalog(), params.slug);
  // A real 404 rather than a rendered "not found" panel, so a removed product
  // returns the right status code instead of a 200 with apology text.
  if (!product) notFound();

  return <ProductDetail product={product} initialColour={searchParams.colour} />;
}

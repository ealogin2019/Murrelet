import type { Metadata } from "next";
import { getCatalog } from "@/lib/catalog-store";
import ProductListing from "@/components/ProductListing";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shop all",
  description: "Every style at Murrelet.",
};

export default async function ShopPage() {
  const products = await getCatalog();
  return <ProductListing title="Shop all" products={products} />;
}

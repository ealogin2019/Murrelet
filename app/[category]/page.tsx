import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCatalog } from "@/lib/catalog-store";
import { categories, categoryLabels, Category } from "@/lib/catalog";
import ProductListing from "@/components/ProductListing";

export const dynamic = "force-dynamic";

type Props = { params: { category: string } };

function asCategory(value: string): Category | null {
  return (categories as readonly string[]).includes(value) ? (value as Category) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = asCategory(params.category);
  if (!category) return {};
  const label = categoryLabels[category];
  return {
    title: label,
    description: `Shop ${label.toLowerCase()} at Murrelet.`,
  };
}

export default async function CategoryPage({ params }: Props) {
  const category = asCategory(params.category);
  // Any single-segment path that isn't a real category (or a stray typo)
  // falls through to this route — literal top-level routes like /cart or
  // /admin always win over it, so this only ever catches the unmatched rest.
  if (!category) notFound();

  const catalog = await getCatalog();
  const products = catalog.filter((p) => p.category === category);

  return <ProductListing title={categoryLabels[category]} products={products} />;
}

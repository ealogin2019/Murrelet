import { getCatalog } from "@/lib/catalog-store";
import ShopGrid from "@/components/ShopGrid";
import HeroShowcase from "@/components/HeroShowcase";

// Prices and stock are read on every request. Rendering the catalog on the
// server means the first paint is real data — and it is what Google indexes.
export const dynamic = "force-dynamic";

export default async function Home() {
  const products = await getCatalog();

  return (
    <main>
      <HeroShowcase />
      <ShopGrid products={products} />
    </main>
  );
}

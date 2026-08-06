import { getCatalog } from "@/lib/catalog-store";
import HeroShowcase from "@/components/HeroShowcase";
import CategoryChapters from "@/components/CategoryChapters";
import NewArrivals from "@/components/NewArrivals";
import CloseBand from "@/components/CloseBand";

// Prices and stock are read on every request. Rendering the catalog on the
// server means the first paint is real data — and it is what Google indexes.
export const dynamic = "force-dynamic";

export default async function Home() {
  const catalog = await getCatalog();

  return (
    <main>
      <HeroShowcase />
      <CategoryChapters catalog={catalog} />
      <NewArrivals products={catalog} />
      <CloseBand />
    </main>
  );
}

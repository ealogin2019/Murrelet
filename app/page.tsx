import { getCatalog } from "@/lib/catalog-store";
import HeroSelector from "@/components/HeroSelector";
import CategoryChapters from "@/components/CategoryChapters";
import TrustStrip from "@/components/TrustStrip";
import NewArrivals from "@/components/NewArrivals";
import CloseBand from "@/components/CloseBand";

// Prices and stock are read on every request. Rendering the catalog on the
// server means the first paint is real data — and it is what Google indexes.
export const dynamic = "force-dynamic";

// Shown behind the hero's type selector until a type has real photography of
// its own — see PLACEHOLDER_TINTS in HeroSelector for the rest of that story.
//
// hero-main.jpg is the owner-provided campaign poster (Web.Images/hero.png,
// re-encoded to JPEG). It carries its own baked-in wordmark and headline, so
// the hero renders no text overlays on top of it — see HeroSelector.
const HERO_FALLBACK_IMAGE = "/images/hero-main.jpg";

export default async function Home() {
  const catalog = await getCatalog();

  return (
    <main className="card-stack">
      <HeroSelector catalog={catalog} fallbackImage={HERO_FALLBACK_IMAGE} />
      <CategoryChapters catalog={catalog} />
      <TrustStrip />
      <NewArrivals products={catalog} />
      <CloseBand />
    </main>
  );
}

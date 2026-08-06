import Link from "next/link";
import { Product, categories, categoryLabels } from "@/lib/catalog";

function Arrow() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 10h12M11 5l5 5-5 5" />
    </svg>
  );
}

/**
 * Three photographic entry points, replacing the old ALL/MEN/WOMEN/KIDS
 * filter pills — those read as app-UI controls, not a fashion edit. A
 * category with no active product yet renders honestly as "coming soon"
 * rather than borrowing another category's photo to fill the tile.
 */
export default function CategoryChapters({ catalog }: { catalog: Product[] }) {
  return (
    <section className="chapters">
      {categories.map((c) => {
        const match = catalog.find((p) => p.category === c && p.variants[0]?.images[0]);
        const image = match?.variants[0]?.images[0];

        return (
          <Link key={c} href={`/${c}`} className={`chapter ${image ? "" : "is-placeholder"}`}>
            {image ? (
              <>
                <img src={image} alt="" loading="lazy" />
                <div className="chapter-scrim" />
                <div className="chapter-label">
                  <h2>{categoryLabels[c]}</h2>
                  <Arrow />
                </div>
              </>
            ) : (
              <div className="chapter-label">
                <div>
                  <h2>{categoryLabels[c]}</h2>
                  <span className="chapter-soon">New season &mdash; coming soon</span>
                </div>
                <Arrow />
              </div>
            )}
          </Link>
        );
      })}
    </section>
  );
}

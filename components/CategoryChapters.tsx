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
 * Photographic entry points, replacing the old ALL/MEN/WOMEN/KIDS filter
 * pills — those read as app-UI controls, not a fashion edit. Categories
 * without a photographed product yet don't each get their own full-height
 * empty tile (three tiles, two of them near-blank grey boxes, reads as
 * broken rather than early) — they're pooled into one "coming soon" tile
 * sized to match, so the grid stays visually balanced at any catalog size.
 */
export default function CategoryChapters({ catalog }: { catalog: Product[] }) {
  const shot = categories
    .map((c) => ({
      category: c,
      image: catalog.find((p) => p.category === c && p.variants[0]?.images[0])?.variants[0]
        ?.images[0],
    }))
    .filter((c): c is { category: (typeof categories)[number]; image: string } => !!c.image);

  const unshot = categories.filter((c) => !shot.some((s) => s.category === c));

  return (
    <section className="chapters" style={{ ["--chapter-count" as string]: shot.length + (unshot.length ? 1 : 0) }}>
      {shot.map(({ category: c, image }) => (
        <Link key={c} href={`/${c}`} className="chapter">
          <img src={image} alt="" loading="lazy" />
          <div className="chapter-scrim" />
          <div className="chapter-label">
            <h2>{categoryLabels[c]}</h2>
            <Arrow />
          </div>
        </Link>
      ))}

      {unshot.length > 0 && (
        <div className="chapter chapter-soon-tile">
          <p className="eyebrow">New season</p>
          <h2>Coming soon</h2>
          <ul>
            {unshot.map((c) => (
              <li key={c}>
                <Link href={`/${c}`}>
                  {categoryLabels[c]}
                  <Arrow />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

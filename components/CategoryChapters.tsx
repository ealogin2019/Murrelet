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
 * A slim editorial band, not a full-height gender splitter — that layout is
 * earned the day a second category has photography, and pre-announcing it
 * spent two screens of mobile scroll on things the store can't sell yet.
 *
 * Categories WITH photography get a short full-bleed photo strip each;
 * categories without become quiet one-line "coming soon" rows underneath.
 * They deliberately don't link anywhere: an announcement that opens an
 * empty listing ("Nothing matches those filters yet") reads as broken, and
 * a row that promises nothing but a season can't disappoint.
 *
 * The strip crops its photo to a wide band (not the same full frame the
 * product card below shows) so the one photographed product doesn't appear
 * twice identically within a single scroll.
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
    <section className="chapter-band">
      {shot.map(({ category: c, image }) => (
        <Link key={c} href={`/${c}`} className="chapter-strip" data-reveal>
          <img src={image} alt="" loading="lazy" />
          <div className="chapter-strip-scrim" />
          <div className="chapter-strip-label">
            <div>
              <p className="eyebrow">Shop now</p>
              <h2>{categoryLabels[c]}</h2>
            </div>
            <span className="chapter-strip-go">
              <Arrow />
            </span>
          </div>
        </Link>
      ))}

      {unshot.length > 0 && (
        <div className="wrap chapter-coming" data-reveal>
          {unshot.map((c) => (
            <div key={c} className="chapter-coming-row">
              <span className="chapter-coming-name">{categoryLabels[c]}</span>
              <span className="eyebrow">S/S 27 — Coming soon</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

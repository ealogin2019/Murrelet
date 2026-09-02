"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Product, productTypes, productTypeLabels, ProductType } from "@/lib/catalog";
import VariantImage from "@/components/VariantImage";

// Placeholder stand-ins for real per-type photography that doesn't exist
// yet. A type with a real, photographed product overrides this entirely —
// see imageForType below — so this list only matters for whichever types
// haven't been shot. Delete an entry here the day its type gets a real
// photo; nothing else needs to change.
const PLACEHOLDER_TINTS: Partial<Record<ProductType, string>> = {
  hoodies: "rgba(14,32,66,0.55)",
  sweatshirts: "rgba(196,150,32,0.48)",
  socks: "rgba(110,112,122,0.4)",
  "trunks-boxers": "rgba(26,26,26,0.55)",
  jeans: "rgba(42,62,112,0.5)",
  "puffer-jackets": "rgba(18,42,32,0.55)",
};

function Icon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

/**
 * Header.tsx renders on top of this as a fixed, transparent bar (see its
 * is-transparent/site-header-home classes) and turns solid the moment this
 * section scrolls out of view — so this component owns the photo and copy
 * only, not any header chrome of its own.
 *
 * Selecting a type is direct, not a two-step preview-then-confirm: click or
 * tap goes straight to /shop?type=x, matching how a nav menu is expected to
 * behave. Desktop hover previews the photo first since desktop has hover to
 * spare; touch has none, so tapping there just navigates — no special-casing
 * needed, that falls out naturally from hover events never firing on touch.
 */
export default function HeroSelector({
  catalog,
  fallbackImage,
}: {
  catalog: Product[];
  fallbackImage: string;
}) {
  const [hovered, setHovered] = useState<ProductType | null>(null);

  // Real photography wins over a placeholder tint the moment it exists.
  const imageForType = useMemo(() => {
    const map = {} as Record<ProductType, string | null>;
    for (const t of productTypes) {
      const match = catalog.find((p) => p.type === t && p.variants[0]?.images[0]);
      map[t] = match?.variants[0]?.images[0] ?? null;
    }
    return map;
  }, [catalog]);

  const realPhoto = hovered ? imageForType[hovered] : null;
  const photoSrc = realPhoto ?? fallbackImage;
  const tint = hovered && !realPhoto ? PLACEHOLDER_TINTS[hovered] ?? "transparent" : "transparent";

  return (
    <section className="hero-select" id="hero-selector">
      <div className="hero-select-main">
        {/* No text overlays here — the campaign poster (hero-main.jpg)
            carries its own baked-in wordmark and headline, and doubling
            them with live text read as a collage. */}
        <div className="hero-select-photo" id="hero-photo">
          <VariantImage src={photoSrc} alt="" eager />
          <div className="tint" style={{ backgroundColor: tint }} />
        </div>

        <div className="hero-select-text">
          <div className="hero-select-copy">
            <p className="hero-select-kicker">The new warm-weather edit</p>
            <h1>Made for <em>long</em> days.</h1>
            <p className="hero-select-intro">
              Considered essentials in breathable fabrics, easy colours and fits that move with you.
            </p>
            <Link href="/shop" className="hero-select-cta">
              Shop the collection
              <Icon path="M4 10h12M11 5l5 5-5 5" />
            </Link>
          </div>

          {/* Browse the edit — a swipeable index of numbered category cards
              rather than a stacked text list. Each card carries its serial
              number and a colour tick (the type's placeholder tint, or navy
              once real photography exists). Desktop hover still previews the
              type's photo in the hero frame; on touch the row simply swipes
              and taps through. */}
          <div className="hero-select-categories">
            <div className="hero-select-categories-head">
              <span>Browse the edit</span>
              <span>
                {String(productTypes.length).padStart(2, "0")} categories
              </span>
            </div>
            <ul className="cat-index">
              {productTypes.map((t, i) => (
                <li key={t}>
                  <Link
                    href={`/shop?type=${t}`}
                    className={hovered === t ? "is-active" : ""}
                    onMouseEnter={() => setHovered(t)}
                    onMouseLeave={() => setHovered((h) => (h === t ? null : h))}
                    onFocus={() => setHovered(t)}
                    onBlur={() => setHovered((h) => (h === t ? null : h))}
                  >
                    <span className="cat-index-no">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      className="cat-index-tick"
                      style={{
                        backgroundColor: imageForType[t]
                          ? "var(--navy)"
                          : PLACEHOLDER_TINTS[t] ?? "var(--line)",
                      }}
                    />
                    <span className="cat-index-name">{productTypeLabels[t]}</span>
                    <span className="cat-index-go">
                      Shop
                      <Icon path="M4 10h12M11 5l5 5-5 5" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

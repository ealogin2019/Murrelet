"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Product, productTypes, productTypeLabels, ProductType } from "@/lib/catalog";
import VariantImage from "@/components/VariantImage";
import HeroPosterText, { Feature } from "@/components/HeroPosterText";

/**
 * The campaign posters, in rotation.
 *
 * Each carries its own copy because the copy IS the poster's — it is only
 * rendered live so it can animate and be read by anything other than a human
 * eye. When the clean plates land, these strings stay exactly as they are and
 * the painted words underneath them go.
 */
type Poster = {
  image: string;
  headline: string[];
  subline: string[];
  features: Feature[];
};

const POSTERS: Poster[] = [
  {
    image: "/images/hero-tee.webp",
    headline: ["Simplicity", "That Speaks", "Volumes."],
    subline: ["Timeless style.", "Everyday comfort."],
    features: [
      { icon: "cotton", lines: ["Premium", "cotton"] },
      { icon: "leaf", lines: ["Soft &", "breathable"] },
      { icon: "tee", lines: ["Built for", "everyday"] },
    ],
  },
  {
    image: "/images/hero-hoodie.webp",
    headline: ["Effortless", "Comfort.", "Everyday You."],
    subline: ["Timeless style.", "Made for real life."],
    features: [
      { icon: "cotton", lines: ["Premium", "cotton"] },
      { icon: "leaf", lines: ["Soft &", "breathable"] },
      { icon: "hoodie", lines: ["Modern fit,", "natural feel"] },
    ],
  },
];

/** Long enough to read the headline's ~1.4s entrance and then sit with it. */
const POSTER_MS = 7000;

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

  // Which poster is showing. It holds while a category is being previewed —
  // advancing under a photo the visitor deliberately called up would take it
  // away mid-look — and stops entirely for anyone who has asked for less
  // motion.
  const [slide, setSlide] = useState(0);
  // The copy clears before the photograph dissolves.
  //
  // Both at once looked wrong: the headline is keyed on the slide, so React
  // unmounts it the instant the index changes and the words simply blink out
  // while the image behind them is still a second from resolving. Fading the
  // copy first, then swapping, makes the two read as one movement instead of
  // a cut inside a dissolve.
  const [leaving, setLeaving] = useState(false);
  const COPY_OUT_MS = 420;

  // One place decides what shows next, and one timer is ever in flight.
  //
  // Two used to race. A tap ran its own 420ms hand-off while the 7s rotation
  // ran another, and when they overlapped the tap set the slide and the
  // rotation's functional update immediately advanced past it — measured, a
  // tap to the second poster landed on it and was back on the first 400ms
  // later. Cancelling the pending hand-off before starting another makes the
  // last instruction win, whichever it came from.
  const pending = useRef<number | null>(null);

  function show(next: (i: number) => number) {
    if (pending.current !== null) window.clearTimeout(pending.current);
    setLeaving(true);
    pending.current = window.setTimeout(() => {
      setSlide((i) => next(i));
      setLeaving(false);
      pending.current = null;
    }, COPY_OUT_MS);
  }

  function goTo(next: number) {
    if (next === slide) return;
    show(() => next);
  }

  useEffect(() => {
    if (hovered) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => show((i) => (i + 1) % POSTERS.length), POSTER_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hovered]);

  useEffect(
    () => () => {
      if (pending.current !== null) window.clearTimeout(pending.current);
    },
    []
  );

  const poster = POSTERS[slide];
  const realPhoto = hovered ? imageForType[hovered] : null;
  const photoSrc = realPhoto ?? poster.image ?? fallbackImage;
  const tint = hovered && !realPhoto ? PLACEHOLDER_TINTS[hovered] ?? "transparent" : "transparent";

  return (
    <section className="hero-select" id="hero-selector">
      <div className="hero-select-main">
        {/* No text overlays here — the campaign poster (hero-main.jpg)
            carries its own baked-in wordmark and headline, and doubling
            them with live text read as a collage. */}
        <div className="hero-select-photo" id="hero-photo">
          {/* The poster is 2:3 and this slot is nearer 5:6, so it always
              crops. Where from is set by object-position in globals.css,
              measured against the artwork's own text rows rather than by eye:
              BUILT FOR EVERYDAY ends at row 1270 of 1536, and the crop is
              placed to keep it — and the model's hair — in frame. */}
          <VariantImage src={photoSrc} alt="" eager />
          {/* Showcase only, while the posters still carry their type: this
              lands on top of the painted words so the placement and the
              timing can be judged. It becomes the real copy the moment clean
              plates arrive. */}
          {/* Keyed on the slide so React remounts it: a CSS animation does
              not restart when its element merely re-renders, so without this
              the second poster's copy would appear already finished. Hidden
              while a category preview is up, where the poster's words do not
              belong to the photo on screen. */}
          {!realPhoto && (
            <HeroPosterText
              key={slide}
              leaving={leaving}
              headline={poster.headline}
              subline={poster.subline}
              features={poster.features}
            />
          )}
          <div className="tint" style={{ backgroundColor: tint }} />

          {POSTERS.length > 1 && (
            <div className="hero-select-dots">
              {POSTERS.map((p, i) => (
                <button
                  key={p.image}
                  type="button"
                  className={i === slide ? "is-on" : ""}
                  aria-label={`Show poster ${i + 1}`}
                  aria-current={i === slide}
                  onClick={() => goTo(i)}
                />
              ))}
            </div>
          )}
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

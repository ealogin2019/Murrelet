"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Product, Variant, lowestOverride, categoryLabels, cardSrc } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import VariantImage from "@/components/VariantImage";

export default function ProductCard({
  product,
  variant,
  featured = false,
}: {
  product: Product;
  /**
   * Pin the card to one colourway.
   *
   * The listing shows one card per COLOUR, not one per product: three print
   * treatments of one tee is three cards, which reads as an empty shop, while
   * the same range as colourways is twenty-seven. The product page stays
   * canonical — every card links to it with ?colour= — so nothing is
   * duplicated and a customer can still compare every colour in one place.
   */
  variant?: Variant;
  /** The homepage's 2x2 "piece of the edit" treatment. Only meaningful
   * inside .pgrid — see NewArrivals for why it's only ever true there. */
  featured?: boolean;
}) {
  const pinned = variant !== undefined;
  const [stepped, setStepped] = useState<Variant>(variant ?? product.variants[0]);
  const active = variant ?? stepped;
  const from = lowestOverride(product);

  // Preload the colours arrow-stepping can reach, so the first step does not
  // flash an empty frame. A pinned card cannot step, and preloading there
  // would be the whole catalogue at once: one card per colourway means the
  // listing already holds every image it needs, and fetching each card's
  // other eight would be 243 requests on one screen.
  useEffect(() => {
    if (pinned) return;
    product.variants.forEach((v) => {
      const src = v.images[0];
      if (src) {
        const img = new window.Image();
        img.src = cardSrc(src);
      }
    });
  }, [pinned, product.variants]);

  const href = `/product/${product.slug}?colour=${active.id}`;

  function step(delta: number) {
    const i = product.variants.indexOf(active);
    const next = (i + delta + product.variants.length) % product.variants.length;
    setStepped(product.variants[next]);
  }

  const canStep = !pinned && product.variants.length > 1;

  return (
    <div className={`card ${featured ? "card-featured" : ""}`} data-reveal>
      <Link href={href} className="card-image" aria-label={product.name}>
        <VariantImage
          src={cardSrc(active.images[0])}
          alt={`${product.name} — ${active.colour}`}
          colourLabel={active.colour}
          onNext={canStep ? () => step(1) : undefined}
          onPrev={canStep ? () => step(-1) : undefined}
        />
        {product.badges[0] && <span className="card-badge">{product.badges[0]}</span>}
      </Link>

      {/* No swatch rail on cards — with a catalog this size, a row of dots
          under every card read as clutter, not choice. Colour browsing lives
          on the image itself (arrow-step / swipe via VariantImage) and on the
          product page; the "n colours" line below still signals the range. */}
      <Link href={href} className="card-text">
        <p className="card-category">{categoryLabels[product.category]}</p>
        <p className="card-name">{product.name}</p>
        {featured && product.description && (
          <p className="card-desc">{product.description}</p>
        )}
        <p className="card-price">
          {formatPrice(product.price)}
          {from !== null && (
            <span className="card-price-from">
              Selected colours from {formatPrice(from)}
            </span>
          )}
        </p>
        {pinned ? (
          <p className="card-colours">{active.colour}</p>
        ) : (
          product.variants.length > 1 && (
            <p className="card-colours">{product.variants.length} colours available</p>
          )
        )}
      </Link>
    </div>
  );
}

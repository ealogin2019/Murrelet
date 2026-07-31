"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Product, Variant, lowestOverride, categoryLabels } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import VariantImage from "@/components/VariantImage";

/** How many swatches fit in the rail before it collapses to a "+n" counter. */
const VISIBLE_SWATCHES = 5;

export default function ProductCard({ product }: { product: Product }) {
  const [active, setActive] = useState<Variant>(product.variants[0]);
  const from = lowestOverride(product);

  // The rail is a window over the colours, not the first five: selecting a
  // colour outside it slides the window so the selection stays visible, which
  // is why the "+n" counter moves as you browse.
  const windowStart = useMemo(() => {
    const i = product.variants.indexOf(active);
    if (i < VISIBLE_SWATCHES) return 0;
    return Math.min(
      i - VISIBLE_SWATCHES + 1,
      Math.max(0, product.variants.length - VISIBLE_SWATCHES)
    );
  }, [active, product.variants]);

  const shown = product.variants.slice(windowStart, windowStart + VISIBLE_SWATCHES);
  const overflow = product.variants.length - shown.length;

  // Preload every colour up front, or the first hover of each swatch flashes
  // an empty frame while the browser fetches.
  useEffect(() => {
    product.variants.forEach((v) => {
      const src = v.images[0];
      if (src) {
        const img = new window.Image();
        img.src = src;
      }
    });
  }, [product.variants]);

  const href = `/product/${product.slug}?colour=${active.id}`;

  function step(delta: number) {
    const i = product.variants.indexOf(active);
    const next = (i + delta + product.variants.length) % product.variants.length;
    setActive(product.variants[next]);
  }

  return (
    <div className="card">
      <Link href={href} className="card-image" aria-label={product.name}>
        <VariantImage
          src={active.images[0]}
          alt={`${product.name} — ${active.colour}`}
          colourLabel={active.colour}
          onNext={product.variants.length > 1 ? () => step(1) : undefined}
          onPrev={product.variants.length > 1 ? () => step(-1) : undefined}
        />
        {product.badges[0] && <span className="card-badge">{product.badges[0]}</span>}
      </Link>

      {/* Overlaid on the image above md, stacked under the text below it —
          touch devices have no hover with which to reveal the rail. */}
      <div className="swatch-rail">
        {shown.map((v) => (
          <button
            key={v.id}
            type="button"
            className={`swatch ${v.id === active.id ? "is-active" : ""}`}
            style={{ background: v.swatch }}
            aria-label={v.colour}
            aria-pressed={v.id === active.id}
            onMouseEnter={() => setActive(v)}
            onFocus={() => setActive(v)}
            onClick={() => setActive(v)}
          />
        ))}
        {overflow > 0 && <span className="swatch-more">+{overflow}</span>}
      </div>

      <Link href={href} className="card-text">
        <p className="card-category">{categoryLabels[product.category]}</p>
        <p className="card-name">{product.name}</p>
        <p className="card-price">
          {formatPrice(product.price)}
          {from !== null && (
            <span className="card-price-from">
              Selected colours from {formatPrice(from)}
            </span>
          )}
        </p>
        {product.variants.length > 1 && (
          <p className="card-colours">{product.variants.length} colours available</p>
        )}
      </Link>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Product,
  Sku,
  categoryLabels,
  findVariant,
  lowestOverride,
  variantPrice,
} from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/lib/cart-context";
import VariantImage from "@/components/VariantImage";

export default function ProductDetail({
  product,
  initialColour,
}: {
  product: Product;
  initialColour?: string;
}) {
  const { addItem } = useCart();
  const [variantId, setVariantId] = useState<string | null>(initialColour ?? null);
  const [sizeId, setSizeId] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const variant = findVariant(product, variantId);

  // Size selection belongs to a colour: switching colour must clear it, or a
  // stale size id from the previous variant gets added to the bag.
  useEffect(() => {
    setSizeId(null);
  }, [variant.id]);

  // The gallery is a swipeable track on a phone. Switching colour has to send
  // it back to the first shot: the new colour has its own images, and leaving
  // the track parked on frame three shows a different garment than the one
  // the swatch just selected — or nothing at all when the new colour has
  // fewer shots.
  const track = useRef<HTMLDivElement>(null);
  const [shot, setShot] = useState(0);
  useEffect(() => {
    setShot(0);
    const el = track.current;
    if (el) el.scrollTo({ left: 0, behavior: "auto" });
  }, [variant.id]);

  function onTrackScroll() {
    const el = track.current;
    if (!el || el.clientWidth === 0) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    setShot(Math.min(Math.max(i, 0), variant.images.length - 1));
  }

  const price = useMemo(() => variantPrice(product, variant), [product, variant]);
  const sku: Sku | undefined = variant.skus.find((s) => s.id === sizeId);
  const from = lowestOverride(product);

  function stepColour(delta: number) {
    const i = product.variants.indexOf(variant);
    const next = (i + delta + product.variants.length) % product.variants.length;
    setVariantId(product.variants[next].id);
  }

  function handleAddToBag() {
    if (!sku) return;
    addItem(
      {
        skuId: sku.id,
        slug: product.slug,
        name: product.name,
        colour: variant.colour,
        size: sku.size,
        price,
        image: variant.images[0] ?? "",
      },
      1
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  return (
    <div className="wrap">
      <nav className="breadcrumb eyebrow">
        <Link href="/">Shop</Link>
        <span>/</span>
        <Link href={`/?category=${product.category}`}>
          {categoryLabels[product.category]}
        </Link>
      </nav>

      <div className="product-detail">
        {/* One element, two behaviours, decided in CSS rather than by
            rendering the gallery twice.

            On a desktop the shots stack and the buying column beside them is
            sticky, so scrolling through the photography never takes the size
            picker off screen.

            On a phone that stack put the add-to-bag button four full-height
            images down the page. Here the same children become a horizontal
            scroll-snap track, so the whole gallery is one screen and the
            controls sit directly under it. */}
        <div className="product-gallery-wrap">
          <div
            className="product-gallery"
            ref={track}
            onScroll={onTrackScroll}
          >
            <div className="product-image">
              <VariantImage
                src={variant.images[0]}
                alt={`${product.name} — ${variant.colour}`}
                colourLabel={variant.colour}
                showLabel
                eager
                onNext={product.variants.length > 1 ? () => stepColour(1) : undefined}
                onPrev={product.variants.length > 1 ? () => stepColour(-1) : undefined}
              />
            </div>
            {variant.images.slice(1).map((src) => (
              <div className="product-image" key={src}>
                <img src={src} alt={`${product.name} — ${variant.colour}`} loading="lazy" />
              </div>
            ))}
          </div>
          {variant.images.length > 1 && (
            <div className="gallery-dots" aria-hidden="true">
              {variant.images.map((src, i) => (
                <span key={src} className={i === shot ? "is-on" : ""} />
              ))}
            </div>
          )}
        </div>

        <div className="product-info">
          <h1>{product.name}</h1>

          {/* Shows the price of the SELECTED colour, which is what
              add-to-bag charges. Displaying the product list price here
              while charging the variant override is how a store ends up
              quoting one number and taking another. */}
          <p className="product-price">
            {price < product.price ? (
              <>
                <span className="price-was">{formatPrice(product.price)}</span>
                <span className="price-now">{formatPrice(price)}</span>
              </>
            ) : (
              formatPrice(price)
            )}
            {from !== null && price >= product.price && (
              <span className="card-price-from">
                Selected colours from {formatPrice(from)}
              </span>
            )}
          </p>

          {product.badges.length > 0 && (
            <ul className="badge-list">
              {product.badges.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}

          <span className="size-label">
            Colour: <strong>{variant.colour}</strong>
          </span>
          <div className="swatch-grid">
            {product.variants.map((v) => (
              <button
                key={v.id}
                type="button"
                className={`swatch swatch-lg ${v.id === variant.id ? "is-active" : ""}`}
                style={{ background: v.swatch }}
                aria-label={v.colour}
                aria-pressed={v.id === variant.id}
                onClick={() => setVariantId(v.id)}
              />
            ))}
          </div>

          <div className="size-label-row">
            <span className="size-label">Size</span>
            <Link
              href="/size-guide"
              className="size-guide-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              Size guide
            </Link>
          </div>
          <div className="size-grid">
            {variant.skus.map((s) => (
              <button
                key={s.id}
                className={`size-btn ${sizeId === s.id ? "active" : ""}`}
                disabled={!s.inStock}
                onClick={() => setSizeId(s.id)}
              >
                {s.size}
              </button>
            ))}
          </div>

          {/* The SKU identifies a SIZE within a colour, not the product, so
              there is nothing honest to show until a size is picked. Shown
              here rather than beside the title for that reason — and because
              it is what a customer quotes back in an email about an order. */}
          {sku && <p className="product-sku">{sku.id}</p>}

          <button className="btn" onClick={handleAddToBag} disabled={!sku}>
            {added ? "Added to bag" : sku ? "Add to bag" : "Select a size"}
          </button>

          <p className="product-delivery eyebrow">
            Free standard delivery over £100 &amp; free returns
          </p>

          <p className="product-desc">{product.description}</p>
          <ul className="product-details">
            {product.details.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

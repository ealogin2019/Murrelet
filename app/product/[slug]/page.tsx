"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  Product,
  Sku,
  Variant,
  seedCatalog,
  categoryLabels,
  findVariant,
  lowestOverride,
  variantPrice,
} from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/lib/cart-context";

function ProductDetail() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params?.slug as string;
  const { addItem } = useCart();

  const [catalog, setCatalog] = useState<Product[]>(seedCatalog);
  const [loaded, setLoaded] = useState(false);
  const [variantId, setVariantId] = useState<string | null>(
    searchParams.get("colour")
  );
  const [sizeId, setSizeId] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.products)) setCatalog(data.products);
      })
      .catch(() => {
        // keep the seed catalog on any fetch error
      })
      .finally(() => setLoaded(true));
  }, []);

  const product = catalog.find((p) => p.slug === slug);
  const variant: Variant | undefined = product
    ? findVariant(product, variantId)
    : undefined;

  // Size selection belongs to a colour: switching colour must clear it, or a
  // stale size id from the previous variant gets added to the bag.
  useEffect(() => {
    setSizeId(null);
  }, [variant?.id]);

  const price = useMemo(
    () => (product && variant ? variantPrice(product, variant) : 0),
    [product, variant]
  );

  if (!product || !variant) {
    if (!loaded) return null; // avoid a "not found" flash while the catalog loads
    return (
      <div className="status-page wrap">
        <h1>Product not found</h1>
        <p>This item may have been removed.</p>
        <Link href="/" className="btn" style={{ display: "inline-block", width: "auto" }}>
          Back to shop
        </Link>
      </div>
    );
  }

  const sku: Sku | undefined = variant.skus.find((s) => s.id === sizeId);
  const from = lowestOverride(product);

  function handleAddToBag() {
    if (!product || !variant || !sku) return;
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
        <div className="product-gallery">
          {variant.images.map((src, i) => (
            <div className="product-image" key={src}>
              <img
                src={src}
                alt={`${product.name} — ${variant.colour}`}
                // The first image is above the fold on every PDP; the rest
                // are not, and there may eventually be many of them.
                loading={i === 0 ? "eager" : "lazy"}
              />
            </div>
          ))}
        </div>

        <div className="product-info">
          <h1>{product.name}</h1>

          {/* Shows the price of the SELECTED colour, which is what add-to-bag
              charges. Displaying the product list price here while charging
              the variant override is how a store ends up quoting one number
              and taking another. */}
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

          <span className="size-label">Size</span>
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

export default function ProductPage() {
  return (
    <Suspense fallback={null}>
      <ProductDetail />
    </Suspense>
  );
}

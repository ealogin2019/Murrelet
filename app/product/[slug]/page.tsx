"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Product, seedProducts } from "@/lib/products";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/lib/cart-context";

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const { addItem } = useCart();

  const [products, setProducts] = useState<Product[]>(seedProducts);
  const [loaded, setLoaded] = useState(false);
  const [size, setSize] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.products)) setProducts(data.products);
      })
      .catch(() => {
        // keep the seed products on any fetch error
      })
      .finally(() => setLoaded(true));
  }, []);

  const product = products.find((p) => p.slug === slug);

  if (!product) {
    if (!loaded) return null; // avoid a "not found" flash while the live catalog loads
    return (
      <div className="status-page wrap">
        <h1>Product not found</h1>
        <p>This item may have been removed.</p>
        <a href="/" className="btn" style={{ display: "inline-block", width: "auto" }}>
          Back to shop
        </a>
      </div>
    );
  }

  function handleAddToCart() {
    if (!size || !product) return;
    addItem(
      {
        id: product.id,
        slug: product.slug,
        name: product.name,
        price: product.price,
        image: product.image,
        fallbackImage: product.fallbackImage,
        size,
      },
      1
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  return (
    <div className="wrap">
      <div className="product-detail">
        <div className="product-image">
          <img
            src={product.image}
            alt={product.name}
            onError={(e) => {
              const img = e.currentTarget;
              if (img.src.indexOf(product.fallbackImage) === -1) {
                img.src = product.fallbackImage;
              }
            }}
          />
        </div>
        <div className="product-info">
          <h1>{product.name}</h1>
          <p className="product-price">{formatPrice(product.price)}</p>
          <p className="product-desc">{product.description}</p>

          <span className="size-label">Size</span>
          <div className="size-grid">
            {product.sizes.map((s) => (
              <button
                key={s}
                className={`size-btn ${size === s ? "active" : ""}`}
                onClick={() => setSize(s)}
              >
                {s}
              </button>
            ))}
          </div>

          <button className="btn" onClick={handleAddToCart} disabled={!size}>
            {added ? "Added to cart" : size ? "Add to cart" : "Select a size"}
          </button>

          <button
            className="btn btn-secondary"
            style={{ marginTop: 10 }}
            onClick={() => router.push("/cart")}
          >
            View cart
          </button>
        </div>
      </div>
    </div>
  );
}

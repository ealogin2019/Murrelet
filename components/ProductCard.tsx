"use client";

import Link from "next/link";
import { Product } from "@/lib/products";
import { formatPrice } from "@/lib/format";

export default function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/product/${product.slug}`} className="card">
      <div className="card-image">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          onError={(e) => {
            const img = e.currentTarget;
            if (img.src.indexOf(product.fallbackImage) === -1) {
              img.src = product.fallbackImage;
            }
          }}
        />
      </div>
      <p className="card-category">{product.category.replace("-", " ")}</p>
      <p className="card-name">{product.name}</p>
      <p className="card-price">{formatPrice(product.price)}</p>
    </Link>
  );
}

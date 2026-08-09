"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Product,
  categories,
  categoryLabels,
  productTypes,
  productTypeLabels,
} from "@/lib/catalog";
import ProductCard from "@/components/ProductCard";

/**
 * Two independent filter rows — gender and garment type — combinable rather
 * than either replacing the other. A product missing one axis (type is
 * optional until admin sets it) just doesn't match that filter; it still
 * shows under "All".
 */
function Filters({ products }: { products: Product[] }) {
  const params = useSearchParams();
  const [type, setType] = useState<string>(params.get("type") || "all");
  const [gender, setGender] = useState<string>(params.get("category") || "all");

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          (type === "all" || p.type === type) &&
          (gender === "all" || p.category === gender)
      ),
    [products, type, gender]
  );

  return (
    <>
      <div className="filter-row">
        <span className="filter-row-label">Type</span>
        <button
          className={`filter-chip ${type === "all" ? "is-active" : ""}`}
          onClick={() => setType("all")}
        >
          All
        </button>
        {productTypes.map((t) => (
          <button
            key={t}
            className={`filter-chip ${type === t ? "is-active" : ""}`}
            onClick={() => setType(t)}
          >
            {productTypeLabels[t]}
          </button>
        ))}
      </div>

      <div className="filter-row">
        <span className="filter-row-label">For</span>
        <button
          className={`filter-chip ${gender === "all" ? "is-active" : ""}`}
          onClick={() => setGender("all")}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c}
            className={`filter-chip ${gender === c ? "is-active" : ""}`}
            onClick={() => setGender(c)}
          >
            {categoryLabels[c]}
          </button>
        ))}
      </div>

      <p className="eyebrow listing-count">
        {filtered.length} {filtered.length === 1 ? "style" : "styles"}
      </p>

      {filtered.length === 0 ? (
        <p className="empty-state">Nothing matches those filters yet.</p>
      ) : (
        <div className="grid">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </>
  );
}

export default function ProductListing({
  title,
  products,
}: {
  title: string;
  products: Product[];
}) {
  return (
    <div className="wrap listing">
      <h1>{title}</h1>
      <Suspense fallback={null}>
        <Filters products={products} />
      </Suspense>
    </div>
  );
}

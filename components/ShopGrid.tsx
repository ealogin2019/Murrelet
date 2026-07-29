"use client";

import { useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Product, categories, categoryLabels } from "@/lib/catalog";
import ProductCard from "@/components/ProductCard";

/**
 * Filtering is the only interactive part of the shop grid, so the products
 * themselves arrive already rendered from the server. Nothing here fetches.
 */
function Grid({ products }: { products: Product[] }) {
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState<string>(searchParams.get("category") || "all");

  const filtered = useMemo(
    () => (filter === "all" ? products : products.filter((p) => p.category === filter)),
    [filter, products]
  );

  return (
    <div className="wrap" id="shop">
      <div className="filters">
        <button
          className={`filter-btn ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c}
            className={`filter-btn ${filter === c ? "active" : ""}`}
            onClick={() => setFilter(c)}
          >
            {categoryLabels[c]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="empty-state">Nothing in this category yet.</p>
      ) : (
        <div className="grid">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ShopGrid({ products }: { products: Product[] }) {
  return (
    <Suspense fallback={null}>
      <Grid products={products} />
    </Suspense>
  );
}

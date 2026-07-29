"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Product, seedCatalog, categories, categoryLabels } from "@/lib/catalog";
import ProductCard from "@/components/ProductCard";
import HeroShowcase from "@/components/HeroShowcase";

function ShopContent() {
  const searchParams = useSearchParams();
  const urlCategory = searchParams.get("category");
  const [filter, setFilter] = useState<string>(urlCategory || "all");
  const [products, setProducts] = useState<Product[]>(seedCatalog);

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.products)) setProducts(data.products);
      })
      .catch(() => {
        // keep the seed products on any fetch error
      });
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return products;
    return products.filter((p) => p.category === filter);
  }, [filter, products]);

  return (
    <main>
      <HeroShowcase />

      <div className="wrap">
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

        <div className="grid">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <ShopContent />
    </Suspense>
  );
}

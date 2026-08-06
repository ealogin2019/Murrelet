import { Product } from "@/lib/catalog";
import ProductCard from "@/components/ProductCard";

export default function ProductListing({
  title,
  products,
}: {
  title: string;
  products: Product[];
}) {
  return (
    <div className="wrap listing">
      <p className="eyebrow">
        {products.length} {products.length === 1 ? "style" : "styles"}
      </p>
      <h1>{title}</h1>

      {products.length === 0 ? (
        <p className="empty-state">New styles are on the way.</p>
      ) : (
        <div className="grid">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

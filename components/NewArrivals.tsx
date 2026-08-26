import Link from "next/link";
import { Product } from "@/lib/catalog";
import ProductCard from "@/components/ProductCard";

/**
 * The featured 2x2 treatment only makes sense with a full set beside it —
 * showing exactly 4, with the first spanning double width/height, always
 * leaves exactly one grid cell over, which is where the "more" tile sits.
 *
 * Below that count the catalog isn't full enough for that rhythm, but a
 * plain small-thumbnail grid with only one or two products in it reads as
 * sparse, not intentional — so 1-3 products get the "edit" treatment
 * instead: every card large, like a curated pick rather than a half-empty
 * shelf.
 */
export default function NewArrivals({ products }: { products: Product[] }) {
  const shown = products.slice(0, 4);
  const featured = shown.length === 4;
  const isEdit = shown.length > 0 && shown.length < 4;

  return (
    <div className="wrap" id="new-arrivals">
      <div className="shop-head">
        <p className="eyebrow">{isEdit ? "The edit" : "New arrivals"}</p>
        <Link href="/shop">Shop all &rarr;</Link>
      </div>

      {shown.length === 0 ? (
        <p className="empty-state">New styles are on the way.</p>
      ) : (
        <div className={`pgrid ${isEdit ? "is-edit" : ""}`}>
          {shown.map((p, i) => (
            <ProductCard key={p.id} product={p} featured={(featured && i === 0) || isEdit} />
          ))}
          {featured && (
            <Link href="/shop" className="pcard-more">
              <h3>More to explore</h3>
              <span className="hero-link">
                Shop the full collection
                <svg width="14" height="14" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M4 10h12M11 5l5 5-5 5" />
                </svg>
              </span>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

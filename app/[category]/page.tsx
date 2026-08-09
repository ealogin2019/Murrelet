import { notFound, permanentRedirect } from "next/navigation";
import { categories, Category } from "@/lib/catalog";

// /men /women /kids are clean, memorable entry points, but the actual
// listing — with both the gender and type filters — lives at /shop. Rather
// than keep two separate filtered-grid implementations that can quietly
// drift apart, this route is just a permanent redirect into the one real
// listing, pre-selecting gender.

type Props = { params: { category: string } };

function asCategory(value: string): Category | null {
  return (categories as readonly string[]).includes(value) ? (value as Category) : null;
}

export default function CategoryRedirect({ params }: Props) {
  const category = asCategory(params.category);
  // Any single-segment path that isn't a real category (or a stray typo)
  // falls through to this route — literal top-level routes like /cart or
  // /admin always win over it, so this only ever catches the unmatched rest.
  if (!category) notFound();

  permanentRedirect(`/shop?category=${category}`);
}

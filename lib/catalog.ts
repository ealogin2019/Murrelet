// The catalog model.
//
// product → variant (a colour) → sku (a size within that colour).
//
// Price lives on the PRODUCT as the list price. A variant's `price` is an
// optional OVERRIDE — null/undefined means "inherits the product price". That
// is what lets a card show "£89.00  Selected colours from £65.00": the list
// price, then the cheapest override beneath it. Only discounted colours need
// a number, which keeps data entry small.
//
// All money is integer PENCE. Never a float.

export type Sku = {
  id: string;
  size: string;
  inStock: boolean;
  /** null = not tracked (showcase mode). A number once real inventory lands. */
  stock: number | null;
};

export type Variant = {
  id: string;
  colour: string;
  /** Hex used for the round swatch chip. */
  swatch: string;
  /** Override in pence, or null to inherit the product's list price. */
  price: number | null;
  /** Per-colour photography. One entry is fine; the gallery hides itself. */
  images: string[];
  skus: Sku[];
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: Category;
  description: string;
  details: string[];
  /** e.g. "NEW ARRIVAL", "BESTSELLER" — rendered as micro-labels. */
  badges: string[];
  /** List price in pence. */
  price: number;
  variants: Variant[];
};

export const categories = ["shirts", "polo-shirts", "shorts"] as const;
export type Category = (typeof categories)[number];

export const categoryLabels: Record<Category, string> = {
  shirts: "Shirts",
  "polo-shirts": "Polo Shirts",
  shorts: "Shorts",
};

const SHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

/** Builds a full size run for a variant. Showcase mode: everything in stock. */
function sizeRun(variantId: string, sizes: string[] = SHIRT_SIZES): Sku[] {
  return sizes.map((size) => ({
    id: `${variantId}-${size.toLowerCase()}`,
    size,
    inStock: true,
    stock: null,
  }));
}

const img = (name: string) => `/images/catalog/${name}.jpg`;

export const seedCatalog: Product[] = [
  {
    id: "linen-shirt",
    slug: "custom-fit-linen-shirt",
    name: "Custom Fit Linen Shirt",
    category: "shirts",
    description:
      "Cut from a breathable pure linen that softens with every wear. A relaxed collar and a single chest pocket keep it easy — the shirt for long lunches and longer evenings.",
    details: [
      "100% linen",
      "Custom fit",
      "Spread collar, chest pocket",
      "Machine wash cold",
    ],
    badges: ["NEW ARRIVAL"],
    price: 8900,
    variants: [
      {
        id: "linen-shirt-light-blue",
        colour: "Light Blue",
        swatch: "#A8C4DC",
        price: null,
        images: [img("linen-shirt-light-blue")],
        skus: sizeRun("linen-shirt-light-blue"),
      },
      {
        id: "linen-shirt-white",
        colour: "White",
        swatch: "#F2F0EB",
        price: 6500,
        images: [img("linen-shirt-white")],
        skus: sizeRun("linen-shirt-white"),
      },
    ],
  },
  {
    id: "plain-shirt",
    slug: "plain-short-sleeve-shirt",
    name: "Plain Short Sleeve Shirt",
    category: "shirts",
    description:
      "A plain-woven short sleeve shirt with a clean, unfussy line. No logo, no hardware — just a well-cut collar and a hem that sits right untucked.",
    details: [
      "Linen-cotton blend",
      "Regular fit",
      "Camp collar, chest pocket",
      "Machine wash cold",
    ],
    badges: [],
    price: 7500,
    variants: [
      {
        id: "plain-shirt-black",
        colour: "Black",
        swatch: "#1A1A1A",
        price: null,
        images: [img("plain-shirt-black")],
        skus: sizeRun("plain-shirt-black"),
      },
      {
        id: "plain-shirt-brown",
        colour: "Tobacco",
        swatch: "#7A4A22",
        price: null,
        images: [img("plain-shirt-brown")],
        skus: sizeRun("plain-shirt-brown"),
      },
    ],
  },
  {
    id: "cotton-shorts",
    slug: "classic-cotton-shorts",
    name: "22.5 cm Classic Cotton Shorts",
    category: "shorts",
    description:
      "A 22.5 cm inseam in a garment-dyed cotton twill that holds its colour. Slanted hip pockets, a flat front, and enough room to actually sit down in.",
    details: [
      "100% cotton twill",
      "22.5 cm inseam",
      "Flat front, slant pockets",
      "Machine wash cold",
    ],
    badges: ["BESTSELLER"],
    price: 5500,
    variants: [
      {
        id: "cotton-shorts-green",
        colour: "Meadow Green",
        swatch: "#9BCB8E",
        price: 3900,
        images: [img("shorts-green")],
        skus: sizeRun("cotton-shorts-green"),
      },
      {
        id: "cotton-shorts-black",
        colour: "Black",
        swatch: "#1A1A1A",
        price: null,
        images: [img("shorts-black")],
        skus: sizeRun("cotton-shorts-black"),
      },
    ],
  },
  {
    id: "polo-shirt",
    slug: "casual-polo-shirt",
    name: "Casual Polo Shirt",
    category: "polo-shirts",
    description:
      "An everyday layer in a soft brushed cotton. Wear it open over a tee or buttoned on its own — it takes a crease well and loses it just as easily.",
    details: [
      "Brushed cotton",
      "Regular fit",
      "Button front, ribbed cuffs",
      "Machine wash cold",
    ],
    badges: ["TRENDING"],
    price: 9500,
    variants: [
      {
        id: "polo-shirt-chambray",
        colour: "Chambray",
        swatch: "#7FA0C4",
        price: null,
        images: [img("polo-shirt-chambray")],
        skus: sizeRun("polo-shirt-chambray"),
      },
      {
        id: "polo-shirt-white",
        colour: "White",
        swatch: "#F2F0EB",
        price: null,
        images: [img("polo-shirt-white")],
        skus: sizeRun("polo-shirt-white"),
      },
      {
        id: "polo-shirt-purple",
        colour: "Violet",
        swatch: "#5B4BA8",
        price: 7000,
        images: [img("polo-shirt-purple")],
        skus: sizeRun("polo-shirt-purple"),
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Derived helpers — one place, so the PLP card, the PDP and the checkout all
// agree on what a variant costs.
// ---------------------------------------------------------------------------

/** What this specific colour costs, falling back to the product list price. */
export function variantPrice(product: Product, variant: Variant): number {
  return variant.price ?? product.price;
}

/**
 * The cheapest override, or null when no colour is discounted. Drives the
 * "Selected colours from £x" line — absent when everything is list price.
 */
export function lowestOverride(product: Product): number | null {
  const overrides = product.variants
    .map((v) => v.price)
    .filter((p): p is number => typeof p === "number" && p < product.price);
  return overrides.length ? Math.min(...overrides) : null;
}

export function findProduct(catalog: Product[], slug: string): Product | undefined {
  return catalog.find((p) => p.slug === slug);
}

export function findVariant(product: Product, variantId?: string | null): Variant {
  return product.variants.find((v) => v.id === variantId) ?? product.variants[0];
}

export function findSku(product: Product, skuId: string) {
  for (const variant of product.variants) {
    const sku = variant.skus.find((s) => s.id === skuId);
    if (sku) return { variant, sku };
  }
  return null;
}

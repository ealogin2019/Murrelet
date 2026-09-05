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
  /** Second filter axis — null until admin assigns one. */
  type: ProductType | null;
  description: string;
  details: string[];
  /** e.g. "NEW ARRIVAL", "BESTSELLER" — rendered as micro-labels. */
  badges: string[];
  /** List price in pence. */
  price: number;
  variants: Variant[];
};

export const categories = ["men", "women", "kids"] as const;
export type Category = (typeof categories)[number];

export const categoryLabels: Record<Category, string> = {
  men: "Men",
  women: "Women",
  kids: "Kids",
};

/**
 * A second, independent filter axis — what kind of garment, not who it's
 * for. The hero's category picker sets this; gender (above) stays a
 * separate, combinable filter on the listing page rather than being
 * replaced by it. A product can have no type set (not yet categorised) —
 * it just won't appear in a type-filtered view, same as an uncategorised
 * product still shows under "all".
 */
export const productTypes = [
  "t-shirts",
  "hoodies",
  "sweatshirts",
  "socks",
  "trunks-boxers",
  "jeans",
  "puffer-jackets",
] as const;
export type ProductType = (typeof productTypes)[number];

export const productTypeLabels: Record<ProductType, string> = {
  "t-shirts": "T-Shirts",
  hoodies: "Hoodies",
  sweatshirts: "Sweatshirts",
  socks: "Socks",
  "trunks-boxers": "Trunks/Boxers",
  jeans: "Jeans",
  "puffer-jackets": "Puffer Jackets",
};

/**
 * The fixed colour set admin picks from — a name always carries the same
 * hex, so "not manual" means literally that: no freeform hex entry, no two
 * products drifting to slightly different blues. Add to this list rather
 * than letting admin type a custom value; keeping it closed is the point.
 */
export const swatchPalette = [
  { name: "White", hex: "#F5F4F1" },
  { name: "Black", hex: "#1A1A1A" },
  { name: "Navy Blue", hex: "#0B1F3A" },
  { name: "Royal Blue", hex: "#1E4FBA" },
  { name: "Light Blue", hex: "#A8C4DC" },
  { name: "Maroon", hex: "#6E1F2A" },
  { name: "Light Grey", hex: "#C7C5C0" },
  { name: "Dark Grey", hex: "#5B5A56" },
  { name: "Dark Brown", hex: "#4A3123" },
  { name: "Beige", hex: "#D8CBB3" },
] as const;
export type SwatchName = (typeof swatchPalette)[number]["name"];

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

const img = (product: string, colour: string) =>
  `/images/catalog/${product}/${colour}/1.jpg`;

/**
 * Image list for a colour rendered by the engine.
 *
 * Two files exist per shot: `n.webp` at 1200px for the product page and
 * `n-sm.webp` at 480px for the listing card. Only the large path is stored —
 * `cardSrc` below derives the small one — because holding both in the row
 * would let them drift apart, and the pairing is a fact about how they are
 * written, not a choice made per product.
 */
const shots = (product: string, colour: string, n: number) =>
  Array.from({ length: n }, (_, i) => `/images/catalog/${product}/${colour}/${i + 1}.webp`);

/**
 * The 480px card file for a 1200px product-page file.
 *
 * A listing showing one card per colourway is 27 images on a single screen.
 * At product-page size that is several megabytes before anything is clicked;
 * these are 5–18 KB each.
 */
export function cardSrc(src: string): string {
  return src.endsWith(".webp") ? src.replace(/\.webp$/, "-sm.webp") : src;
}

/**
 * SKU id.
 *
 *   MUR-TS-LT-BLK-M
 *       │  │  │   └── size
 *       │  │  └────── colourway
 *       │  └───────── print treatment: LT, SL, STL
 *       └──────────── garment: TS, HD, SW, PF, SK, TR
 *
 * Readable in a picking list without decoding, sorts sensibly, and extends to
 * hoodies and socks without renumbering anything. A purely numeric scheme was
 * considered and can be carried alongside if an EPOS ever demands digits, but
 * a code a human can read prevents more errors than it costs.
 */
const COLOUR_CODE: Record<string, string> = {
  Black: "BLK",
  Brown: "BRN",
  Burgundy: "BRG",
  Charcoal: "CHR",
  Grey: "GRY",
  "Light Grey": "LGY",
  Navy: "NVY",
  Sand: "SND",
  "Sky Blue": "SKY",
  White: "WHT",
};

function skuRun(garment: string, treatment: string, colour: string): Sku[] {
  const code = COLOUR_CODE[colour] ?? colour.slice(0, 3).toUpperCase();
  return SHIRT_SIZES.map((size) => ({
    id: `MUR-${garment}-${treatment}-${code}-${size}`,
    size,
    inStock: true,
    stock: null,
  }));
}

/** Colourways of the Large.Text tee, with swatches MEASURED off the
 *  photography rather than picked from the palette — the 60th to 88th
 *  luminance percentile of the flat lay, which is the band that reads as the
 *  colour of the cloth rather than its shadows or its sheen. A chip that does
 *  not match the garment beside it is the kind of small dishonesty a customer
 *  notices without being able to say why. */
const LARGE_TEXT_COLOURS: { colour: string; swatch: string; shots: number }[] = [
  { colour: "Black", swatch: "#151515", shots: 4 },
  { colour: "Brown", swatch: "#39251B", shots: 4 },
  { colour: "Burgundy", swatch: "#601124", shots: 4 },
  { colour: "Charcoal", swatch: "#36353A", shots: 4 },
  { colour: "Light Grey", swatch: "#C1C1C1", shots: 3 },
  { colour: "Navy", swatch: "#18243C", shots: 4 },
  { colour: "Sand", swatch: "#DDCAB5", shots: 4 },
  { colour: "Sky Blue", swatch: "#BED3EB", shots: 4 },
  { colour: "White", swatch: "#F1F0F2", shots: 4 },
];

const largeTextTee: Product = {
  id: "large-text-tee",
  slug: "large-text-tee",
  name: "Large Text Tee",
  category: "men",
  type: "t-shirts",
  // PROVISIONAL COPY — written to get the product on the page. Every string
  // in this product is placeholder and is for the designers to replace with
  // the real description, details and price.
  description:
    "The wordmark, set large across the chest. Mid-weight cotton jersey with a "
    + "set-in sleeve and a ribbed crew that holds its shape. Woven label at the "
    + "nape. Nine colourways.",
  details: [
    "PROVISIONAL — copy and price to be replaced by the design team",
    "100% cotton jersey",
    "Regular fit",
    "Ribbed crew neck, woven neck label",
    "Machine wash cold, dry flat",
  ],
  badges: ["NEW ARRIVAL"],
  price: 3500,
  variants: LARGE_TEXT_COLOURS.map(({ colour, swatch, shots: n }) => ({
    id: `large-text-tee-${colour.toLowerCase().replace(/\s+/g, "-")}`,
    colour,
    swatch,
    price: null,
    images: shots("large-text-tee", colour.toLowerCase().replace(/\s+/g, "-"), n),
    skus: skuRun("TS", "LT", colour),
  })),
};

/** Colourways of the Small.Text-Logo tee. Swatches measured off each flat lay
 *  the same way as the Large.Text set above, so the two products' chips are
 *  comparable rather than merely both plausible.
 *
 *  `shots` counts what the engine actually rendered for that colour, which is
 *  not uniform: some colourways were shot with a back view and some were not,
 *  and Charcoal, Navy, Sand, Sky Blue and White have no seventh frame. Writing
 *  the real number per colour keeps the gallery from linking to a file that was
 *  never made. */
const SMALL_TEXT_COLOURS: { colour: string; swatch: string; shots: number }[] = [
  { colour: "Black", swatch: "#1D1D1C", shots: 5 },
  { colour: "Brown", swatch: "#573829", shots: 6 },
  { colour: "Burgundy", swatch: "#5A1624", shots: 6 },
  { colour: "Charcoal", swatch: "#49494B", shots: 5 },
  { colour: "Grey", swatch: "#A4A4A6", shots: 6 },
  { colour: "Navy", swatch: "#1A2134", shots: 5 },
  { colour: "Sand", swatch: "#DFCDB5", shots: 5 },
  { colour: "Sky Blue", swatch: "#C7DDF3", shots: 5 },
  { colour: "White", swatch: "#F1F1F2", shots: 4 },
];

const smallTextLogoTee: Product = {
  id: "small-text-logo-tee",
  slug: "small-text-logo-tee",
  name: "Small Text Logo Tee",
  category: "men",
  type: "t-shirts",
  // PROVISIONAL COPY — written to get the product on the page. Every string
  // in this product is placeholder and is for the designers to replace with
  // the real description, details and price.
  description:
    "The crest and wordmark, set small at the left chest. Mid-weight cotton "
    + "jersey with a set-in sleeve and a ribbed crew that holds its shape. "
    + "Woven label at the nape. Nine colourways.",
  details: [
    "PROVISIONAL — copy and price to be replaced by the design team",
    "100% cotton jersey",
    "Regular fit",
    "Ribbed crew neck, woven neck label",
    "Machine wash cold, dry flat",
  ],
  badges: ["NEW ARRIVAL"],
  price: 3500,
  variants: SMALL_TEXT_COLOURS.map(({ colour, swatch, shots: n }) => ({
    id: `small-text-logo-tee-${colour.toLowerCase().replace(/\s+/g, "-")}`,
    colour,
    swatch,
    price: null,
    images: shots("small-text-logo-tee", colour.toLowerCase().replace(/\s+/g, "-"), n),
    skus: skuRun("TS", "STL", colour),
  })),
};

export const seedCatalog: Product[] = [
  largeTextTee,
  smallTextLogoTee,
  {
    id: "linen-shirt",
    slug: "custom-fit-linen-shirt",
    name: "Custom Fit Linen Shirt",
    category: "men",
    type: null,
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
        images: [img("custom-fit-linen-shirt", "light-blue")],
        skus: sizeRun("linen-shirt-light-blue"),
      },
      {
        id: "linen-shirt-white",
        colour: "White",
        swatch: "#F2F0EB",
        price: 6500,
        images: [img("custom-fit-linen-shirt", "white")],
        skus: sizeRun("linen-shirt-white"),
      },
    ],
  },
  {
    id: "plain-shirt",
    slug: "plain-short-sleeve-shirt",
    name: "Plain Short Sleeve Shirt",
    category: "men",
    type: null,
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
        images: [img("plain-short-sleeve-shirt", "black")],
        skus: sizeRun("plain-shirt-black"),
      },
      {
        id: "plain-shirt-brown",
        colour: "Tobacco",
        swatch: "#7A4A22",
        price: null,
        images: [img("plain-short-sleeve-shirt", "tobacco")],
        skus: sizeRun("plain-shirt-brown"),
      },
    ],
  },
  {
    id: "cotton-shorts",
    slug: "classic-cotton-shorts",
    name: "22.5 cm Classic Cotton Shorts",
    category: "men",
    type: null,
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
        images: [img("classic-cotton-shorts", "meadow-green")],
        skus: sizeRun("cotton-shorts-green"),
      },
      {
        id: "cotton-shorts-black",
        colour: "Black",
        swatch: "#1A1A1A",
        price: null,
        images: [img("classic-cotton-shorts", "black")],
        skus: sizeRun("cotton-shorts-black"),
      },
    ],
  },
  {
    id: "polo-shirt",
    slug: "casual-polo-shirt",
    name: "Casual Polo Shirt",
    category: "men",
    type: null,
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
        images: [img("casual-polo-shirt", "chambray")],
        skus: sizeRun("polo-shirt-chambray"),
      },
      {
        id: "polo-shirt-white",
        colour: "White",
        swatch: "#F2F0EB",
        price: null,
        images: [img("casual-polo-shirt", "white")],
        skus: sizeRun("polo-shirt-white"),
      },
      {
        id: "polo-shirt-purple",
        colour: "Violet",
        swatch: "#5B4BA8",
        price: 7000,
        images: [img("casual-polo-shirt", "violet")],
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

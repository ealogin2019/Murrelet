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

/**
 * Size run for a SHOWCASE product -- one of the placeholder garments that has
 * never been assigned a ProductType and is not in the live catalog.
 *
 * These get a descriptive id rather than a SKU number on purpose: a number
 * from the scheme below is a commitment (it goes on a picking list and never
 * changes), and nothing here is real enough to commit to. The day one of these
 * becomes a product, it gets a type and moves to skuRun like everything sold.
 */
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
 * SKU number.
 *
 *   2690001001
 *   ││ ││ │ ││ └┴┴─ size        001-006
 *   ││ ││ │ └┴───── colourway   01-99
 *   ││ ││ └──────── treatment   0-9
 *   ││ └┴────────── garment     90-99
 *   └┴───────────── house code  26
 *
 * Ten digits, fixed width, no separators. Numeric because the code has to
 * survive places a readable one does not: an accounts ledger, a stock count,
 * an EPOS field that accepts digits only, a spreadsheet that would helpfully
 * reinterpret MUR-TS-LT-BLK-M as something else. Fixed width so it sorts
 * correctly as text and so a truncated code is obviously truncated.
 *
 * The numbers below are PERMANENT. A colourway keeps the number it was first
 * given, for as long as the business exists -- the next new colour takes the
 * next free number whatever its name, and nothing already issued moves. That
 * is the whole point: a code that can be renumbered is a code that disagrees
 * with last year's picking lists.
 */
const HOUSE = "26";

/** Garment family. Keyed to ProductType so a new type cannot be sold under a
 *  number nobody assigned. */
const GARMENT_NUMBER: Record<ProductType, string> = {
  "t-shirts": "90",
  hoodies: "91",
  sweatshirts: "92",
  socks: "93",
  "trunks-boxers": "94",
  jeans: "95",
  "puffer-jackets": "96",
};

/** Print treatment. 9 is the garment with no print, not a missing value. */
const TREATMENT_NUMBER = {
  "large-text": "0",
  "small-logo": "1",
  "small-text-logo": "2",
  none: "9",
} as const;
type TreatmentKey = keyof typeof TREATMENT_NUMBER;

/**
 * The colour standards.
 *
 * A number belongs to a CLOTH, not to a word. Keying colour numbers off names
 * alone let two different fabrics both called "Brown" share 02 -- measured
 * dE 11.6 apart, further than Grey is from Light Grey -- which means a stock
 * count sums two fabrics and a picker sends whichever is nearer. Each number
 * therefore carries the measured swatch it was issued against, and
 * assertColoursDistinct below checks every garment's actual cloth against it.
 *
 * `standard` is the reference measurement, taken from the first product issued
 * that colour, using the same 60th-88th luminance percentile of the flat lay
 * as the swatch chips. null means the number is RESERVED but has no standard
 * yet -- a showcase placeholder that has never been photographed properly.
 * Those products do not carry numeric skus, so nothing is validated against a
 * measurement that does not exist.
 *
 * APPEND ONLY. A colour keeps its number for as long as the business exists.
 * Gaps are fine and expected; density is not a virtue here. Renaming, by
 * contrast, is free -- the number is what operations holds on to, the name is
 * only what the customer reads.
 */
type ColourStandard = { number: string; name: string; standard: string | null };

const COLOUR_STANDARDS: ColourStandard[] = [
  { number: "01", name: "Black", standard: "#151515" },
  { number: "02", name: "Brown", standard: "#39251B" },
  { number: "03", name: "Burgundy", standard: "#601124" },
  { number: "04", name: "Charcoal", standard: "#35353A" },
  { number: "05", name: "Grey", standard: "#A4A4A6" },
  { number: "06", name: "Navy", standard: "#18243C" },
  { number: "07", name: "Sand", standard: "#DDC9B5" },
  { number: "08", name: "Sky Blue", standard: "#BED3EB" },
  { number: "09", name: "White", standard: "#F0F0F2" },
  // Reserved by showcase placeholders. No standard until one is photographed.
  { number: "10", name: "Light Blue", standard: null },
  { number: "11", name: "Light Grey", standard: "#C1C1C1" },
  { number: "12", name: "Dark Grey", standard: null },
  { number: "13", name: "Dark Brown", standard: null },
  { number: "14", name: "Beige", standard: null },
  { number: "15", name: "Chambray", standard: null },
  { number: "16", name: "Violet", standard: null },
  // The Small.TextLogo shoot's brown and charcoal are different cloths from
  // the Large.Text ones above, not different lighting: dE 11.6 and 8.9 against
  // a same-cloth spread of 0.7-4.1 across the other seven colourways. They get
  // their own numbers rather than sharing. Names are provisional -- rename
  // them freely, the numbers are what must not move.
  { number: "17", name: "Chestnut", standard: "#573829" },
  { number: "18", name: "Graphite", standard: "#49494B" },
];

const COLOUR_NUMBER: Record<string, string> = Object.fromEntries(
  COLOUR_STANDARDS.map((c) => [c.name, c.number])
);

/** CIE76 colour difference. Crude next to CIE2000 and entirely sufficient
 *  here: the question is "same cloth or not", where the measured gap is either
 *  under 5 or over 8, never in between. */
function deltaE(a: string, b: string): number {
  const lab = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    let [r, g, bl] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
    [r, g, bl] = [r, g, bl].map((v) => (v > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92));
    const X = (r * 0.4124 + g * 0.3576 + bl * 0.1805) / 0.95047;
    const Y = r * 0.2126 + g * 0.7152 + bl * 0.0722;
    const Z = (r * 0.0193 + g * 0.1192 + bl * 0.9505) / 1.08883;
    const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
  };
  const [l1, a1, b1] = lab(a);
  const [l2, a2, b2] = lab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

/**
 * Thresholds, set from the measurements rather than picked.
 *
 * Across the seven colourways photographed twice, shoot-to-shoot variation of
 * the SAME cloth measured 0.7 to 4.1. The two genuine mismatches measured 8.9
 * and 11.6. So anything at or under 5 is the same cloth photographed twice,
 * and anything at or over 8 is a different cloth. The gap between the two is
 * deliberately left as a warning band: it is where a real question lives, and
 * a number should not be issued on a coin toss.
 */
const SAME_CLOTH = 5;
const DIFFERENT_CLOTH = 8;

/** Sizes. Three digits because a waist or a shoe size will not fit in two. */
const SIZE_NUMBER: Record<string, string> = {
  XS: "001",
  S: "002",
  M: "003",
  L: "004",
  XL: "005",
  XXL: "006",
};

/**
 * An unnumbered colour or size is a mistake, not something to improvise a code
 * for. The old scheme silently fell back to the first three letters of the
 * name, which quietly issues one code to two garments -- "Grey Marl" and
 * "Green" both being GRE. A duplicate SKU is found by a customer receiving the
 * wrong thing, so it fails here instead.
 */
function skuNumber(
  type: ProductType,
  treatment: TreatmentKey,
  colour: string,
  size: string
): string {
  const c = COLOUR_NUMBER[colour];
  const z = SIZE_NUMBER[size];
  if (!c) throw new Error(`No SKU number for colour "${colour}" -- add it to COLOUR_NUMBER.`);
  if (!z) throw new Error(`No SKU number for size "${size}" -- add it to SIZE_NUMBER.`);
  return `${HOUSE}${GARMENT_NUMBER[type]}${TREATMENT_NUMBER[treatment]}${c}${z}`;
}

function skuRun(
  type: ProductType,
  treatment: TreatmentKey,
  colour: string,
  sizes: string[] = SHIRT_SIZES
): Sku[] {
  return sizes.map((size) => ({
    id: skuNumber(type, treatment, colour, size),
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
    skus: skuRun("t-shirts", "large-text", colour),
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
const SMALL_TEXT_COLOURS: {
  colour: string;
  swatch: string;
  shots: number;
  /** Image folder, when it differs from the colour name. A colour may be
   *  renamed at any time; the photography on disk should not have to move for
   *  it, and a rename that silently 404s the gallery is worse than the name it
   *  fixed. */
  folder?: string;
}[] = [
  { colour: "Black", swatch: "#1D1D1C", shots: 5 },
  { colour: "Chestnut", swatch: "#573829", shots: 6, folder: "brown" },
  { colour: "Burgundy", swatch: "#5A1624", shots: 6 },
  { colour: "Graphite", swatch: "#49494B", shots: 5, folder: "charcoal" },
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
  variants: SMALL_TEXT_COLOURS.map(({ colour, swatch, shots: n, folder }) => {
    const dir = folder ?? colour.toLowerCase().replace(/\s+/g, "-");
    return {
      id: `small-text-logo-tee-${dir}`,
      colour,
      swatch,
      price: null,
      images: shots("small-text-logo-tee", dir, n),
      skus: skuRun("t-shirts", "small-text-logo", colour),
    };
  }),
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

/**
 * Every garment's cloth must match the standard its number was issued against,
 * and no two numbers may describe the same cloth.
 *
 * This is the check that was missing when two different browns were both sold
 * as 02. It runs at module load, in every process that reads the catalog, for
 * the same reason the sku uniqueness check does: the alternative to failing
 * here is a customer opening the wrong parcel.
 *
 * Only products carrying numeric skus are checked. A showcase placeholder has
 * no photographed standard to be measured against, and inventing a tolerance
 * for a colour nobody has dyed yet would be theatre.
 */
(function assertColoursDistinct() {
  const standards = new Map(COLOUR_STANDARDS.map((c) => [c.name, c]));

  for (const p of seedCatalog) {
    for (const v of p.variants) {
      if (!/^\d{10}$/.test(v.skus[0]?.id ?? "")) continue;
      const std = standards.get(v.colour);
      if (!std) {
        throw new Error(`${p.name} / ${v.colour}: no colour standard. Add it to COLOUR_STANDARDS.`);
      }
      if (!std.standard) continue;
      const d = deltaE(v.swatch, std.standard);
      if (d >= DIFFERENT_CLOTH) {
        throw new Error(
          `${p.name} / ${v.colour} (${v.swatch}) is dE ${d.toFixed(1)} from colour ` +
          `${std.number}'s standard ${std.standard}. That is a different cloth ` +
          `wearing the same number. Give it its own number in COLOUR_STANDARDS.`
        );
      }
      if (d > SAME_CLOTH) {
        console.warn(
          `Colour ${std.number} ${v.colour}: ${p.name} measures dE ${d.toFixed(1)} ` +
          `from the standard. Under ${DIFFERENT_CLOTH}, so allowed, but worth a look.`
        );
      }
    }
  }

  const withStd = COLOUR_STANDARDS.filter((c) => c.standard);
  for (let i = 0; i < withStd.length; i++) {
    for (let j = i + 1; j < withStd.length; j++) {
      const d = deltaE(withStd[i].standard!, withStd[j].standard!);
      if (d <= SAME_CLOTH) {
        throw new Error(
          `Colours ${withStd[i].number} ${withStd[i].name} and ${withStd[j].number} ` +
          `${withStd[j].name} are only dE ${d.toFixed(1)} apart -- that is one cloth ` +
          `holding two numbers. Merge them.`
        );
      }
    }
  }
})();

/**
 * No two garments may share a SKU. This is the one error in the scheme that
 * the business finds out about from a customer holding the wrong item, so it
 * is checked where it cannot be skipped -- at module load, in every process
 * that reads the catalog.
 */
(function assertSkusUnique() {
  const seen = new Map<string, string>();
  for (const p of seedCatalog) {
    for (const v of p.variants) {
      for (const s of v.skus) {
        const here = `${p.name} / ${v.colour} / ${s.size}`;
        const there = seen.get(s.id);
        if (there) {
          throw new Error(`Duplicate SKU ${s.id}: ${there} and ${here}`);
        }
        seen.set(s.id, here);
      }
    }
  }
})();


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

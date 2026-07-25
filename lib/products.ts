// Seed catalog: used only the very first time the site runs (before an admin
// has saved anything to Blob storage). After that, live product data comes
// from Vercel Blob via lib/blob-store.ts, editable at /admin.
export type Product = {
  id: string;
  slug: string;
  name: string;
  category: "t-shirts" | "jeans" | "hoodies" | "jumpers";
  price: number; // in cents
  image: string;
  fallbackImage: string;
  sizes: string[];
  description: string;
};

export const seedProducts: Product[] = [
  {
    "id": "p001",
    "slug": "classic-crew-tee-1",
    "name": "Classic Crew Tee",
    "category": "t-shirts",
    "price": 2199,
    "image": "/images/real/t-shirts/1.jpg",
    "fallbackImage": "/images/classic-crew-tee-1.svg",
    "sizes": [
      "XS",
      "S",
      "M",
      "L",
      "XL",
      "XXL"
    ],
    "description": "Soft, breathable cotton tee built for everyday wear. Pre-shrunk and garment-washed for a lived-in feel from the first wash."
  },
  {
    "id": "p002",
    "slug": "vintage-wash-tee-2",
    "name": "Vintage Wash Tee",
    "category": "t-shirts",
    "price": 2299,
    "image": "/images/real/t-shirts/2.jpg",
    "fallbackImage": "/images/vintage-wash-tee-2.svg",
    "sizes": [
      "XS",
      "S",
      "M",
      "L",
      "XL",
      "XXL"
    ],
    "description": "Soft, breathable cotton tee built for everyday wear. Pre-shrunk and garment-washed for a lived-in feel from the first wash."
  },
  {
    "id": "p003",
    "slug": "heavyweight-pocket-tee-3",
    "name": "Heavyweight Pocket Tee",
    "category": "t-shirts",
    "price": 2499,
    "image": "/images/real/t-shirts/3.jpg",
    "fallbackImage": "/images/heavyweight-pocket-tee-3.svg",
    "sizes": [
      "XS",
      "S",
      "M",
      "L",
      "XL",
      "XXL"
    ],
    "description": "Soft, breathable cotton tee built for everyday wear. Pre-shrunk and garment-washed for a lived-in feel from the first wash."
  },
  {
    "id": "p004",
    "slug": "ringer-tee-4",
    "name": "Ringer Tee",
    "category": "t-shirts",
    "price": 2599,
    "image": "/images/real/t-shirts/4.jpg",
    "fallbackImage": "/images/ringer-tee-4.svg",
    "sizes": [
      "XS",
      "S",
      "M",
      "L",
      "XL",
      "XXL"
    ],
    "description": "Soft, breathable cotton tee built for everyday wear. Pre-shrunk and garment-washed for a lived-in feel from the first wash."
  },
  {
    "id": "p005",
    "slug": "garment-dyed-tee-5",
    "name": "Garment-Dyed Tee",
    "category": "t-shirts",
    "price": 2699,
    "image": "/images/real/t-shirts/5.jpg",
    "fallbackImage": "/images/garment-dyed-tee-5.svg",
    "sizes": [
      "XS",
      "S",
      "M",
      "L",
      "XL",
      "XXL"
    ],
    "description": "Soft, breathable cotton tee built for everyday wear. Pre-shrunk and garment-washed for a lived-in feel from the first wash."
  },
  {
    "id": "p006",
    "slug": "long-sleeve-tee-6",
    "name": "Long Sleeve Tee",
    "category": "t-shirts",
    "price": 2799,
    "image": "/images/real/t-shirts/1.jpg",
    "fallbackImage": "/images/long-sleeve-tee-6.svg",
    "sizes": [
      "XS",
      "S",
      "M",
      "L",
      "XL",
      "XXL"
    ],
    "description": "Soft, breathable cotton tee built for everyday wear. Pre-shrunk and garment-washed for a lived-in feel from the first wash."
  },
  {
    "id": "p007",
    "slug": "striped-boat-tee-7",
    "name": "Striped Boat Tee",
    "category": "t-shirts",
    "price": 2999,
    "image": "/images/real/t-shirts/2.jpg",
    "fallbackImage": "/images/striped-boat-tee-7.svg",
    "sizes": [
      "XS",
      "S",
      "M",
      "L",
      "XL",
      "XXL"
    ],
    "description": "Soft, breathable cotton tee built for everyday wear. Pre-shrunk and garment-washed for a lived-in feel from the first wash."
  },
  {
    "id": "p008",
    "slug": "washed-graphic-tee-8",
    "name": "Washed Graphic Tee",
    "category": "t-shirts",
    "price": 3099,
    "image": "/images/real/t-shirts/3.jpg",
    "fallbackImage": "/images/washed-graphic-tee-8.svg",
    "sizes": [
      "XS",
      "S",
      "M",
      "L",
      "XL",
      "XXL"
    ],
    "description": "Soft, breathable cotton tee built for everyday wear. Pre-shrunk and garment-washed for a lived-in feel from the first wash."
  },
  {
    "id": "p009",
    "slug": "organic-cotton-tee-9",
    "name": "Organic Cotton Tee",
    "category": "t-shirts",
    "price": 3199,
    "image": "/images/real/t-shirts/4.jpg",
    "fallbackImage": "/images/organic-cotton-tee-9.svg",
    "sizes": [
      "XS",
      "S",
      "M",
      "L",
      "XL",
      "XXL"
    ],
    "description": "Soft, breathable cotton tee built for everyday wear. Pre-shrunk and garment-washed for a lived-in feel from the first wash."
  },
  {
    "id": "p010",
    "slug": "straight-fit-jeans-10",
    "name": "Straight Fit Jeans",
    "category": "jeans",
    "price": 5799,
    "image": "/images/real/jeans/1.jpg",
    "fallbackImage": "/images/straight-fit-jeans-10.svg",
    "sizes": [
      "28",
      "30",
      "32",
      "34",
      "36",
      "38"
    ],
    "description": "Durable denim with just the right amount of stretch. Tailored fit that holds its shape wash after wash."
  },
  {
    "id": "p011",
    "slug": "slim-taper-jeans-11",
    "name": "Slim Taper Jeans",
    "category": "jeans",
    "price": 6099,
    "image": "/images/real/jeans/2.jpg",
    "fallbackImage": "/images/slim-taper-jeans-11.svg",
    "sizes": [
      "28",
      "30",
      "32",
      "34",
      "36",
      "38"
    ],
    "description": "Durable denim with just the right amount of stretch. Tailored fit that holds its shape wash after wash."
  },
  {
    "id": "p012",
    "slug": "relaxed-fit-jeans-12",
    "name": "Relaxed Fit Jeans",
    "category": "jeans",
    "price": 6299,
    "image": "/images/real/jeans/3.jpg",
    "fallbackImage": "/images/relaxed-fit-jeans-12.svg",
    "sizes": [
      "28",
      "30",
      "32",
      "34",
      "36",
      "38"
    ],
    "description": "Durable denim with just the right amount of stretch. Tailored fit that holds its shape wash after wash."
  },
  {
    "id": "p013",
    "slug": "wide-leg-jeans-13",
    "name": "Wide Leg Jeans",
    "category": "jeans",
    "price": 6599,
    "image": "/images/real/jeans/4.jpg",
    "fallbackImage": "/images/wide-leg-jeans-13.svg",
    "sizes": [
      "28",
      "30",
      "32",
      "34",
      "36",
      "38"
    ],
    "description": "Durable denim with just the right amount of stretch. Tailored fit that holds its shape wash after wash."
  },
  {
    "id": "p014",
    "slug": "stretch-skinny-jeans-14",
    "name": "Stretch Skinny Jeans",
    "category": "jeans",
    "price": 6799,
    "image": "/images/real/jeans/5.jpg",
    "fallbackImage": "/images/stretch-skinny-jeans-14.svg",
    "sizes": [
      "28",
      "30",
      "32",
      "34",
      "36",
      "38"
    ],
    "description": "Durable denim with just the right amount of stretch. Tailored fit that holds its shape wash after wash."
  },
  {
    "id": "p015",
    "slug": "raw-selvedge-jeans-15",
    "name": "Raw Selvedge Jeans",
    "category": "jeans",
    "price": 7099,
    "image": "/images/real/jeans/1.jpg",
    "fallbackImage": "/images/raw-selvedge-jeans-15.svg",
    "sizes": [
      "28",
      "30",
      "32",
      "34",
      "36",
      "38"
    ],
    "description": "Durable denim with just the right amount of stretch. Tailored fit that holds its shape wash after wash."
  },
  {
    "id": "p016",
    "slug": "distressed-jeans-16",
    "name": "Distressed Jeans",
    "category": "jeans",
    "price": 7299,
    "image": "/images/real/jeans/2.jpg",
    "fallbackImage": "/images/distressed-jeans-16.svg",
    "sizes": [
      "28",
      "30",
      "32",
      "34",
      "36",
      "38"
    ],
    "description": "Durable denim with just the right amount of stretch. Tailored fit that holds its shape wash after wash."
  },
  {
    "id": "p017",
    "slug": "high-rise-jeans-17",
    "name": "High-Rise Jeans",
    "category": "jeans",
    "price": 7599,
    "image": "/images/real/jeans/3.jpg",
    "fallbackImage": "/images/high-rise-jeans-17.svg",
    "sizes": [
      "28",
      "30",
      "32",
      "34",
      "36",
      "38"
    ],
    "description": "Durable denim with just the right amount of stretch. Tailored fit that holds its shape wash after wash."
  },
  {
    "id": "p018",
    "slug": "bootcut-jeans-18",
    "name": "Bootcut Jeans",
    "category": "jeans",
    "price": 7799,
    "image": "/images/real/jeans/4.jpg",
    "fallbackImage": "/images/bootcut-jeans-18.svg",
    "sizes": [
      "28",
      "30",
      "32",
      "34",
      "36",
      "38"
    ],
    "description": "Durable denim with just the right amount of stretch. Tailored fit that holds its shape wash after wash."
  },
  {
    "id": "p019",
    "slug": "fleece-pullover-hoodie-19",
    "name": "Fleece Pullover Hoodie",
    "category": "hoodies",
    "price": 4799,
    "image": "/images/real/hoodies/1.jpg",
    "fallbackImage": "/images/fleece-pullover-hoodie-19.svg",
    "sizes": [
      "XS",
      "S",
      "M",
      "L",
      "XL",
      "XXL"
    ],
    "description": "Heavyweight fleece with a brushed interior for warmth without the bulk. A closet staple for cool mornings."
  },
  {
    "id": "p020",
    "slug": "zip-up-hoodie-20",
    "name": "Zip-Up Hoodie",
    "category": "hoodies",
    "price": 5099,
    "image": "/images/real/hoodies/2.jpg",
    "fallbackImage": "/images/zip-up-hoodie-20.svg",
    "sizes": [
      "XS",
      "S",
      "M",
      "L",
      "XL",
      "XXL"
    ],
    "description": "Heavyweight fleece with a brushed interior for warmth without the bulk. A closet staple for cool mornings."
  },
  {
    "id": "p021",
    "slug": "oversized-hoodie-21",
    "name": "Oversized Hoodie",
    "category": "hoodies",
    "price": 5299,
    "image": "/images/real/hoodies/3.jpg",
    "fallbackImage": "/images/oversized-hoodie-21.svg",
    "sizes": [
      "XS",
      "S",
      "M",
      "L",
      "XL",
      "XXL"
    ],
    "description": "Heavyweight fleece with a brushed interior for warmth without the bulk. A closet staple for cool mornings."
  },
  {
    "id": "p022",
    "slug": "heavyweight-hoodie-22",
    "name": "Heavyweight Hoodie",
    "category": "hoodies",
    "price": 5599,
    "image": "/images/real/hoodies/4.jpg",
    "fallbackImage": "/images/heavyweight-hoodie-22.svg",
    "sizes": [
      "XS",
      "S",
      "M",
      "L",
      "XL",
      "XXL"
    ],
    "description": "Heavyweight fleece with a brushed interior for warmth without the bulk. A closet staple for cool mornings."
  },
  {
    "id": "p023",
    "slug": "cropped-hoodie-23",
    "name": "Cropped Hoodie",
    "category": "hoodies",
    "price": 5799,
    "image": "/images/real/hoodies/5.jpg",
    "fallbackImage": "/images/cropped-hoodie-23.svg",
    "sizes": [
      "XS",
      "S",
      "M",
      "L",
      "XL",
      "XXL"
    ],
    "description": "Heavyweight fleece with a brushed interior for warmth without the bulk. A closet staple for cool mornings."
  },
  {
    "id": "p024",
    "slug": "graphic-hoodie-24",
    "name": "Graphic Hoodie",
    "category": "hoodies",
    "price": 6099,
    "image": "/images/real/hoodies/1.jpg",
    "fallbackImage": "/images/graphic-hoodie-24.svg",
    "sizes": [
      "XS",
      "S",
      "M",
      "L",
      "XL",
      "XXL"
    ],
    "description": "Heavyweight fleece with a brushed interior for warmth without the bulk. A closet staple for cool mornings."
  },
  {
    "id": "p025",
    "slug": "sherpa-lined-hoodie-25",
    "name": "Sherpa-Lined Hoodie",
    "category": "hoodies",
    "price": 6299,
    "image": "/images/real/hoodies/2.jpg",
    "fallbackImage": "/images/sherpa-lined-hoodie-25.svg",
    "sizes": [
      "XS",
      "S",
      "M",
      "L",
      "XL",
      "XXL"
    ],
    "description": "Heavyweight fleece with a brushed interior for warmth without the bulk. A closet staple for cool mornings."
  },
  {
    "id": "p026",
    "slug": "half-zip-hoodie-26",
    "name": "Half-Zip Hoodie",
    "category": "hoodies",
    "price": 6599,
    "image": "/images/real/hoodies/3.jpg",
    "fallbackImage": "/images/half-zip-hoodie-26.svg",
    "sizes": [
      "XS",
      "S",
      "M",
      "L",
      "XL",
      "XXL"
    ],
    "description": "Heavyweight fleece with a brushed interior for warmth without the bulk. A closet staple for cool mornings."
  },
  {
    "id": "p027",
    "slug": "everyday-hoodie-27",
    "name": "Everyday Hoodie",
    "category": "hoodies",
    "price": 6799,
    "image": "/images/real/hoodies/4.jpg",
    "fallbackImage": "/images/everyday-hoodie-27.svg",
    "sizes": [
      "XS",
      "S",
      "M",
      "L",
      "XL",
      "XXL"
    ],
    "description": "Heavyweight fleece with a brushed interior for warmth without the bulk. A closet staple for cool mornings."
  },
  {
    "id": "p028",
    "slug": "merino-wool-jumper-28",
    "name": "Merino Wool Jumper",
    "category": "jumpers",
    "price": 4499,
    "image": "/images/real/jumpers/1.jpg",
    "fallbackImage": "/images/merino-wool-jumper-28.svg",
    "sizes": [
      "XS",
      "S",
      "M",
      "L",
      "XL"
    ],
    "description": "Cozy knit crafted for layering. Warm, breathable, and built to last through the season."
  },
  {
    "id": "p029",
    "slug": "cable-knit-jumper-29",
    "name": "Cable Knit Jumper",
    "category": "jumpers",
    "price": 4799,
    "image": "/images/real/jumpers/2.jpg",
    "fallbackImage": "/images/cable-knit-jumper-29.svg",
    "sizes": [
      "XS",
      "S",
      "M",
      "L",
      "XL"
    ],
    "description": "Cozy knit crafted for layering. Warm, breathable, and built to last through the season."
  },
  {
    "id": "p030",
    "slug": "crew-neck-jumper-30",
    "name": "Crew Neck Jumper",
    "category": "jumpers",
    "price": 4999,
    "image": "/images/real/jumpers/3.jpg",
    "fallbackImage": "/images/crew-neck-jumper-30.svg",
    "sizes": [
      "XS",
      "S",
      "M",
      "L",
      "XL"
    ],
    "description": "Cozy knit crafted for layering. Warm, breathable, and built to last through the season."
  },
  {
    "id": "p031",
    "slug": "v-neck-jumper-31",
    "name": "V-Neck Jumper",
    "category": "jumpers",
    "price": 5299,
    "image": "/images/real/jumpers/4.jpg",
    "fallbackImage": "/images/v-neck-jumper-31.svg",
    "sizes": [
      "XS",
      "S",
      "M",
      "L",
      "XL"
    ],
    "description": "Cozy knit crafted for layering. Warm, breathable, and built to last through the season."
  },
  {
    "id": "p032",
    "slug": "cotton-jumper-32",
    "name": "Cotton Jumper",
    "category": "jumpers",
    "price": 5499,
    "image": "/images/real/jumpers/5.jpg",
    "fallbackImage": "/images/cotton-jumper-32.svg",
    "sizes": [
      "XS",
      "S",
      "M",
      "L",
      "XL"
    ],
    "description": "Cozy knit crafted for layering. Warm, breathable, and built to last through the season."
  },
  {
    "id": "p033",
    "slug": "turtleneck-jumper-33",
    "name": "Turtleneck Jumper",
    "category": "jumpers",
    "price": 5799,
    "image": "/images/real/jumpers/1.jpg",
    "fallbackImage": "/images/turtleneck-jumper-33.svg",
    "sizes": [
      "XS",
      "S",
      "M",
      "L",
      "XL"
    ],
    "description": "Cozy knit crafted for layering. Warm, breathable, and built to last through the season."
  },
  {
    "id": "p034",
    "slug": "chunky-knit-jumper-34",
    "name": "Chunky Knit Jumper",
    "category": "jumpers",
    "price": 5999,
    "image": "/images/real/jumpers/2.jpg",
    "fallbackImage": "/images/chunky-knit-jumper-34.svg",
    "sizes": [
      "XS",
      "S",
      "M",
      "L",
      "XL"
    ],
    "description": "Cozy knit crafted for layering. Warm, breathable, and built to last through the season."
  },
  {
    "id": "p035",
    "slug": "fair-isle-jumper-35",
    "name": "Fair Isle Jumper",
    "category": "jumpers",
    "price": 6299,
    "image": "/images/real/jumpers/3.jpg",
    "fallbackImage": "/images/fair-isle-jumper-35.svg",
    "sizes": [
      "XS",
      "S",
      "M",
      "L",
      "XL"
    ],
    "description": "Cozy knit crafted for layering. Warm, breathable, and built to last through the season."
  },
  {
    "id": "p036",
    "slug": "lightweight-jumper-36",
    "name": "Lightweight Jumper",
    "category": "jumpers",
    "price": 6499,
    "image": "/images/real/jumpers/4.jpg",
    "fallbackImage": "/images/lightweight-jumper-36.svg",
    "sizes": [
      "XS",
      "S",
      "M",
      "L",
      "XL"
    ],
    "description": "Cozy knit crafted for layering. Warm, breathable, and built to last through the season."
  }
];

export const categories = ["t-shirts", "jeans", "hoodies", "jumpers"] as const;

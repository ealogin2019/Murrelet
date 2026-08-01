// Seed hero carousel: shown until an admin uploads/edits hero images at
// /admin, after which the live list comes from Vercel Blob.
export type HeroFocus = "top" | "center" | "bottom";

export type HeroSlide = {
  id: string;
  image: string;
  eyebrow?: string;
  heading?: string;
  subheading?: string;
  // Portrait photos get cropped into a wide banner (object-fit: cover) —
  // this controls which part stays in frame. Defaults to "top" since most
  // fashion model shots have the face/garment in the upper portion.
  focus?: HeroFocus;
};

export const seedHeroSlides: HeroSlide[] = [
  {
    id: "hero-linen",
    image: "/images/catalog/custom-fit-linen-shirt/light-blue/1.jpg",
    eyebrow: "Summer 26",
    heading: "Linen weather.",
    subheading:
      "Shirts, polos and cotton shorts cut for long lunches and longer evenings.",
    // Portrait source cropped into a wide banner — hold the upper body.
    focus: "top",
  },
];

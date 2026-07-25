// Seed hero carousel: shown until an admin uploads/edits hero images at
// /admin, after which the live list comes from Vercel Blob.
export type HeroSlide = {
  id: string;
  image: string;
  eyebrow?: string;
  heading?: string;
  subheading?: string;
};

export const seedHeroSlides: HeroSlide[] = [
  {
    id: "hero-1",
    image: "/images/hero/hero-1.png",
    eyebrow: "New season",
    heading: "Quiet essentials.",
    subheading: "Soft neutrals, considered fits, made to last.",
  },
  {
    id: "hero-2",
    image: "/images/hero/hero-2.png",
    eyebrow: "Hoodies & jumpers",
    heading: "Layer up.",
    subheading: "Heavyweight fleece and knit, built for cool days.",
  },
  {
    id: "hero-3",
    image: "/images/hero/hero-3.png",
    eyebrow: "Everyday denim",
    heading: "Fits that move with you.",
    subheading: "Considered denim, made for daily wear.",
  },
];

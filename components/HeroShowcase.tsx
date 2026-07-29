"use client";

import { useEffect, useState } from "react";
import { HeroSlide, seedHeroSlides } from "@/lib/hero";

/**
 * Full-bleed single image with the copy set over its lower third — the
 * reference's move, and the one that makes the photography do the work.
 * Slides beyond the first are ignored here by design; HeroCarousel is still
 * available if a rotating hero is wanted later.
 */
export default function HeroShowcase() {
  const [slides, setSlides] = useState<HeroSlide[]>(seedHeroSlides);

  useEffect(() => {
    fetch("/api/hero")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.slides) && data.slides.length > 0) {
          setSlides(data.slides);
        }
      })
      .catch(() => {
        // keep the seed slides on any fetch error
      });
  }, []);

  const slide = slides[0];
  if (!slide) return null;

  return (
    <section className="hero-full">
      <img
        className={`hero-full-image focus-${slide.focus || "top"}`}
        src={slide.image}
        alt={slide.heading || ""}
        // Always the largest above-the-fold asset — never lazy.
        loading="eager"
      />
      <div className="hero-full-scrim" />
      <div className="wrap hero-full-content">
        {slide.eyebrow && <p className="hero-eyebrow">{slide.eyebrow}</p>}
        {slide.heading && <h1>{slide.heading}</h1>}
        {slide.subheading && <p className="hero-full-sub">{slide.subheading}</p>}
      </div>
    </section>
  );
}

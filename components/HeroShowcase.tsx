"use client";

import { useEffect, useState } from "react";
import { HeroSlide, seedHeroSlides } from "@/lib/hero";

/**
 * Asymmetric split hero — copy on its own field, photo standing free beside
 * it. Deliberately not a gradient-scrim-over-full-bleed-photo: that pattern
 * is the single most common (and most dated-feeling) e-commerce hero, and it
 * also fights photography like this that doesn't need help reading through
 * a dark overlay.
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
      <div className="hero-copy">
        {slide.eyebrow && <p className="eyebrow">{slide.eyebrow}</p>}
        {slide.heading && <h1>{slide.heading}</h1>}
        {slide.subheading && <p className="hero-sub">{slide.subheading}</p>}
        <a className="hero-link" href="#new-arrivals">
          Shop the edit
          <svg width="14" height="14" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M4 10h12M11 5l5 5-5 5" />
          </svg>
        </a>
      </div>
      <div className="hero-photo">
        <img
          className={`focus-${slide.focus || "top"}`}
          src={slide.image}
          alt={slide.heading || ""}
          // Always the largest above-the-fold asset — never lazy.
          loading="eager"
        />
      </div>
    </section>
  );
}

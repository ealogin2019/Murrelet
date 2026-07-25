"use client";

import { useEffect, useState } from "react";
import { HeroSlide, seedHeroSlides } from "@/lib/hero";

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

  if (slides.length === 0) return null;

  const heading = slides[0];
  const images = slides.slice(0, 4);

  return (
    <section className="hero-static">
      <div className="wrap hero-static-text">
        {heading.eyebrow && <p className="hero-eyebrow">{heading.eyebrow}</p>}
        {heading.heading && <h1>{heading.heading}</h1>}
        {heading.subheading && <p>{heading.subheading}</p>}
      </div>

      <div className={`hero-grid hero-grid-${images.length}`}>
        {images.map((s) => (
          <div className="hero-grid-item" key={s.id}>
            <img src={s.image} alt={s.heading || ""} />
          </div>
        ))}
      </div>
    </section>
  );
}

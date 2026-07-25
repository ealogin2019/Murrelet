"use client";

import { useEffect, useRef, useState } from "react";
import { HeroSlide, seedHeroSlides } from "@/lib/hero";

const AUTO_ADVANCE_MS = 5500;

export default function HeroCarousel() {
  const [slides, setSlides] = useState<HeroSlide[]>(seedHeroSlides);
  const [active, setActive] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/hero")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.slides) && data.slides.length > 0) {
          setSlides(data.slides);
          setActive(0);
        }
      })
      .catch(() => {
        // keep the seed slides on any fetch error
      });
  }, []);

  useEffect(() => {
    if (slides.length <= 1) return;
    timerRef.current = setInterval(() => {
      setActive((i) => (i + 1) % slides.length);
    }, AUTO_ADVANCE_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [slides.length]);

  if (slides.length === 0) return null;

  const slide = slides[active] ?? slides[0];

  return (
    <section className="hero-carousel">
      {slides.map((s, i) => (
        <img
          key={s.id}
          src={s.image}
          alt={s.heading || ""}
          className={`hero-carousel-image ${i === active ? "is-active" : ""}`}
        />
      ))}
      <div className="hero-carousel-scrim" />
      <div className="hero-carousel-content wrap">
        {slide.eyebrow && <p className="hero-eyebrow">{slide.eyebrow}</p>}
        {slide.heading && <h1>{slide.heading}</h1>}
        {slide.subheading && <p className="hero-carousel-subheading">{slide.subheading}</p>}
      </div>
      {slides.length > 1 && (
        <div className="hero-carousel-dots">
          {slides.map((s, i) => (
            <button
              key={s.id}
              className={`hero-carousel-dot ${i === active ? "is-active" : ""}`}
              aria-label={`Show slide ${i + 1}`}
              onClick={() => setActive(i)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

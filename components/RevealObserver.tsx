"use client";

import { useEffect } from "react";

/**
 * Site-wide scroll-reveal. Any element carrying `data-reveal` fades and
 * rises into place the first time it enters the viewport; stagger within a
 * group comes from CSS delays (see the "Scroll reveal" section of
 * globals.css), not from JS timers.
 *
 * One observer for the whole app, mounted once from the root layout. A
 * MutationObserver picks up elements that mount later (client-side filter
 * re-renders, route changes), so components just write the attribute and
 * never talk to this directly.
 *
 * The hiding styles only apply under `html.reveal-ready`, which this sets on
 * mount — with JS disabled or before hydration nothing is ever hidden, so
 * content (and SEO) never depends on the effect running.
 */
export default function RevealObserver() {
  useEffect(() => {
    const root = document.documentElement;

    // Reduced motion: leave everything visible and skip the whole system.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    root.classList.add("reveal-ready");

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-revealed");
            io.unobserve(e.target);
          }
        }
      },
      // Fire slightly before the element's top clears the fold, so the rise
      // is underway as it arrives rather than starting late.
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
    );

    const seen = new WeakSet<Element>();
    function scan() {
      document.querySelectorAll("[data-reveal]:not(.is-revealed)").forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        io.observe(el);
      });
    }

    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });

    // A fast scroll can jump an element clean over the viewport between
    // frames — the observer never sees it intersect, and it would stay
    // invisible forever. Sweep on scroll for anything already above the
    // fold and reveal it immediately (it's offscreen, so no animation is
    // lost — it's simply there when the user scrolls back up).
    let sweeping = false;
    function sweep() {
      if (sweeping) return;
      sweeping = true;
      requestAnimationFrame(() => {
        sweeping = false;
        document
          .querySelectorAll("[data-reveal]:not(.is-revealed)")
          .forEach((el) => {
            if (el.getBoundingClientRect().bottom < 0) {
              el.classList.add("is-revealed");
              io.unobserve(el);
            }
          });
      });
    }
    window.addEventListener("scroll", sweep, { passive: true });

    return () => {
      io.disconnect();
      mo.disconnect();
      window.removeEventListener("scroll", sweep);
      root.classList.remove("reveal-ready");
    };
  }, []);

  return null;
}

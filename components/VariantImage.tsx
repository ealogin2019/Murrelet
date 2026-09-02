"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The garment image, with a colour change that either cuts or crossfades.
 *
 * Which one you want depends entirely on the photography. If every colour is
 * shot from a locked tripod with the model in exactly the same position, a
 * crossfade reads beautifully. If the pose drifts even slightly between
 * takes, a crossfade shows it as ghosting — two arms, two collars — and a
 * hard cut hides it completely. The reference short cuts, and its takes do
 * drift.
 *
 * So the duration is a single CSS variable, --colour-swap-ms. Set it to 0 for
 * a cut. Nothing else needs to change.
 *
 * Only two layers are ever in the DOM: the outgoing image and the incoming
 * one. Stacking every colour would preload the whole palette on a grid of
 * cards, which is megabytes for a page nobody has interacted with yet.
 */
export default function VariantImage({
  src,
  alt,
  colourLabel,
  showLabel = false,
  onNext,
  onPrev,
  eager = false,
}: {
  src: string;
  alt: string;
  colourLabel?: string;
  showLabel?: boolean;
  onNext?: () => void;
  onPrev?: () => void;
  eager?: boolean;
}) {
  const [outgoing, setOutgoing] = useState<string | null>(null);
  const [entering, setEntering] = useState(false);
  // The previous src is held in a ref, not state. Keying the effect on a value
  // the effect itself sets makes it re-run and tear down its own timers before
  // they fire — the fade never starts and the outgoing layer never clears.
  const shownRef = useRef(src);
  // The box itself, so the sweep timer can read the duration in force on it.
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (src === shownRef.current) return;
    setOutgoing(shownRef.current);
    shownRef.current = src;
    setEntering(true);

    // Next frame, so the browser paints the incoming layer at opacity 0 before
    // it is told to animate to 1. Without this the transition is skipped and
    // every change becomes a cut.
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setEntering(false)));

    // With --colour-swap-ms: 0 there is no transition, so transitionend never
    // fires and the outgoing layer would sit in the DOM forever. Clear it on a
    // timer too; whichever happens first wins.
    //
    // The timer reads the duration actually in force rather than assuming the
    // 140ms swatch default. The hero runs a 1100ms poster dissolve, and a
    // fixed 600ms guard pulled the outgoing poster at just over half opacity —
    // the ground showed through both layers and the swap flashed. Read from
    // the element so any future override is respected without touching this.
    let ms = 600;
    const el = boxRef.current;
    if (el) {
      const v = getComputedStyle(el).getPropertyValue("--colour-swap-ms").trim();
      const parsed = v.endsWith("ms")
        ? parseFloat(v)
        : v.endsWith("s")
          ? parseFloat(v) * 1000
          : NaN;
      if (!Number.isNaN(parsed)) ms = parsed + 260;
    }
    const sweep = setTimeout(() => setOutgoing(null), ms);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(sweep);
    };
  }, [src]);

  const current = src;

  // Swipe to change colour. Tracked with pointer events so it works for touch
  // and mouse drag alike.
  const startX = useRef<number | null>(null);
  const moved = useRef(0);

  function onPointerDown(e: React.PointerEvent) {
    if (!onNext && !onPrev) return;
    startX.current = e.clientX;
    moved.current = 0;
  }

  function onPointerMove(e: React.PointerEvent) {
    if (startX.current === null) return;
    moved.current = e.clientX - startX.current;
  }

  function onPointerUp() {
    if (startX.current === null) return;
    const dx = moved.current;
    startX.current = null;
    if (Math.abs(dx) < 45) return;
    if (dx < 0) onNext?.();
    else onPrev?.();
  }

  // A swipe that started on the image must not also count as a click on the
  // link wrapping it.
  function onClickCapture(e: React.MouseEvent) {
    if (Math.abs(moved.current) >= 45) {
      e.preventDefault();
      e.stopPropagation();
      moved.current = 0;
    }
  }

  return (
    <div
      ref={boxRef}
      className="variant-image"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (startX.current = null)}
      onClickCapture={onClickCapture}
    >
      {/* The outgoing image simply stays put at full opacity. The incoming one
          fades in on top of it, which is what makes a cross-dissolve — fading
          the old one out as well would expose the background through both and
          flash grey mid-swap. */}
      {outgoing && (
        <img className="variant-image-layer" src={outgoing} alt="" aria-hidden="true" />
      )}
      <img
        className={`variant-image-layer ${entering ? "is-entering" : ""}`}
        src={current}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        onTransitionEnd={() => setOutgoing(null)}
      />
      {showLabel && colourLabel && (
        <span className="variant-image-label" key={colourLabel}>
          {colourLabel}
        </span>
      )}
    </div>
  );
}

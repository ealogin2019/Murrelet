"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/lib/cart-context";
import { categories, categoryLabels } from "@/lib/catalog";

export default function Header() {
  const { itemCount } = useCart();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLElement>(null);

  // `inert` keeps the closed panel's links out of the tab order and away from
  // screen readers. React 18's types don't know the attribute, so it's set on
  // the node directly rather than as a prop.
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    if (open) el.removeAttribute("inert");
    else el.setAttribute("inert", "");
  }, [open]);

  // Close on route change, or the panel stays open over the new page.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    // Stop the page scrolling behind the panel.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (pathname?.startsWith("/admin")) return null;

  return (
    <>
      <header className="site-header">
        <div className="wrap header-row">
          <Link href="/" className="logo" aria-label="Murrelet — home">
            <img src="/brand/logo-wordmark.png" alt="Murrelet" />
          </Link>

          {/* Inline at desktop widths, where three short words fit next to
              the wordmark with room to spare — no drawer needed there. */}
          <nav className="dnav" aria-label="Categories">
            {/* Gender is one of two filters on /shop now, not its own
                section — linking straight there (skipping the /men redirect
                hop) pre-selects it, but there's no single pathname left to
                highlight as "active" the way there was when /men was its
                own page. */}
            {categories.map((c) => (
              <Link key={c} href={`/shop?category=${c}`}>
                {categoryLabels[c]}
              </Link>
            ))}
          </nav>

          <div className="header-actions">
            <Link href="/cart" className="icon-btn" aria-label={`Bag${itemCount ? `, ${itemCount} items` : ""}`}>
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M5.5 7h9l-.6 9.5a1 1 0 0 1-1 .9H7.1a1 1 0 0 1-1-.9L5.5 7Z" />
                <path d="M7.5 7V5.2a2.5 2.5 0 0 1 5 0V7" />
              </svg>
              {itemCount > 0 && <span className="badge">{itemCount}</span>}
            </Link>

            {/* Mobile-only: opens the drawer instead of the inline nav above. */}
            <button
              type="button"
              className="icon-btn menu-btn"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="nav-panel"
              onClick={() => setOpen((v) => !v)}
            >
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M3 6h14M3 10h14M3 14h14" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div
        className={`nav-scrim ${open ? "is-open" : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      <nav
        id="nav-panel"
        className={`nav-panel ${open ? "is-open" : ""}`}
        aria-label="Categories"
        ref={panelRef}
      >
        <div className="nav-panel-top">
          <img className="wordmark" src="/brand/logo-wordmark.png" alt="Murrelet" />
          <button
            type="button"
            className="nav-close"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          >
            ×
          </button>
        </div>

        <p className="eyebrow nav-panel-label">Shop</p>
        <ul className="nav-list">
          <li>
            <Link href="/shop">
              All<span className="chev" aria-hidden="true">›</span>
            </Link>
          </li>
          {categories.map((c) => (
            <li key={c}>
              <Link href={`/shop?category=${c}`}>
                {categoryLabels[c]}
                <span className="chev" aria-hidden="true">›</span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="nav-quick">
          <Link href="/shipping-returns">Shipping &amp; Returns</Link>
          <Link href="/contact">Contact</Link>
        </div>

        <div className="nav-panel-foot">
          <img src="/brand/logo-mark.png" alt="" aria-hidden="true" />
          <p className="eyebrow">Free standard delivery over £100</p>
        </div>
      </nav>
    </>
  );
}

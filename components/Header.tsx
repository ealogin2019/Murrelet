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
          <button
            type="button"
            className="menu-btn"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="nav-panel"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="menu-icon" aria-hidden="true">
              <span />
              <span />
            </span>
            <span className="menu-btn-label">Menu</span>
          </button>

          <Link href="/" className="logo" aria-label="Murrelet — home">
            <img src="/brand/logo-wordmark.png" alt="Murrelet" />
          </Link>

          {/* Centred on the row itself, so it stays optically centred no
              matter how wide the wordmark or the actions get. */}
          <Link href="/" className="header-mark" tabIndex={-1} aria-hidden="true">
            <img src="/brand/logo-mark.png" alt="" />
          </Link>

          <Link href="/cart" className="cart-link">
            Bag
            {itemCount > 0 && <span className="cart-count">{itemCount}</span>}
          </Link>
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
        <button
          type="button"
          className="nav-close"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        >
          ×
        </button>

        <p className="eyebrow nav-panel-label">Shop</p>
        <ul className="nav-list">
          <li>
            <Link href="/">All</Link>
          </li>
          {categories.map((c) => (
            <li key={c}>
              <Link href={`/?category=${c}`}>{categoryLabels[c]}</Link>
            </li>
          ))}
        </ul>

        <div className="nav-panel-foot">
          <img src="/brand/logo-mark.png" alt="" aria-hidden="true" />
          <p className="eyebrow">Free standard delivery over £100</p>
        </div>
      </nav>
    </>
  );
}

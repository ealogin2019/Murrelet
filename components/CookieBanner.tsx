"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "murrelet-cookie-consent";

/**
 * The site only sets what it needs to function — the cart, an admin
 * session, Stripe's own cookies during checkout — no analytics or ad
 * tracking today. The copy says exactly that rather than the generic
 * multi-category consent manager built for sites running trackers this one
 * doesn't have.
 */
export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="cookie-banner" role="region" aria-label="Cookie notice">
      <p>
        We use essential cookies to run your bag and keep you signed in where needed
        &mdash; no advertising or tracking cookies.{" "}
        <Link href="/privacy">Privacy Policy</Link>
      </p>
      <button type="button" className="cookie-accept" onClick={dismiss}>
        Got it
      </button>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;

  return (
    <footer className="site-footer">
      <div className="wrap footer-inner">
        {/* The mark lives here rather than in the header: its counters are
            fine enough to fill in below ~40px, and the footer can give it
            room. The header carries the wordmark instead. */}
        <img className="footer-mark" src="/brand/logo-mark.png" alt="" aria-hidden="true" />

        <nav className="footer-links" aria-label="Policies">
          <Link href="/about">About</Link>
          <Link href="/size-guide">Size Guide</Link>
          <Link href="/shipping-returns">Shipping &amp; Returns</Link>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms of Service</Link>
          <Link href="/contact">Contact</Link>
        </nav>

        <div className="footer-legal">
          <p>&copy; {new Date().getFullYear()} Murrelet. All rights reserved.</p>
          <p>Free standard delivery over £100 · Returns accepted within 14 days.</p>
        </div>
      </div>
    </footer>
  );
}

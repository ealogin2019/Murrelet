"use client";

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
        <div>
          <p>&copy; {new Date().getFullYear()} Murrelet. All rights reserved.</p>
          <p>Free standard delivery over £100 · Returns accepted within 14 days.</p>
        </div>
      </div>
    </footer>
  );
}

"use client";

import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;

  return (
    <footer className="site-footer">
      <div className="wrap">
        <p>&copy; {new Date().getFullYear()} Murrelet. All rights reserved.</p>
        <p>Free shipping on orders over $75 · Returns accepted within 30 days.</p>
      </div>
    </footer>
  );
}

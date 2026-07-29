"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart-context";

export default function Header() {
  const { itemCount } = useCart();
  const pathname = usePathname();

  if (pathname?.startsWith("/admin")) return null;

  return (
    <header className="site-header">
      <div className="wrap">
        <Link href="/" className="logo" aria-label="Murrelet — home">
          <img src="/brand/logo-wordmark.png" alt="Murrelet" />
        </Link>
        <nav className="nav">
          <Link href="/?category=shirts">Shirts</Link>
          <Link href="/?category=polo-shirts">Polo Shirts</Link>
          <Link href="/?category=shorts">Shorts</Link>
          <Link href="/cart" className="cart-link">
            Bag
            {itemCount > 0 && <span className="cart-count">{itemCount}</span>}
          </Link>
        </nav>
      </div>
    </header>
  );
}

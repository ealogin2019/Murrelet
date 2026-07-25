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
        <Link href="/" className="logo">
          Murrelet
        </Link>
        <nav className="nav">
          <Link href="/?category=t-shirts">T-Shirts</Link>
          <Link href="/?category=jeans">Jeans</Link>
          <Link href="/?category=hoodies">Hoodies</Link>
          <Link href="/?category=jumpers">Jumpers</Link>
          <Link href="/cart" className="cart-link">
            Cart
            {itemCount > 0 && <span className="cart-count">{itemCount}</span>}
          </Link>
        </nav>
      </div>
    </header>
  );
}

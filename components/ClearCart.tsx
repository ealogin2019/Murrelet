"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart-context";

/**
 * Empties the bag on mount. Rendered by the success page only once a real
 * order has been loaded, so a stray visit to /success cannot wipe someone's
 * cart.
 */
export default function ClearCart() {
  const { clearCart } = useCart();

  useEffect(() => {
    clearCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

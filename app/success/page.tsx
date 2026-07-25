"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart-context";

export default function SuccessPage() {
  const { clearCart } = useCart();

  useEffect(() => {
    clearCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="wrap status-page">
      <h1>Thank you for your order!</h1>
      <p>We&apos;ve received your payment and you&apos;ll get a confirmation email with tracking shortly.</p>
      <a href="/" className="btn" style={{ display: "inline-block", width: "auto" }}>
        Continue shopping
      </a>
    </div>
  );
}

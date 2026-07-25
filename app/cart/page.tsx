"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/format";

const FREE_SHIPPING_THRESHOLD = 7500; // cents

export default function CartPage() {
  const { items, updateQuantity, removeItem, subtotal } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shippingEstimate = items.length === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : 500;

  async function handleCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Checkout failed. Please try again.");
      }
      window.location.href = data.url;
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="wrap">
        <div className="empty-state">
          <h2>Your cart is empty</h2>
          <p>Browse the shop to find something you like.</p>
          <a href="/" className="btn" style={{ display: "inline-block", width: "auto" }}>
            Continue shopping
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap cart-page">
      <h1>Your Cart</h1>

      {items.map((item) => (
        <div className="cart-row" key={`${item.id}-${item.size}`}>
          <img
            src={item.image}
            alt={item.name}
            onError={(e) => {
              const img = e.currentTarget;
              if (img.src.indexOf(item.fallbackImage) === -1) {
                img.src = item.fallbackImage;
              }
            }}
          />
          <div>
            <p className="cart-row-name">{item.name}</p>
            <p className="cart-row-meta">Size: {item.size}</p>
            <p className="cart-row-meta">{formatPrice(item.price)}</p>
          </div>
          <div className="qty-control">
            <button onClick={() => updateQuantity(item.id, item.size, item.quantity - 1)}>
              −
            </button>
            <span>{item.quantity}</span>
            <button onClick={() => updateQuantity(item.id, item.size, item.quantity + 1)}>
              +
            </button>
          </div>
          <div>{formatPrice(item.price * item.quantity)}</div>
          <button className="remove-btn" onClick={() => removeItem(item.id, item.size)}>
            Remove
          </button>
        </div>
      ))}

      <div className="cart-summary">
        <div className="summary-row">
          <span>Subtotal</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <div className="summary-row">
          <span>Shipping</span>
          <span>{shippingEstimate === 0 ? "Free" : formatPrice(shippingEstimate)}</span>
        </div>
        <div className="summary-row total">
          <span>Estimated total</span>
          <span>{formatPrice(subtotal + shippingEstimate)}</span>
        </div>

        {error && <p style={{ color: "#c0392b", fontSize: "0.85rem", marginTop: 8 }}>{error}</p>}

        <button className="btn" style={{ marginTop: 16 }} onClick={handleCheckout} disabled={loading}>
          {loading ? "Redirecting to checkout…" : "Checkout"}
        </button>
        <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: 10, textAlign: "center" }}>
          Final shipping and tax calculated at checkout.
        </p>
      </div>
    </div>
  );
}

"use client";

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";

// A cart line is one SKU — a size within a colour. skuId is the only key;
// (product, size) is no longer unique now that colours exist.
export type CartItem = {
  skuId: string;
  slug: string;
  name: string;
  colour: string;
  size: string;
  price: number; // pence, resolved from the variant at add-to-bag time
  image: string;
  quantity: number;
};

type CartContextType = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (skuId: string) => void;
  updateQuantity: (skuId: string, quantity: number) => void;
  clearCart: () => void;
  subtotal: number;
  itemCount: number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);
// Bumped from "murrelet-cart": the old shape keyed on (id, size) and has no
// colour, so a stale cart would render blank colours and unresolvable SKUs.
// A new key drops those carts on the floor rather than half-reading them.
const STORAGE_KEY = "murrelet-cart-v2";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch (e) {
      // ignore corrupt cart data
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  function addItem(item: Omit<CartItem, "quantity">, quantity = 1) {
    setItems((prev) => {
      const existing = prev.find((i) => i.skuId === item.skuId);
      if (existing) {
        return prev.map((i) =>
          i.skuId === item.skuId ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [...prev, { ...item, quantity }];
    });
  }

  function removeItem(skuId: string) {
    setItems((prev) => prev.filter((i) => i.skuId !== skuId));
  }

  function updateQuantity(skuId: string, quantity: number) {
    if (quantity <= 0) {
      removeItem(skuId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.skuId === skuId ? { ...i, quantity } : i))
    );
  }

  function clearCart() {
    setItems([]);
  }

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items]
  );
  const itemCount = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items]
  );

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, subtotal, itemCount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

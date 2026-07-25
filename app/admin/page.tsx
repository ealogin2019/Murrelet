"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Product } from "@/lib/products";
import { HeroSlide } from "@/lib/hero";
import { formatPrice } from "@/lib/format";

const CATEGORIES = ["t-shirts", "jeans", "hoodies", "jumpers"] as const;

function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function newId() {
  return `p-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"products" | "hero">("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/products").then((r) => r.json()),
      fetch("/api/admin/hero").then((r) => r.json()),
    ])
      .then(([p, h]) => {
        setProducts(p.products || []);
        setSlides(h.slides || []);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  function updateProduct(id: string, patch: Partial<Product>) {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function addProduct() {
    const p: Product = {
      id: newId(),
      slug: slugify(`new-product-${Date.now()}`),
      name: "New product",
      category: "t-shirts",
      price: 0,
      image: "/images/fallback.svg",
      fallbackImage: "/images/fallback.svg",
      sizes: ["S", "M", "L"],
      description: "",
    };
    setProducts((prev) => [p, ...prev]);
  }

  function deleteProduct(id: string) {
    if (!confirm("Delete this product? This can't be undone once saved.")) return;
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }

  async function uploadFile(file: File, folder: string): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);
    const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed.");
    return data.url;
  }

  async function handleProductImage(id: string, file: File) {
    setError(null);
    try {
      const url = await uploadFile(file, "products");
      updateProduct(id, { image: url });
    } catch (err: any) {
      setError(err.message || "Upload failed.");
    }
  }

  async function saveProducts() {
    setSaving(true);
    setStatus(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed.");
      setStatus("Saved. Changes are live now.");
    } catch (err: any) {
      setError(err.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  function updateSlide(id: string, patch: Partial<HeroSlide>) {
    setSlides((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function addSlide() {
    const s: HeroSlide = {
      id: `hero-${Date.now()}`,
      image: "/images/fallback.svg",
      eyebrow: "",
      heading: "",
      subheading: "",
    };
    setSlides((prev) => [...prev, s]);
  }

  function deleteSlide(id: string) {
    if (!confirm("Remove this carousel slide?")) return;
    setSlides((prev) => prev.filter((s) => s.id !== id));
  }

  function moveSlide(id: string, dir: -1 | 1) {
    setSlides((prev) => {
      const i = prev.findIndex((s) => s.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function handleSlideImage(id: string, file: File) {
    setError(null);
    try {
      const url = await uploadFile(file, "hero");
      updateSlide(id, { image: url });
    } catch (err: any) {
      setError(err.message || "Upload failed.");
    }
  }

  async function saveHero() {
    setSaving(true);
    setStatus(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/hero", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slides }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed.");
      setStatus("Saved. Changes are live now.");
    } catch (err: any) {
      setError(err.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="wrap" style={{ paddingTop: 60 }}>
        Loading…
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-topbar">
        <div className="wrap admin-topbar-inner">
          <span className="logo">Murrelet Admin</span>
          <div className="admin-tabs">
            <button
              className={`admin-tab ${tab === "products" ? "is-active" : ""}`}
              onClick={() => setTab("products")}
            >
              Products ({products.length})
            </button>
            <button
              className={`admin-tab ${tab === "hero" ? "is-active" : ""}`}
              onClick={() => setTab("hero")}
            >
              Homepage carousel ({slides.length})
            </button>
          </div>
          <button className="admin-logout" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </div>

      <div className="wrap admin-content">
        {(status || error) && (
          <div className={`admin-banner ${error ? "is-error" : "is-ok"}`}>
            {error || status}
          </div>
        )}

        {tab === "products" && (
          <>
            <div className="admin-actions">
              <button className="admin-btn" onClick={addProduct}>
                + Add product
              </button>
              <button className="admin-btn admin-btn-primary" onClick={saveProducts} disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>

            <div className="admin-table">
              {products.map((p) => (
                <div className="admin-row" key={p.id}>
                  <label className="admin-thumb">
                    <img
                      src={p.image}
                      alt=""
                      onError={(e) => {
                        e.currentTarget.src = p.fallbackImage || "/images/fallback.svg";
                      }}
                    />
                    <span>Change</span>
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleProductImage(p.id, file);
                      }}
                    />
                  </label>

                  <div className="admin-fields">
                    <input
                      className="admin-input"
                      value={p.name}
                      onChange={(e) => updateProduct(p.id, { name: e.target.value })}
                      placeholder="Product name"
                    />
                    <div className="admin-fields-row">
                      <select
                        className="admin-input"
                        value={p.category}
                        onChange={(e) =>
                          updateProduct(p.id, { category: e.target.value as Product["category"] })
                        }
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      <input
                        className="admin-input"
                        type="number"
                        step="0.01"
                        value={(p.price / 100).toFixed(2)}
                        onChange={(e) =>
                          updateProduct(p.id, {
                            price: Math.round(parseFloat(e.target.value || "0") * 100),
                          })
                        }
                        placeholder="Price"
                      />
                      <input
                        className="admin-input"
                        value={p.sizes.join(", ")}
                        onChange={(e) =>
                          updateProduct(p.id, {
                            sizes: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                          })
                        }
                        placeholder="Sizes (comma separated)"
                      />
                    </div>
                    <textarea
                      className="admin-input"
                      rows={2}
                      value={p.description}
                      onChange={(e) => updateProduct(p.id, { description: e.target.value })}
                      placeholder="Description"
                    />
                    <p className="admin-price-preview">{formatPrice(p.price)}</p>
                  </div>

                  <button className="admin-delete" onClick={() => deleteProduct(p.id)}>
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "hero" && (
          <>
            <div className="admin-actions">
              <button className="admin-btn" onClick={addSlide}>
                + Add slide
              </button>
              <button className="admin-btn admin-btn-primary" onClick={saveHero} disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>

            <div className="admin-table">
              {slides.map((s, i) => (
                <div className="admin-row" key={s.id}>
                  <label className="admin-thumb admin-thumb-wide">
                    <img src={s.image} alt="" />
                    <span>Change</span>
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleSlideImage(s.id, file);
                      }}
                    />
                  </label>

                  <div className="admin-fields">
                    <input
                      className="admin-input"
                      value={s.eyebrow || ""}
                      onChange={(e) => updateSlide(s.id, { eyebrow: e.target.value })}
                      placeholder="Eyebrow (small label above heading)"
                    />
                    <input
                      className="admin-input"
                      value={s.heading || ""}
                      onChange={(e) => updateSlide(s.id, { heading: e.target.value })}
                      placeholder="Heading"
                    />
                    <input
                      className="admin-input"
                      value={s.subheading || ""}
                      onChange={(e) => updateSlide(s.id, { subheading: e.target.value })}
                      placeholder="Subheading"
                    />
                  </div>

                  <div className="admin-slide-actions">
                    <button className="admin-move" onClick={() => moveSlide(s.id, -1)} disabled={i === 0}>
                      ↑
                    </button>
                    <button
                      className="admin-move"
                      onClick={() => moveSlide(s.id, 1)}
                      disabled={i === slides.length - 1}
                    >
                      ↓
                    </button>
                    <button className="admin-delete" onClick={() => deleteSlide(s.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

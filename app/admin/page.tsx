"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Product, Variant, categories, categoryLabels } from "@/lib/catalog";
import { HeroSlide } from "@/lib/hero";
import { formatPrice } from "@/lib/format";

const CATEGORIES = categories;
const DEFAULT_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

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

  function updateVariant(productId: string, variantId: string, patch: Partial<Variant>) {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? {
              ...p,
              variants: p.variants.map((v) =>
                v.id === variantId ? { ...v, ...patch } : v
              ),
            }
          : p
      )
    );
  }

  function newVariant(productId: string, colour = "New colour"): Variant {
    const id = `${productId}-${slugify(colour)}-${Math.floor(Math.random() * 1000)}`;
    return {
      id,
      colour,
      swatch: "#cccccc",
      price: null,
      images: [],
      // Every colour needs a size run — the API rejects a variant with none.
      skus: DEFAULT_SIZES.map((size) => ({
        id: `${id}-${size.toLowerCase()}`,
        size,
        inStock: true,
        stock: null,
      })),
    };
  }

  function addVariant(productId: string) {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, variants: [...p.variants, newVariant(productId)] } : p
      )
    );
  }

  function deleteVariant(productId: string, variantId: string) {
    const product = products.find((p) => p.id === productId);
    // A product with no colours has nothing to render or sell, and the API
    // refuses to save it — block it here so the error is understandable.
    if (product && product.variants.length <= 1) {
      setError("A product needs at least one colour. Delete the product instead.");
      return;
    }
    if (!confirm("Delete this colour? This can't be undone once saved.")) return;
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? { ...p, variants: p.variants.filter((v) => v.id !== variantId) }
          : p
      )
    );
  }

  function addProduct() {
    const id = newId();
    const p: Product = {
      id,
      slug: slugify(`new-product-${Date.now()}`),
      name: "New product",
      category: "shirts",
      price: 0,
      description: "",
      details: [],
      badges: [],
      variants: [newVariant(id, "Default")],
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

  async function handleVariantImage(productId: string, variantId: string, file: File) {
    setError(null);
    try {
      const url = await uploadFile(file, "products");
      // Photography belongs to a colour, not a product — replace the first
      // image of this variant and leave any others alone.
      const product = products.find((p) => p.id === productId);
      const variant = product?.variants.find((v) => v.id === variantId);
      const rest = variant ? variant.images.slice(1) : [];
      updateVariant(productId, variantId, { images: [url, ...rest] });
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
                  <div className="admin-thumb admin-thumb-static">
                    <img
                      src={p.variants[0]?.images[0] || "/images/fallback.svg"}
                      alt=""
                      onError={(e) => {
                        e.currentTarget.src = "/images/fallback.svg";
                      }}
                    />
                  </div>

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
                            {categoryLabels[c]}
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
                        value={p.badges.join(", ")}
                        onChange={(e) =>
                          updateProduct(p.id, {
                            badges: e.target.value
                              .split(",")
                              .map((s) => s.trim().toUpperCase())
                              .filter(Boolean),
                          })
                        }
                        placeholder="Badges (comma separated)"
                      />
                    </div>
                    <textarea
                      className="admin-input"
                      rows={2}
                      value={p.description}
                      onChange={(e) => updateProduct(p.id, { description: e.target.value })}
                      placeholder="Description"
                    />
                    <p className="admin-price-preview">
                      List price {formatPrice(p.price)}
                    </p>

                    <div className="admin-variants">
                      <p className="admin-variants-label">
                        Colours — leave a price blank to use the list price
                      </p>
                      {p.variants.map((v) => (
                        <div className="admin-variant" key={v.id}>
                          <label className="admin-swatch-thumb">
                            <img
                              src={v.images[0] || "/images/fallback.svg"}
                              alt=""
                              onError={(e) => {
                                e.currentTarget.src = "/images/fallback.svg";
                              }}
                            />
                            <span>Change</span>
                            <input
                              type="file"
                              accept="image/*"
                              hidden
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleVariantImage(p.id, v.id, file);
                              }}
                            />
                          </label>
                          <input
                            className="admin-input"
                            value={v.colour}
                            onChange={(e) =>
                              updateVariant(p.id, v.id, { colour: e.target.value })
                            }
                            placeholder="Colour name"
                          />
                          <input
                            className="admin-input admin-input-swatch"
                            type="color"
                            value={v.swatch}
                            onChange={(e) =>
                              updateVariant(p.id, v.id, { swatch: e.target.value })
                            }
                            aria-label={`${v.colour} swatch colour`}
                          />
                          <input
                            className="admin-input"
                            type="number"
                            step="0.01"
                            value={v.price == null ? "" : (v.price / 100).toFixed(2)}
                            onChange={(e) => {
                              const raw = e.target.value;
                              updateVariant(p.id, v.id, {
                                // Empty means "inherit", which is null — not 0.
                                price: raw === "" ? null : Math.round(parseFloat(raw) * 100),
                              });
                            }}
                            placeholder="Override"
                          />
                          <button
                            className="admin-delete"
                            onClick={() => deleteVariant(p.id, v.id)}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <button className="admin-btn" onClick={() => addVariant(p.id)}>
                        + Add colour
                      </button>
                    </div>
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
                    <select
                      className="admin-input"
                      value={s.focus || "top"}
                      onChange={(e) => updateSlide(s.id, { focus: e.target.value as HeroSlide["focus"] })}
                    >
                      <option value="top">Image focus: Top (faces, portrait photos)</option>
                      <option value="center">Image focus: Center</option>
                      <option value="bottom">Image focus: Bottom</option>
                    </select>
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

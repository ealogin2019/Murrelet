"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Product,
  Variant,
  Sku,
  categories,
  categoryLabels,
  productTypes,
  productTypeLabels,
  swatchPalette,
} from "@/lib/catalog";
import { HeroSlide } from "@/lib/hero";
import { formatPrice } from "@/lib/format";

const CATEGORIES = categories;
const PRODUCT_TYPES = productTypes;
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

  function newVariant(productId: string, sizes: string[], colour = swatchPalette[0].name): Variant {
    const id = `${productId}-${slugify(colour)}-${Math.floor(Math.random() * 1000)}`;
    const swatch = swatchPalette.find((s) => s.name === colour)?.hex ?? swatchPalette[0].hex;
    return {
      id,
      colour,
      swatch,
      price: null,
      images: [],
      // Every colour needs a size run — the API rejects a variant with none.
      // Sizes are inherited from the product's existing colours (or the
      // XS-XXL default for a brand new one) rather than a fixed list, so a
      // Kids product's age-based run isn't silently overwritten when a
      // second colour is added.
      skus: sizes.map((size) => ({
        id: `${id}-${slugify(size)}`,
        size,
        inStock: true,
        stock: null,
      })),
    };
  }

  /** The size run shared by a product's existing colours, or the default for a new one. */
  function currentSizes(product: Product): string[] {
    return product.variants[0]?.skus.map((s) => s.size) ?? DEFAULT_SIZES;
  }

  function addVariant(productId: string) {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? { ...p, variants: [...p.variants, newVariant(productId, currentSizes(p))] }
          : p
      )
    );
  }

  /**
   * Rebuilds every colour's size run to match a new comma-separated list.
   * Sizes that still exist keep their sku id and in-stock state; new ones are
   * added in-stock. This is what makes the "Sizes" field apply to the whole
   * product at once instead of one colour at a time.
   */
  function updateProductSizes(productId: string, raw: string) {
    const sizes = raw.split(",").map((s) => s.trim()).filter(Boolean);
    if (sizes.length === 0) return;
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        return {
          ...p,
          variants: p.variants.map((v) => {
            const bySize = new Map(v.skus.map((s) => [s.size, s]));
            const skus: Sku[] = sizes.map((size) => {
              const existing = bySize.get(size);
              if (existing) return existing;
              return { id: `${v.id}-${slugify(size)}`, size, inStock: true, stock: null };
            });
            return { ...v, skus };
          }),
        };
      })
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
      category: "men",
      type: null,
      price: 0,
      description: "",
      details: [],
      badges: [],
      variants: [newVariant(id, DEFAULT_SIZES)],
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

  // Both go through the functional setProducts form, reading prior state at
  // apply-time rather than from a closed-over `products` snapshot — several
  // photos can upload concurrently and must not clobber one another
  // regardless of which network request finishes first.
  function appendVariantImage(productId: string, variantId: string, url: string) {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? {
              ...p,
              variants: p.variants.map((v) =>
                v.id === variantId ? { ...v, images: [...v.images, url] } : v
              ),
            }
          : p
      )
    );
  }

  function removeVariantImage(productId: string, variantId: string, index: number) {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? {
              ...p,
              variants: p.variants.map((v) =>
                v.id === variantId
                  ? { ...v, images: v.images.filter((_, i) => i !== index) }
                  : v
              ),
            }
          : p
      )
    );
  }

  async function handleVariantImageAdd(productId: string, variantId: string, file: File) {
    setError(null);
    try {
      const url = await uploadFile(file, "products");
      appendVariantImage(productId, variantId, url);
    } catch (err: any) {
      setError(err.message || "Upload failed.");
    }
  }

  async function saveProducts() {
    setStatus(null);
    setError(null);

    // Mirror the server's photo check before spending a round trip on it.
    // "Save changes" saves every product in one request — a single colour
    // missing a photo used to fail that whole batch with only a banner as
    // the signal, which could silently drop edits made to OTHER products in
    // the same pass. Catching it here means the failure points at the exact
    // row instead of a generic error, and never reaches the network with
    // nothing to show for it.
    for (const p of products) {
      const bareVariant = p.variants.find((v) => v.images.length === 0);
      if (bareVariant) {
        setError(
          `"${bareVariant.colour}" on "${p.name}" has no photo yet — add one before saving. Nothing was saved, including any other changes in this batch.`
        );
        const row = document.getElementById(`variant-${bareVariant.id}`);
        row?.scrollIntoView({ behavior: "smooth", block: "center" });
        row?.classList.add("admin-variant-flash");
        setTimeout(() => row?.classList.remove("admin-variant-flash"), 1600);
        return;
      }
    }

    setSaving(true);
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
                    <div className="admin-slug-row">
                      <span className="admin-slug-prefix">/product/</span>
                      <input
                        className="admin-input"
                        key={`${p.id}-slug-${p.slug}`}
                        defaultValue={p.slug}
                        onBlur={(e) => {
                          const next = slugify(e.target.value);
                          if (next) updateProduct(p.id, { slug: next });
                        }}
                        placeholder="url-slug"
                        aria-label="URL slug"
                      />
                      <button
                        type="button"
                        className="admin-slug-regen"
                        title="Set the URL from the product name"
                        onClick={() => {
                          const next = slugify(p.name);
                          if (next) updateProduct(p.id, { slug: next });
                        }}
                      >
                        ↻ from name
                      </button>
                    </div>
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
                      <select
                        className="admin-input"
                        value={p.type ?? ""}
                        onChange={(e) =>
                          updateProduct(p.id, {
                            type: (e.target.value || null) as Product["type"],
                          })
                        }
                      >
                        <option value="">Type &mdash; not set</option>
                        {PRODUCT_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {productTypeLabels[t]}
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
                      <input
                        className="admin-input"
                        key={`${p.id}-sizes-${p.variants[0]?.skus.length}`}
                        defaultValue={currentSizes(p).join(", ")}
                        onBlur={(e) => updateProductSizes(p.id, e.target.value)}
                        placeholder="Sizes, e.g. XS, S, M, L or 2-3Y, 4-5Y, 6-7Y"
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
                        <div className="admin-variant" key={v.id} id={`variant-${v.id}`}>
                          <div className="admin-variant-row">
                            <select
                              className="admin-input"
                              value={v.colour}
                              onChange={(e) => {
                                const swatch = swatchPalette.find((s) => s.name === e.target.value);
                                if (swatch) {
                                  updateVariant(p.id, v.id, { colour: swatch.name, swatch: swatch.hex });
                                }
                              }}
                              aria-label="Colour"
                            >
                              {swatchPalette.map((s) => (
                                <option key={s.name} value={s.name}>
                                  {s.name}
                                </option>
                              ))}
                            </select>
                            <span
                              className="admin-swatch-preview"
                              style={{ background: v.swatch }}
                              aria-hidden="true"
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

                          <div className="admin-image-strip">
                            {v.images.map((img, i) => (
                              <div className="admin-image-thumb" key={img + i}>
                                <img
                                  src={img}
                                  alt=""
                                  onError={(e) => {
                                    e.currentTarget.src = "/images/fallback.svg";
                                  }}
                                />
                                <button
                                  type="button"
                                  className="admin-image-remove"
                                  aria-label={`Remove photo ${i + 1} of ${v.colour}`}
                                  onClick={() => removeVariantImage(p.id, v.id, i)}
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                            <label className="admin-image-add">
                              +
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                hidden
                                onChange={(e) => {
                                  const files = Array.from(e.target.files ?? []);
                                  files.forEach((file) => handleVariantImageAdd(p.id, v.id, file));
                                  e.target.value = "";
                                }}
                              />
                            </label>
                            {v.images.length === 0 && (
                              <span className="admin-no-photo">No photo yet — saving is blocked until this colour has one</span>
                            )}
                          </div>
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

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Product,
  Variant,
  Sku,
  categories,
  categoryLabels,
  productTypes,
  productTypeLabels,
  colourOptions,
} from "@/lib/catalog";
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

type Toast = { id: number; kind: "ok" | "error"; text: string };

export default function AdminPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  /** Which products are expanded. Collapsed is the default: the page is a
   *  list of products first and an editor second, and nine colourways of six
   *  sizes each is several screens of fields nobody asked to see. */
  const [open, setOpen] = useState<Set<string>>(new Set());
  /** Edits made since the last successful save. Drives the save button's
   *  state and the leave-the-page warning. */
  const [dirty, setDirty] = useState(false);
  /** The catalogue version this page loaded. Sent back with every save so the
   *  server can refuse to overwrite a catalogue that has moved on -- see
   *  catalogVersion in lib/catalog-store. */
  const [version, setVersion] = useState<string | null>(null);
  /** Set when a save was refused for that reason. The only way out is a
   *  reload; edits made against a stale catalogue cannot be merged here. */
  const [stale, setStale] = useState(false);

  const toastSeq = useRef(0);

  const toast = useCallback((kind: Toast["kind"], text: string) => {
    const id = ++toastSeq.current;
    setToasts((prev) => [...prev, { id, kind, text }]);
    // Successes announce themselves and leave. Errors stay until dismissed --
    // a failed save that vanishes after four seconds is a failed save nobody
    // reads.
    if (kind === "ok") {
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
    }
  }, []);

  const dismissToast = (id: number) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  const load = useCallback(() => {
    setLoading(true);
    return fetch("/api/admin/products")
      .then((r) => r.json())
      .then((p) => {
        setProducts(p.products || []);
        setVersion(p.version ?? null);
        setDirty(false);
        setStale(false);
      })
      .catch(() => toast("error", "Could not load the catalogue."))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  function reload() {
    if (dirty && !confirm("Reload the catalogue? Your unsaved edits will be lost.")) return;
    load();
  }

  // Closing the tab mid-edit loses everything -- nothing here autosaves.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function handleLogout() {
    if (dirty && !confirm("You have unsaved changes. Log out anyway?")) return;
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  /** Every mutation goes through here, so `dirty` cannot drift from reality. */
  function edit(fn: (prev: Product[]) => Product[]) {
    setProducts(fn);
    setDirty(true);
  }

  function toggleOpen(id: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function updateProduct(id: string, patch: Partial<Product>) {
    edit((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function updateVariant(productId: string, variantId: string, patch: Partial<Variant>) {
    edit((prev) =>
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

  function newVariant(
    productId: string,
    sizes: string[],
    colour = colourOptions[0].name
  ): Variant {
    const id = `${productId}-${slugify(colour)}-${Math.floor(Math.random() * 1000)}`;
    const standard = colourOptions.find((c) => c.name === colour);
    return {
      id,
      colour,
      swatch: standard?.hex ?? "#CCCCCC",
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
    edit((prev) =>
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
    edit((prev) =>
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
      toast("error", "A product needs at least one colour. Delete the product instead.");
      return;
    }
    if (!confirm("Delete this colour? This can't be undone once saved.")) return;
    edit((prev) =>
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
    edit((prev) => [p, ...prev]);
    setOpen((prev) => new Set(prev).add(id));
  }

  function deleteProduct(id: string) {
    if (!confirm("Delete this product? This can't be undone once saved.")) return;
    edit((prev) => prev.filter((p) => p.id !== id));
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
    edit((prev) =>
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
    edit((prev) =>
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

  /**
   * The product's card photo, set from any image under it in one click.
   *
   * There is no `thumbnail` column, and adding one would put the same fact in
   * two places. The storefront already has a rule: a card shows the FIRST
   * image of the FIRST colour. So this moves the chosen photo to the front of
   * its colour and that colour to the front of the product, which makes the
   * rule produce the requested picture. The PDP opens on that colour too,
   * which is what "the thumbnail" means to a customer anyway.
   */
  function makeThumbnail(productId: string, variantId: string, index: number) {
    edit((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        const variants = p.variants.map((v) => {
          if (v.id !== variantId || index === 0) return v;
          const images = [...v.images];
          const [picked] = images.splice(index, 1);
          return { ...v, images: [picked, ...images] };
        });
        const i = variants.findIndex((v) => v.id === variantId);
        if (i > 0) {
          const [lead] = variants.splice(i, 1);
          variants.unshift(lead);
        }
        return { ...p, variants };
      })
    );
  }

  const isThumbnail = (p: Product, v: Variant, i: number) =>
    p.variants[0]?.id === v.id && i === 0;

  async function handleVariantImageAdd(productId: string, variantId: string, file: File) {
    try {
      const url = await uploadFile(file, "products");
      appendVariantImage(productId, variantId, url);
    } catch (err: any) {
      toast("error", err.message || "Upload failed.");
    }
  }

  async function saveProducts() {
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
        toast(
          "error",
          `"${bareVariant.colour}" on "${p.name}" has no photo yet — add one before saving. Nothing was saved, including any other changes in this batch.`
        );
        // Expand the product first, or the row being pointed at is inside a
        // collapsed card and the scroll lands on nothing.
        setOpen((prev) => new Set(prev).add(p.id));
        setTimeout(() => {
          const row = document.getElementById(`variant-${bareVariant.id}`);
          row?.scrollIntoView({ behavior: "smooth", block: "center" });
          row?.classList.add("admin-variant-flash");
          setTimeout(() => row?.classList.remove("admin-variant-flash"), 1600);
        }, 60);
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products, baseVersion: version }),
      });
      const data = await res.json();
      if (res.status === 409) {
        setStale(true);
        throw new Error(data.error);
      }
      if (!res.ok) throw new Error(data.error || "Save failed.");
      setVersion(data.version ?? version);
      setDirty(false);
      toast("ok", "Saved. Changes are live now.");
    } catch (err: any) {
      toast("error", err.message || "Save failed.");
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

  const colourCount = products.reduce((n, p) => n + p.variants.length, 0);
  const skuCount = products.reduce(
    (n, p) => n + p.variants.reduce((m, v) => m + v.skus.length, 0),
    0
  );

  return (
    <div className="admin-page">
      <div className="admin-topbar">
        <div className="wrap admin-topbar-inner">
          <span className="logo">Murrelet Admin</span>
          <p className="admin-count">
            {products.length} products · {colourCount} colours · {skuCount} SKUs
          </p>
          <button className="admin-logout" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </div>

      <div className="admin-actionbar">
        <div className="wrap admin-actionbar-inner">
          <div className="admin-actionbar-left">
            <button className="admin-btn" onClick={addProduct}>
              + Add product
            </button>
            <button
              className="admin-btn admin-btn-quiet"
              onClick={() =>
                setOpen((prev) =>
                  prev.size === products.length ? new Set() : new Set(products.map((p) => p.id))
                )
              }
            >
              {open.size === products.length ? "Collapse all" : "Expand all"}
            </button>
          </div>
          <div className="admin-actionbar-right">
            {stale ? (
              <>
                <span className="admin-dirty is-stale">Catalogue changed elsewhere</span>
                <button className="admin-btn admin-btn-primary" onClick={reload}>
                  Reload catalogue
                </button>
              </>
            ) : (
              <>
                <span className={`admin-dirty ${dirty ? "is-on" : ""}`}>
                  {dirty ? "Unsaved changes" : "All changes saved"}
                </span>
                <button
                  className="admin-btn admin-btn-primary"
                  onClick={saveProducts}
                  disabled={saving || !dirty}
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="wrap admin-content">
        <div className="admin-table">
          {products.map((p) => {
            const expanded = open.has(p.id);
            return (
              <div className={`admin-card ${expanded ? "is-open" : ""}`} key={p.id}>
                <div className="admin-card-head">
                  <button
                    type="button"
                    className="admin-disclose"
                    onClick={() => toggleOpen(p.id)}
                    aria-expanded={expanded}
                    aria-label={expanded ? `Collapse ${p.name}` : `Edit ${p.name}`}
                  >
                    {expanded ? "▾" : "▸"}
                  </button>

                  <div className="admin-thumb admin-thumb-static">
                    <img
                      src={p.variants[0]?.images[0] || "/images/fallback.svg"}
                      alt=""
                      onError={(e) => {
                        e.currentTarget.src = "/images/fallback.svg";
                      }}
                    />
                  </div>

                  <div className="admin-card-summary">
                    <h2>{p.name}</h2>
                    <p>
                      <code>/product/{p.slug}</code>
                      <span>{p.type ? productTypeLabels[p.type] : "No type"}</span>
                      <span>{formatPrice(p.price)}</span>
                      <span>{p.variants.length} colours</span>
                    </p>
                    <div className="admin-chip-row">
                      {p.variants.map((v) => (
                        <span
                          key={v.id}
                          className="admin-chip"
                          title={v.colour}
                          style={{ background: v.swatch }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="admin-card-head-actions">
                    <button className="admin-btn admin-btn-quiet" onClick={() => toggleOpen(p.id)}>
                      {expanded ? "Done" : "Edit"}
                    </button>
                    <button className="admin-delete" onClick={() => deleteProduct(p.id)}>
                      Delete
                    </button>
                  </div>
                </div>

                {expanded && (
                  <div className="admin-card-body">
                    <section className="admin-section">
                      <h3 className="admin-section-title">Details</h3>
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

                      <div className="admin-field-grid">
                        <label className="admin-field">
                          <span>Category</span>
                          <select
                            className="admin-input"
                            value={p.category}
                            onChange={(e) =>
                              updateProduct(p.id, {
                                category: e.target.value as Product["category"],
                              })
                            }
                          >
                            {CATEGORIES.map((c) => (
                              <option key={c} value={c}>
                                {categoryLabels[c]}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="admin-field">
                          <span>Type</span>
                          <select
                            className="admin-input"
                            value={p.type ?? ""}
                            onChange={(e) =>
                              updateProduct(p.id, {
                                type: (e.target.value || null) as Product["type"],
                              })
                            }
                          >
                            <option value="">Not set</option>
                            {PRODUCT_TYPES.map((t) => (
                              <option key={t} value={t}>
                                {productTypeLabels[t]}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="admin-field">
                          <span>List price (£)</span>
                          <input
                            className="admin-input"
                            type="number"
                            step="0.01"
                            min="0"
                            inputMode="decimal"
                            key={`${p.id}-price-${p.price}`}
                            defaultValue={(p.price / 100).toFixed(2)}
                            onBlur={(e) => {
                              const pence = Math.round(parseFloat(e.target.value || "0") * 100);
                              if (!Number.isNaN(pence) && pence !== p.price) {
                                updateProduct(p.id, { price: Math.max(0, pence) });
                              }
                            }}
                          />
                        </label>
                        <label className="admin-field">
                          <span>Badges</span>
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
                            placeholder="NEW ARRIVAL, BESTSELLER"
                          />
                        </label>
                        <label className="admin-field admin-field-wide">
                          <span>Sizes — applies to every colour</span>
                          <input
                            className="admin-input"
                            key={`${p.id}-sizes-${p.variants[0]?.skus.length}`}
                            defaultValue={currentSizes(p).join(", ")}
                            onBlur={(e) => updateProductSizes(p.id, e.target.value)}
                            placeholder="XS, S, M, L, XL, XXL"
                          />
                        </label>
                      </div>

                      <label className="admin-field">
                        <span>Description</span>
                        <textarea
                          className="admin-input"
                          rows={3}
                          value={p.description}
                          onChange={(e) => updateProduct(p.id, { description: e.target.value })}
                        />
                      </label>
                      <label className="admin-field">
                        <span>Details — one per line, shown as the bullet list under the description</span>
                        <textarea
                          className="admin-input"
                          rows={Math.max(4, p.details.length + 1)}
                          // Committed on blur, not per keystroke: splitting on
                          // newline while typing would drop the line being
                          // written the moment it is still empty.
                          key={`${p.id}-details-${p.details.join("|")}`}
                          defaultValue={p.details.join("\n")}
                          onBlur={(e) => {
                            const details = e.target.value
                              .split("\n")
                              .map((l) => l.trim())
                              .filter(Boolean);
                            if (details.join("|") !== p.details.join("|")) {
                              updateProduct(p.id, { details });
                            }
                          }}
                          placeholder={"100% organic cotton, 180gsm\nRegular fit\nMachine wash at 30°C"}
                        />
                      </label>
                    </section>

                    <section className="admin-section">
                      <h3 className="admin-section-title">
                        Colours
                        <span className="admin-section-hint">
                          Leave a price blank to use the list price. Tick a photo to make it the
                          product&rsquo;s card image.
                        </span>
                      </h3>

                      {p.variants.map((v) => {
                        const known = colourOptions.some((c) => c.name === v.colour);
                        return (
                          <div className="admin-variant" key={v.id} id={`variant-${v.id}`}>
                            <div className="admin-variant-row">
                              <span
                                className="admin-swatch-preview"
                                style={{ background: v.swatch }}
                                aria-hidden="true"
                              />
                              <select
                                className="admin-input"
                                value={v.colour}
                                onChange={(e) => {
                                  const picked = colourOptions.find(
                                    (c) => c.name === e.target.value
                                  );
                                  if (!picked) return;
                                  updateVariant(p.id, v.id, {
                                    colour: picked.name,
                                    // A reserved colour has no standard yet, so
                                    // there is nothing to copy -- keep the swatch
                                    // the photography gave this garment rather
                                    // than blanking it.
                                    ...(picked.hex ? { swatch: picked.hex } : {}),
                                  });
                                }}
                                aria-label="Colour"
                              >
                                {/* A colour not in the issued list would otherwise
                                    render as the first option and quietly lie about
                                    what this variant holds. */}
                                {!known && <option value={v.colour}>{v.colour} — not issued</option>}
                                {colourOptions.map((c) => (
                                  <option key={c.number} value={c.name}>
                                    {c.number} · {c.name}
                                    {c.hex ? "" : " (reserved)"}
                                  </option>
                                ))}
                              </select>
                              <input
                                className="admin-input admin-input-price"
                                type="number"
                                step="0.01"
                                min="0"
                                inputMode="decimal"
                                key={`${v.id}-price-${v.price ?? "inherit"}`}
                                defaultValue={v.price == null ? "" : (v.price / 100).toFixed(2)}
                                onBlur={(e) => {
                                  const raw = e.target.value.trim();
                                  // Empty means "inherit", which is null — not 0.
                                  const next = raw === "" ? null : Math.round(parseFloat(raw) * 100);
                                  if (next !== null && Number.isNaN(next)) return;
                                  if (next !== v.price) updateVariant(p.id, v.id, { price: next });
                                }}
                                placeholder="Override £"
                              />
                              <button
                                className="admin-delete"
                                onClick={() => deleteVariant(p.id, v.id)}
                              >
                                Remove
                              </button>
                            </div>

                            <div className="admin-image-strip">
                              {v.images.map((img, i) => {
                                const lead = isThumbnail(p, v, i);
                                return (
                                  <div
                                    className={`admin-image-thumb ${lead ? "is-thumb" : ""}`}
                                    key={img + i}
                                  >
                                    <img
                                      src={img}
                                      alt=""
                                      onError={(e) => {
                                        e.currentTarget.src = "/images/fallback.svg";
                                      }}
                                    />
                                    <button
                                      type="button"
                                      className="admin-image-pick"
                                      aria-pressed={lead}
                                      title={
                                        lead
                                          ? "This is the product's card image"
                                          : "Make this the product's card image"
                                      }
                                      onClick={() => makeThumbnail(p.id, v.id, i)}
                                    >
                                      {lead ? "Card" : "Use"}
                                    </button>
                                    <button
                                      type="button"
                                      className="admin-image-remove"
                                      aria-label={`Remove photo ${i + 1} of ${v.colour}`}
                                      onClick={() => removeVariantImage(p.id, v.id, i)}
                                    >
                                      ×
                                    </button>
                                  </div>
                                );
                              })}
                              <label className="admin-image-add">
                                +
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  hidden
                                  onChange={(e) => {
                                    const files = Array.from(e.target.files ?? []);
                                    files.forEach((file) =>
                                      handleVariantImageAdd(p.id, v.id, file)
                                    );
                                    e.target.value = "";
                                  }}
                                />
                              </label>
                              {v.images.length === 0 && (
                                <span className="admin-no-photo">
                                  No photo yet — saving is blocked until this colour has one
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      <button className="admin-btn" onClick={() => addVariant(p.id)}>
                        + Add colour
                      </button>
                    </section>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="admin-toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`admin-toast is-${t.kind}`}>
            <span>{t.text}</span>
            <button
              type="button"
              className="admin-toast-close"
              aria-label="Dismiss"
              onClick={() => dismissToast(t.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

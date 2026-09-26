"use client";

import { useCallback, useEffect, useState } from "react";
import type { Order } from "@/lib/orders";
import { formatPrice } from "@/lib/format";

type Row = Order & { labelUrl: string | null };

// The fulfilment desk. One row per paid order, newest first, with the three
// things that happen to a parcel in the order they happen:
//
//   Get label      buys the label from Sendcloud. Status stays PAID.
//   Mark shipped   paid -> shipped, sends the dispatch email. The carrier's
//                  first scan does the same thing on its own; whichever is
//                  first wins and the other is a no-op.
//   Mark delivered normally the carrier's job via the webhook; here for the
//                  case where the scan never arrives.
export default function OrdersPanel({
  toast,
}: {
  toast: (kind: "ok" | "error", text: string) => void;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [mode, setMode] = useState<"live" | "test" | "unconfigured">("unconfigured");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/orders");
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not load orders.");
      setRows(d.orders);
      setMode(d.sendcloud);
    } catch (e: any) {
      toast("error", e.message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  function patch(order: Row) {
    setRows((prev) => prev.map((r) => (r.id === order.id ? { ...r, ...order } : r)));
  }

  async function getLabel(o: Row) {
    setBusy(o.id);
    try {
      const r = await fetch(`/api/admin/orders/${o.id}/label`, { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Label failed.");
      patch(d.order);
      toast("ok", `Label ready for ${o.orderNumber}.`);
    } catch (e: any) {
      toast("error", e.message);
    } finally {
      setBusy(null);
    }
  }

  async function move(o: Row, to: "shipped" | "delivered") {
    if (to === "shipped" && !o.shipment.sendcloudParcelId) {
      if (!confirm(`${o.orderNumber} has no label. Mark it shipped anyway? The customer gets a dispatch email without tracking.`)) return;
    }
    setBusy(o.id);
    try {
      const r = await fetch(`/api/admin/orders/${o.id}/ship`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Update failed.");
      patch({ ...o, ...d.order });
      toast("ok", d.transitioned ? `${o.orderNumber} marked ${to}.` : `${o.orderNumber} was already ${to}.`);
    } catch (e: any) {
      toast("error", e.message);
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <div className="wrap admin-content">Loading orders…</div>;

  const addr = (a: unknown) => {
    if (!a || typeof a !== "object") return "";
    const x = a as Record<string, string | null>;
    return [x.line1, x.line2, x.city, x.postal_code, x.country].filter(Boolean).join(", ");
  };

  return (
    <div className="wrap admin-content">
      <p className="admin-orders-mode">
        Sendcloud:{" "}
        {mode === "live" ? (
          <strong>live</strong>
        ) : mode === "test" ? (
          <strong className="is-test">test mode — free unstamped letters, no carrier invoice</strong>
        ) : (
          <strong className="is-off">not configured — labels cannot be made</strong>
        )}
      </p>

      {rows.length === 0 && <p className="admin-empty">No paid orders yet.</p>}

      <div className="admin-table">
        {rows.map((o) => {
          const s = o.shipment;
          const expanded = open === o.id;
          const stage = o.status === "delivered" ? 4 : o.status === "shipped" ? 3 : s.sendcloudParcelId ? 2 : 1;
          return (
            <div className={`admin-card admin-order ${expanded ? "is-open" : ""}`} key={o.id}>
              <div className="admin-order-head" onClick={() => setOpen(expanded ? null : o.id)}>
                <div className="admin-order-id">
                  <code>{o.orderNumber}</code>
                  <span className="admin-order-date">
                    {new Date(o.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </span>
                </div>
                <div className="admin-order-who">
                  <strong>{o.customerName ?? "—"}</strong>
                  <span>{o.email}</span>
                </div>
                <div className="admin-order-sum">
                  {o.items.reduce((n, i) => n + i.quantity, 0)} item
                  {o.items.reduce((n, i) => n + i.quantity, 0) === 1 ? "" : "s"} ·{" "}
                  {formatPrice(o.totalPence ?? o.subtotalPence)}
                </div>
                <ol className="admin-stages" aria-label="Fulfilment">
                  {["Paid", "Label", "Shipped", "Delivered"].map((label, i) => (
                    <li key={label} className={i + 1 <= stage ? "is-done" : ""}>
                      {label}
                    </li>
                  ))}
                </ol>
              </div>

              {expanded && (
                <div className="admin-card-body admin-order-body">
                  <div className="admin-order-cols">
                    <section>
                      <h3 className="admin-section-title">Items</h3>
                      <ul className="admin-order-items">
                        {o.items.map((i, k) => (
                          <li key={k}>
                            {i.productName} · {i.colour} · {i.size} × {i.quantity}
                            <span>{formatPrice(i.unitPricePence * i.quantity)}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="admin-order-totals">
                        {o.shippingService === "express" ? (
                          <strong>EXPRESS · Tracked 24</strong>
                        ) : o.shippingService === "ireland" ? (
                          "Ireland"
                        ) : (
                          "Standard"
                        )}{" "}
                        · Delivery {o.shippingPence === 0 ? "free" : formatPrice(o.shippingPence)}
                        {s.carrierCostPence != null && <> · carrier cost {formatPrice(s.carrierCostPence)}</>}
                      </p>
                    </section>
                    <section>
                      <h3 className="admin-section-title">Deliver to</h3>
                      <p className="admin-order-addr">
                        {o.customerName}
                        <br />
                        {addr(o.shippingAddress)}
                      </p>
                      {s.trackingNumber && (
                        <p className="admin-order-track">
                          {s.carrier ?? "Carrier"} ·{" "}
                          {s.trackingUrl ? (
                            <a href={s.trackingUrl} target="_blank" rel="noreferrer">
                              {s.trackingNumber}
                            </a>
                          ) : (
                            s.trackingNumber
                          )}
                        </p>
                      )}
                    </section>
                  </div>

                  <div className="admin-order-actions">
                    {!s.sendcloudParcelId ? (
                      <button
                        className="admin-btn admin-btn-primary"
                        disabled={busy === o.id || o.status !== "paid" || mode === "unconfigured"}
                        onClick={() => getLabel(o)}
                      >
                        {busy === o.id ? "Buying label…" : "Get shipping label"}
                      </button>
                    ) : o.labelUrl ? (
                      <a className="admin-btn" href={o.labelUrl} target="_blank" rel="noreferrer">
                        Print label
                      </a>
                    ) : (
                      <span className="admin-order-note">Label at Sendcloud (not stored)</span>
                    )}
                    {o.status === "paid" && (
                      <button className="admin-btn" disabled={busy === o.id} onClick={() => move(o, "shipped")}>
                        Mark shipped
                      </button>
                    )}
                    {o.status === "shipped" && (
                      <button className="admin-btn admin-btn-quiet" disabled={busy === o.id} onClick={() => move(o, "delivered")}>
                        Mark delivered
                      </button>
                    )}
                    <span className="admin-order-note">
                      {o.status === "paid" && s.sendcloudParcelId && "Label made — status stays paid until the carrier scans it or you mark it."}
                      {o.status === "shipped" && s.shippedAt && `Shipped ${new Date(s.shippedAt).toLocaleString("en-GB")}`}
                      {o.status === "delivered" && s.deliveredAt && `Delivered ${new Date(s.deliveredAt).toLocaleString("en-GB")}`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ITEMS = [
  {
    path: "M3 8.5h11.5l2.5 3.5v4h-14v-7.5Z M14.5 8.5V5.5h-11.5v10",
    label: "Free UK delivery",
    detail: "On orders over £100",
  },
  {
    path: "M4 10a6 6 0 1 0 12 0 6 6 0 0 0-12 0Z M10 6.5v3.8l2.6 1.6",
    label: "14-day returns",
    detail: "Easy exchanges, no fuss",
  },
  {
    path: "M10 3.5 4 6v4c0 3.6 2.5 6.2 6 7 3.5-0.8 6-3.4 6-7V6l-6-2.5Z",
    label: "Secure checkout",
    detail: "Encrypted, powered by Stripe",
  },
];

/**
 * A slim, unglamorous row of real reasons to trust the store — the kind of
 * thing that fills the gap between sections without needing photography
 * the catalog doesn't have yet.
 */
export default function TrustStrip() {
  return (
    <div className="trust-strip">
      <div className="wrap trust-strip-inner">
        {ITEMS.map((item) => (
          <div className="trust-item" key={item.label} data-reveal>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d={item.path} />
            </svg>
            <div>
              <p className="trust-item-label">{item.label}</p>
              <p className="trust-item-detail">{item.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

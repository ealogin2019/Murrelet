export default function CancelPage() {
  return (
    <div className="wrap status-page">
      <h1>Checkout cancelled</h1>
      <p>No charge was made. Your cart is still saved whenever you&apos;re ready.</p>
      <a href="/cart" className="btn" style={{ display: "inline-block", width: "auto" }}>
        Back to cart
      </a>
    </div>
  );
}

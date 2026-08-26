import Link from "next/link";
import { getOrderBySession } from "@/lib/orders";
import { formatPrice } from "@/lib/format";
import ClearCart from "@/components/ClearCart";
import PendingOrder from "@/components/PendingOrder";

export const dynamic = "force-dynamic";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string };
}) {
  const sessionId = searchParams.session_id;
  const order = sessionId ? await getOrderBySession(sessionId) : null;

  // Reached without a session id, or with one matching nothing. Say so plainly
  // rather than thanking someone for an order that may not exist — this page
  // used to congratulate anyone who loaded the URL.
  if (!order) {
    return (
      <div className="wrap status-page">
        <h1>No order found</h1>
        <p>
          If you have just paid, your confirmation may take a moment. Check your
          email, or contact us with your payment reference.
        </p>
        <Link href="/" className="btn" style={{ display: "inline-block", width: "auto" }}>
          Continue shopping
        </Link>
      </div>
    );
  }

  // The webhook may not have landed yet: the order exists but is still
  // pending. Don't claim the payment succeeded until Stripe has said so.
  const paid = order.status === "paid";

  return (
    <div className="wrap status-page">
      {/* Only empty the bag once there is a real order behind it. */}
      <ClearCart />

      <h1>{paid ? "Thank you for your order" : "Order received"}</h1>
      <p className="eyebrow">Order {order.orderNumber}</p>

      {!paid && <PendingOrder email={order.email} />}

      <div className="order-summary">
        {order.items.map((item) => (
          <div className="order-line" key={item.skuId + item.size}>
            {item.imageUrl && <img src={item.imageUrl} alt={item.productName} />}
            <div>
              <p className="cart-row-name">{item.productName}</p>
              <p className="cart-row-meta">Colour: {item.colour}</p>
              <p className="cart-row-meta">Size: {item.size}</p>
              <p className="cart-row-meta">Qty: {item.quantity}</p>
            </div>
            <div>{formatPrice(item.unitPricePence * item.quantity)}</div>
          </div>
        ))}

        <div className="summary-row">
          <span>Subtotal</span>
          <span>{formatPrice(order.subtotalPence)}</span>
        </div>
        <div className="summary-row">
          <span>Delivery</span>
          <span>
            {order.shippingPence === 0 ? "Free" : formatPrice(order.shippingPence)}
          </span>
        </div>
        {order.totalPence !== null && (
          <div className="summary-row total">
            <span>Total</span>
            <span>{formatPrice(order.totalPence)}</span>
          </div>
        )}
      </div>

      {paid && order.email && (
        <p className="cart-row-meta">A confirmation is on its way to {order.email}.</p>
      )}

      <Link href="/" className="btn" style={{ display: "inline-block", width: "auto" }}>
        Continue shopping
      </Link>
    </div>
  );
}

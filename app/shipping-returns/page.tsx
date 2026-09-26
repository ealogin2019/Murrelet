import type { Metadata } from "next";
import InfoPage from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "Shipping & Returns",
  description: "Delivery times, costs, and how to return an order.",
};

export default function ShippingReturnsPage() {
  return (
    <InfoPage eyebrow="Help" title="Shipping & Returns">
      <h2>Delivery</h2>
      <p>We currently ship to the United Kingdom and Ireland.</p>
      <table className="info-table">
        <tbody>
          <tr>
            <td>UK standard delivery</td>
            <td>£3.95 · 2–3 business days</td>
          </tr>
          <tr>
            <td>UK express delivery</td>
            <td>£5.95 · 1–2 business days</td>
          </tr>
          <tr>
            <td>UK orders over £70</td>
            <td>Free standard delivery</td>
          </tr>
          <tr>
            <td>Ireland</td>
            <td>£9.95 · 3–5 business days</td>
          </tr>
        </tbody>
      </table>
      <p>
        Delivery costs and any promotional threshold are calculated at checkout and may
        change — the amount shown there is what you&apos;ll be charged.
      </p>

      <h2>Returns</h2>
      <p>
        You can return an unworn, unwashed item in its original condition, labels
        attached, within <strong>14 days</strong> of delivery for a refund of the item
        and the standard delivery charge.
      </p>
      <p>How it works:</p>
      <ol>
        <li>
          Email <a href="mailto:support@murrelet.co.uk">support@murrelet.co.uk</a>{" "}
          within 14 days of delivery with your order number and what you are returning.
        </li>
        <li>We reply with the return address and log the return against your order.</li>
        <li>
          Post it back within 14 days of that email, using a tracked service. Return
          postage for a change of mind is paid by you; we will suggest the cheapest
          tracked option.
        </li>
        <li>We refund to your original payment method within 14 days of receiving it.</li>
      </ol>
      <p>
        If you&apos;re in the UK, this is on top of your statutory right to cancel an
        online order within 14 days of receiving it under the Consumer Contracts
        Regulations 2013, regardless of any policy stated here.
      </p>

      <h2>Damaged or incorrect items</h2>
      <p>
        If an item arrives damaged, faulty, or isn&apos;t what you ordered, contact us
        and we&apos;ll sort it — see our <a href="/contact">contact page</a>.
      </p>
    </InfoPage>
  );
}

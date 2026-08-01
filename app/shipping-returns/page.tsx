import type { Metadata } from "next";
import InfoPage from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "Shipping & Returns — Murrelet",
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
            <td>Standard delivery</td>
            <td>£4.95 · 3–5 business days</td>
          </tr>
          <tr>
            <td>Express delivery</td>
            <td>£9.95 · 1–2 business days</td>
          </tr>
          <tr>
            <td>Orders over £100</td>
            <td>Free standard delivery</td>
          </tr>
        </tbody>
      </table>
      <p>
        Delivery costs and any promotional threshold are calculated at checkout and may
        change — the amount shown there is what you&apos;ll be charged.
      </p>

      <h2>Returns</h2>
      <p>
        You can return an unworn, unwashed item in its original condition within{" "}
        <strong>14 days</strong> of delivery for a refund.
      </p>
      <p>
        If you&apos;re in the UK, this is on top of your statutory right to cancel an
        online order within 14 days of receiving it under the Consumer Contracts
        Regulations 2013, regardless of any policy stated here.
      </p>
      <p className="placeholder-flag">
        Return address and process (postal return vs. prepaid label) — add before
        launch.
      </p>

      <h2>Damaged or incorrect items</h2>
      <p>
        If an item arrives damaged, faulty, or isn&apos;t what you ordered, contact us
        and we&apos;ll sort it — see our <a href="/contact">contact page</a>.
      </p>
    </InfoPage>
  );
}

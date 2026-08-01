import type { Metadata } from "next";
import InfoPage from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "Terms of Service — Murrelet",
  description: "The terms that apply when you buy from Murrelet.",
};

export default function TermsPage() {
  return (
    <InfoPage eyebrow="Legal" title="Terms of Service" updated="31 July 2026">
      <p className="placeholder-flag">
        Draft terms, not reviewed by a solicitor — do that, and fill in the details
        marked below, before relying on this or taking real payments.
      </p>

      <h2>About us</h2>
      <p className="placeholder-flag">
        [Registered company name, company number, and registered address — add before
        launch.]
      </p>

      <h2>Orders and payment</h2>
      <p>
        Prices are shown in GBP and include VAT where applicable. Placing an order is
        an offer to buy, which we accept when we confirm and charge it. Payment is
        processed by Stripe.
      </p>

      <h2>Your right to cancel</h2>
      <p>
        If you&apos;re a UK consumer, you can cancel your order within 14 days of
        receiving it without giving a reason, under the Consumer Contracts
        Regulations 2013. See <a href="/shipping-returns">Shipping &amp; Returns</a>{" "}
        for how.
      </p>

      <h2>Product descriptions and pricing</h2>
      <p>
        We try to describe and price items accurately. If we discover a pricing or
        listing error after you&apos;ve ordered, we&apos;ll contact you before
        charging or shipping anything.
      </p>

      <h2>Liability</h2>
      <p>
        Nothing here limits any liability that can&apos;t be limited under UK law,
        including for death, personal injury, or fraud.
      </p>

      <h2>Governing law</h2>
      <p className="placeholder-flag">
        [Confirm governing law and jurisdiction — likely England and Wales — before
        launch.]
      </p>
    </InfoPage>
  );
}

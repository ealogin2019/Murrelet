import type { Metadata } from "next";
import InfoPage from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "Privacy Policy — Murrelet",
  description: "What we collect, why, and who we share it with.",
};

export default function PrivacyPage() {
  return (
    <InfoPage eyebrow="Legal" title="Privacy Policy" updated="31 July 2026">
      <p className="placeholder-flag">
        This describes what the site actually does today. It has not been reviewed by
        a solicitor — do that before relying on it, and fill in the company details
        marked below.
      </p>

      <h2>Who we are</h2>
      <p className="placeholder-flag">
        [Registered company name, company number, and registered address — add before
        launch.]
      </p>

      <h2>What we collect</h2>
      <p>When you place an order, we collect the information needed to fulfil it:</p>
      <ul>
        <li>Email address</li>
        <li>Shipping address</li>
        <li>Order contents and amount paid</li>
      </ul>
      <p>
        We don&apos;t currently offer accounts — orders are placed as a guest. We don&apos;t
        run analytics or advertising trackers on this site.
      </p>

      <h2>Payment</h2>
      <p>
        Payment is handled by Stripe on Stripe&apos;s own checkout page. We never see or
        store your card details — Stripe passes us confirmation that you paid, and the
        amount.
      </p>

      <h2>Where your data lives</h2>
      <p>Order and catalogue data is stored with Supabase (database) and Vercel (hosting).</p>

      <h2>How long we keep it</h2>
      <p>
        Order records are kept for as long as needed for accounting, warranty, and
        returns purposes.
      </p>

      <h2>Your rights</h2>
      <p>
        If you&apos;re in the UK or EU, you can ask us what data we hold about you, ask
        us to correct or delete it, or object to how it&apos;s used. Contact us via the{" "}
        <a href="/contact">contact page</a> to do any of this.
      </p>
    </InfoPage>
  );
}

import type { Metadata } from "next";
import InfoPage from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What we collect when you order, why, who handles it, and your rights under UK GDPR.",
};

// Describes what the site actually does: guest checkout, no accounts, no
// analytics, no advertising. Under UK GDPR the lawful basis for order data is
// performance of a contract; for keeping records afterwards, legal obligation
// (tax) and legitimate interest (returns and disputes). Not reviewed by a
// solicitor -- the owner knows.
export default function PrivacyPage() {
  return (
    <InfoPage eyebrow="Legal" title="Privacy Policy" updated="13 September 2026">
      <h2>Who we are</h2>
      <p>
        Murrelet, The Mast 2, Newham, London E16 2QZ, United Kingdom, is the data
        controller for this site. Questions about your data go to{" "}
        <a href="mailto:support@murrelet.co.uk">support@murrelet.co.uk</a>.
      </p>

      <h2>What we collect, and why</h2>
      <p>
        There are no customer accounts. When you place an order we collect only what is
        needed to fulfil it and to keep the records the law requires:
      </p>
      <ul>
        <li>Your email address, to confirm the order and answer questions about it</li>
        <li>Your name and delivery address, to send the parcel</li>
        <li>What you ordered and what you paid</li>
      </ul>
      <p>
        The lawful basis is that we need this to carry out the contract you are making
        with us. If you email us, we keep the correspondence so we can deal with it.
      </p>

      <h2>Payment</h2>
      <p>
        Payment is taken by Stripe on Stripe&apos;s own checkout page. Your card details
        go to Stripe, not to us; we receive confirmation that you paid, the amount, and
        the delivery address you entered. Stripe&apos;s handling of your data is covered
        by its own privacy policy.
      </p>

      <h2>Who else handles your data</h2>
      <ul>
        <li>Stripe &mdash; payment</li>
        <li>Supabase &mdash; the database holding orders and the catalogue</li>
        <li>Vercel &mdash; hosting</li>
        <li>Resend &mdash; sending your order confirmation email</li>
      </ul>
      <p>
        Each of these processes data on our instructions. We do not sell or share your
        data with anyone for marketing, and we do not use it for anything other than
        the order you placed and the records that follow from it.
      </p>

      <h2>Cookies and storage</h2>
      <p>
        The site uses only what it needs to work: your bag is kept in your browser&apos;s
        local storage, Stripe sets its own cookies during checkout, and a cookie keeps
        our admin signed in on our side. There are no analytics or advertising
        trackers.
      </p>

      <h2>How long we keep it</h2>
      <p>
        Order records are kept for six years after the order, which is what UK tax law
        requires, and so that we can deal with returns, faults and disputes in that
        time. Correspondence is kept for as long as it is relevant to an order.
      </p>

      <h2>Your rights</h2>
      <p>
        Under UK GDPR you can ask us for a copy of the data we hold about you, ask us to
        correct it, ask us to delete it where we no longer need to keep it, or object to
        how it is used. Email{" "}
        <a href="mailto:support@murrelet.co.uk">support@murrelet.co.uk</a> and we will
        reply within one month. If you are not satisfied with our answer, you can
        complain to the Information Commissioner&apos;s Office at ico.org.uk.
      </p>
    </InfoPage>
  );
}

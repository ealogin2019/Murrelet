import type { Metadata } from "next";
import InfoPage from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "Contact",
  description: "Email support@murrelet.co.uk about an order, a return, or anything else.",
};

// One address, email only. The owner chose the smallest possible surface for
// launch: no phone, no form, no chat -- a mailbox that a person reads.
export default function ContactPage() {
  return (
    <InfoPage eyebrow="Help" title="Contact">
      <p>
        Email us at <a href="mailto:support@murrelet.co.uk">support@murrelet.co.uk</a>.
        A person reads it, and we aim to reply within two working days.
      </p>
      <p>
        For questions about an order, include your order number &mdash; it looks like{" "}
        <code>MUR-260729-4F2A9C</code> and is on your confirmation email. For a return,
        see <a href="/shipping-returns">Shipping &amp; Returns</a> first; it answers the
        common questions.
      </p>

      <h2>Post</h2>
      <p>
        Murrelet
        <br />
        The Mast 2
        <br />
        Newham, London
        <br />
        E16 2QZ
        <br />
        United Kingdom
      </p>
      <p>
        Please don&apos;t send returns to this address without emailing first &mdash;
        we&apos;ll confirm where to send the parcel and log the return against your
        order so nothing gets lost.
      </p>
    </InfoPage>
  );
}

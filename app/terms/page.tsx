import type { Metadata } from "next";
import InfoPage from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that apply when you buy from Murrelet.",
};

// Standard UK consumer terms for a small online clothing shop: Consumer
// Contracts Regulations 2013 for cancellation, Consumer Rights Act 2015 for
// faulty goods, English law. Written to say what the shop actually does, not
// what a template imagines. Not reviewed by a solicitor -- the owner knows.
export default function TermsPage() {
  return (
    <InfoPage eyebrow="Legal" title="Terms of Service" updated="13 September 2026">
      <h2>About us</h2>
      <p>
        This site is run by Murrelet, The Mast 2, Newham, London E16 2QZ, United
        Kingdom. You can reach us at{" "}
        <a href="mailto:support@murrelet.co.uk">support@murrelet.co.uk</a>.
        {/* Company registration is planned after launch; the number goes here
            when it exists. */}
      </p>

      <h2>Orders and payment</h2>
      <p>
        Prices are shown in pounds sterling and include VAT where it applies. Delivery
        is charged separately and shown before you pay. Placing an order is an offer to
        buy; we accept it when we send your confirmation email, and that is when the
        contract is made. Payment is taken by Stripe at the time you order. We never see
        or hold your card details.
      </p>
      <p>
        If something is out of stock after you have ordered, or we find a pricing or
        description error, we will email you before charging or sending anything, and
        you can cancel for a full refund.
      </p>

      <h2>Delivery</h2>
      <p>
        We deliver to the United Kingdom and Ireland. Times and costs are on the{" "}
        <a href="/shipping-returns">Shipping &amp; Returns</a> page. The goods are your
        responsibility from the moment they are delivered to the address you gave us.
      </p>

      <h2>Your right to cancel</h2>
      <p>
        If you are a consumer in the UK, you can cancel an order for any reason within
        14 days of receiving it, under the Consumer Contracts Regulations 2013. Tell us
        by email within those 14 days, then send the item back within a further 14 days.
        We refund the price and the standard delivery charge within 14 days of getting
        the item back. Return postage for a change of mind is paid by you; we will tell
        you the cheapest tracked option.
      </p>
      <p>
        Items must be unworn, unwashed and in their original condition with any labels
        attached. You are entitled to handle them as you would in a shop; if an item
        comes back with wear beyond that, we may reduce the refund to reflect it.
      </p>

      <h2>Faulty or wrong items</h2>
      <p>
        Under the Consumer Rights Act 2015, what we sell must be as described, of
        satisfactory quality and fit for purpose. If it is not, tell us within 30 days
        for a full refund, or after that for a repair or replacement. In these cases we
        pay the return postage.
      </p>

      <h2>Product descriptions</h2>
      <p>
        We describe garments, fabrics and sizes as accurately as we can, and our size
        guide gives the garment&apos;s own measurements. Colours are measured from the
        photography, but screens vary; a small difference between the picture and the
        cloth is not a fault.
      </p>

      <h2>Our liability</h2>
      <p>
        We are responsible for loss or damage you suffer that is a foreseeable result of
        our breaking these terms or failing to use reasonable care. We are not
        responsible for loss that is not foreseeable, or for business losses. Nothing
        in these terms limits any liability that cannot be limited under UK law,
        including for death, personal injury, or fraud.
      </p>

      <h2>Complaints</h2>
      <p>
        Email <a href="mailto:support@murrelet.co.uk">support@murrelet.co.uk</a> and
        we will try to sort it out. If we cannot, you can use the EU&apos;s online
        dispute resolution platform if you are in Ireland, or take the matter to the
        courts described below.
      </p>

      <h2>Governing law</h2>
      <p>
        These terms are governed by the law of England and Wales, and the courts of
        England and Wales have jurisdiction. If you live in Scotland or Northern
        Ireland you may also bring proceedings in your own courts.
      </p>
    </InfoPage>
  );
}

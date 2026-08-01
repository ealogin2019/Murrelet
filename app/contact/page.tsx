import type { Metadata } from "next";
import InfoPage from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "Contact — Murrelet",
  description: "Get in touch about an order or anything else.",
};

export default function ContactPage() {
  return (
    <InfoPage eyebrow="Help" title="Contact">
      <p className="placeholder-flag">
        No contact email or number is wired up yet — add one before launch, this page
        is currently a placeholder.
      </p>
      <p>
        For questions about an order, include your order number if you have one — it
        looks like <code>MUR-260729-4F2A9C</code>.
      </p>
    </InfoPage>
  );
}

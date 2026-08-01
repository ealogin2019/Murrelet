import { ReactNode } from "react";

/**
 * Shared shell for the legal/policy pages (shipping, privacy, terms,
 * contact). Not used by the shop pages — those have their own layouts — so
 * this stays a plain prose container rather than trying to be a general
 * page primitive.
 */
export default function InfoPage({
  eyebrow,
  title,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  updated?: string;
  children: ReactNode;
}) {
  return (
    <div className="wrap info-page">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {updated && <p className="info-updated">Last updated {updated}</p>}
      <div className="info-prose">{children}</div>
    </div>
  );
}

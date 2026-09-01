// The one place the site's own absolute URL is decided. Sitemap, robots.txt,
// and Open Graph tags all need an absolute origin — this is that origin.
//
// The real domain is murrelet.co.uk, registered 2026-09-01. NEXT_PUBLIC_SITE_URL
// should hold it in every deployed environment; the fallback exists so a build
// with the variable missing still emits the right absolute URLs into the
// sitemap, canonical tags and order emails rather than localhost or a
// vercel.app subdomain that would then need redirecting.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL?.startsWith("http")
    ? process.env.NEXT_PUBLIC_SITE_URL
    : "https://murrelet.co.uk"
).replace(/\/$/, "");

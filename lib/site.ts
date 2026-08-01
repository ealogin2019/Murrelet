// The one place the site's own absolute URL is decided. Sitemap, robots.txt,
// and Open Graph tags all need an absolute origin — this is that origin.
//
// NEXT_PUBLIC_SITE_URL is meant to hold the real domain once one is attached;
// until then it falls back to the known Vercel URL rather than localhost, so
// a production build never emits localhost links into a sitemap search
// engines actually crawl.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL?.startsWith("http")
    ? process.env.NEXT_PUBLIC_SITE_URL
    : "https://murrelet.vercel.app"
).replace(/\/$/, "");

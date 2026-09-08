import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // While the site is password-protected, ask crawlers to stay away entirely.
  // The password already stops them reading anything, but a disallow keeps the
  // URLs themselves out of results -- a page can be listed from links alone,
  // without ever being fetched, and a half-built store appearing in a search
  // for the brand is the thing being avoided here.
  //
  // Driven by the same variable as the gate, so the two cannot disagree: the
  // day SITE_PASSWORD is removed, this opens with it.
  if (process.env.SITE_PASSWORD) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Nothing behind /admin should be indexed, and there's nothing for a
        // crawler to do with the API routes.
        disallow: ["/admin", "/api"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

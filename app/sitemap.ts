import type { MetadataRoute } from "next";
import { getCatalog } from "@/lib/catalog-store";
import { SITE_URL } from "@/lib/site";

// Every Supabase read now goes through a no-store fetch (see lib/supabase.ts
// for why), which is real "dynamic server usage" as far as Next's static
// export is concerned — this route fetches the catalog, so it can't be
// prerendered at build time any more. Generate it per-request instead.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getCatalog();

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/shop`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/men`, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE_URL}/women`, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE_URL}/kids`, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/size-guide`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/shipping-returns`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${SITE_URL}/contact`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const productPages: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${SITE_URL}/product/${p.slug}`,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticPages, ...productPages];
}

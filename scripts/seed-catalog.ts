// Pushes lib/catalog.ts's seedCatalog into Supabase.
//
//   npx tsx scripts/seed-catalog.ts
//
// Idempotent: rows are upserted by id, and anything not in the seed is
// removed. Safe to re-run after editing the seed. It will overwrite catalog
// edits made in /admin, so it is a bootstrap tool, not a sync tool.

import { config } from "dotenv";
import { seedCatalog } from "../lib/catalog";

config({ path: ".env.local" });

async function main() {
  // Imported after dotenv so the module sees the loaded env.
  const { saveCatalogToDb, getCatalogFromDb } = await import("../lib/catalog-store");

  const existing = await getCatalogFromDb();
  if (existing.length > 0) {
    console.log(
      `Catalog already has ${existing.length} product(s): ${existing
        .map((p) => p.slug)
        .join(", ")}`
    );
    if (!process.argv.includes("--force")) {
      console.log("Refusing to overwrite. Re-run with --force to replace it.");
      process.exit(1);
    }
    console.log("--force given; replacing.");
  }

  await saveCatalogToDb(seedCatalog);

  const after = await getCatalogFromDb();
  const variants = after.reduce((n, p) => n + p.variants.length, 0);
  const skus = after.reduce(
    (n, p) => n + p.variants.reduce((m, v) => m + v.skus.length, 0),
    0
  );
  console.log(`Seeded ${after.length} products, ${variants} colours, ${skus} SKUs.`);
  for (const p of after) {
    console.log(
      `  ${p.slug} — £${(p.price / 100).toFixed(2)} — ${p.variants
        .map((v) => v.colour)
        .join(", ")}`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

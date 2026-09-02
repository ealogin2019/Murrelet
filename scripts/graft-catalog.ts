// Adds products to the live catalog WITHOUT touching what is already there.
//
//   npx tsx scripts/graft-catalog.ts large-text-tee                    check only
//   npx tsx scripts/graft-catalog.ts large-text-tee --write            add it
//   npx tsx scripts/graft-catalog.ts large-text-tee --replace --write  and drop the rest
//
// --replace makes the catalog exactly the named products, deleting the others.
// That is safe for order history by design: order_items.sku_id is
// `on delete set null`, and product_name, colour, size and unit_price_pence
// are denormalised onto the row, so a past order keeps saying what it charged.
// The live link is what goes, not the record. It is still destructive to the
// CATALOG, so it takes the backup below and prints what it will remove.
//
// Why this exists rather than `npm run db:seed`.
//
// saveCatalogToDb replaces the catalog wholesale: any product, variant or sku
// absent from what it is handed is deleted. Both existing entry points hand it
// a full list built from a file — seed-catalog.ts from lib/catalog.ts, and
// sync-catalog.ts from content/catalog.json — and both of those files have
// drifted from the database. Measured on 2026-09-02:
//
//     live db    plain-short-sleeve-shirt   4 colours (White, Beige,
//                                           Dark Brown, Dark Grey)
//     seed file  plain-short-sleeve-shirt   2 colours
//
// Those two extra colours were added through /admin. Running either tool
// would have removed them, and re-created two products that had been deleted.
// Neither would have said so first.
//
// So this reads the live catalog, appends only products whose id is not
// already present, and writes the union back. Nothing existing is modified.
// A dated backup of the live catalog is written first, always, whether or not
// --write is given.

import { config } from "dotenv";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

config({ path: ".env.local" });

const BACKUP_DIR = "backups";

async function main() {
  const args = process.argv.slice(2);
  const write = args.includes("--write");
  const wanted = args.filter((a) => !a.startsWith("--"));
  if (wanted.length === 0) {
    console.error("Name at least one product id from lib/catalog.ts's seedCatalog.");
    process.exit(1);
  }

  const { getCatalogFromDb, saveCatalogToDb } = await import("../lib/catalog-store");
  const { seedCatalog } = await import("../lib/catalog");

  const live = await getCatalogFromDb();

  mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backup = join(BACKUP_DIR, `catalog-${stamp}.json`);
  writeFileSync(backup, JSON.stringify(live, null, 2));
  console.log(`Backed up ${live.length} live product(s) to ${backup}`);
  for (const p of live) {
    console.log(`   ${p.slug} — ${p.variants.length} colours, ` +
      `${p.variants.reduce((n, v) => n + v.skus.length, 0)} skus`);
  }

  const have = new Set(live.map((p) => p.id));
  const adding = [];
  for (const id of wanted) {
    const p = seedCatalog.find((s) => s.id === id);
    if (!p) {
      console.error(`\nNo product "${id}" in seedCatalog.`);
      process.exit(1);
    }
    if (have.has(p.id)) {
      console.log(`\n${p.slug} is already live — skipping, this tool never overwrites.`);
      continue;
    }
    adding.push(p);
  }

  const replace = args.includes("--replace");
  const dropping = replace ? live.filter((p) => !wanted.includes(p.id)) : [];
  if (dropping.length) {
    console.log("\nWould REMOVE from the catalog:");
    for (const p of dropping) {
      console.log(`   ${p.slug} — ${p.variants.length} colours, ` +
        `${p.variants.reduce((n, v) => n + v.skus.length, 0)} skus`);
    }
    console.log("   (past orders keep their product name, colour, size and " +
      "price — only the live sku link is cleared)");
  }

  if (adding.length === 0 && dropping.length === 0) {
    console.log("\nNothing to do.");
    return;
  }

  console.log("\nWould add:");
  for (const p of adding) {
    const skus = p.variants.reduce((n, v) => n + v.skus.length, 0);
    console.log(`   ${p.slug} — £${(p.price / 100).toFixed(2)} — ` +
      `${p.variants.length} colours, ${skus} skus`);
    for (const v of p.variants) {
      console.log(`      ${v.colour.padEnd(12)} ${v.swatch}  ` +
        `${v.images.length} image(s)  ${v.skus[0]?.id} …`);
    }
  }

  if (!write) {
    console.log("\nCheck only. Re-run with --write to apply.");
    return;
  }

  const keep = replace ? live.filter((p) => wanted.includes(p.id)) : live;
  const next = [...keep, ...adding];
  await saveCatalogToDb(next);

  const after = await getCatalogFromDb();
  console.log(`\nCatalog now holds ${after.length} products:`);
  for (const p of after) {
    console.log(`   ${p.slug} — ${p.variants.length} colours, ` +
      `${p.variants.reduce((n, v) => n + v.skus.length, 0)} skus`);
  }
  if (after.length !== next.length) {
    console.error("\nCount does not match what went in. Restore from the backup above.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

// Re-issues the SKU numbers of products that are ALREADY live, from
// lib/catalog.ts, without touching anything else in the catalog.
//
//   npx tsx scripts/renumber-skus.ts large-text-tee            check only
//   npx tsx scripts/renumber-skus.ts large-text-tee --write    apply
//
// graft-catalog.ts deliberately refuses to overwrite a live product, which is
// right for its job (adding new ones) and useless for this one. seed-catalog.ts
// would work but writes the WHOLE seed file, which would publish the showcase
// placeholders that have never been real products. So this takes the live
// catalog, swaps in the named products' variants and skus from the file, and
// writes the union back — every other product passes through untouched.
//
// Price, description, badges and images are taken from the file too, because a
// product is either maintained in the file or it is not; silently keeping half
// of a live row and half of a file row is how the two drift apart.
//
// A dated backup of the live catalog is written first, always.
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

config({ path: ".env.local" });

const BACKUP_DIR = "backups";

async function main() {
  const args = process.argv.slice(2);
  const write = args.includes("--write");
  const wanted = args.filter((a) => !a.startsWith("--"));
  if (wanted.length === 0) {
    console.error("Name at least one live product id.");
    process.exit(1);
  }

  const { getCatalogFromDb, saveCatalogToDb } = await import("../lib/catalog-store");
  const { seedCatalog } = await import("../lib/catalog");

  const live = await getCatalogFromDb();
  mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backup = join(BACKUP_DIR, `catalog-${stamp}.json`);
  writeFileSync(backup, JSON.stringify(live, null, 2));
  console.log(`Backed up ${live.length} live product(s) to ${backup}\n`);

  const next = [];
  let changed = 0;
  for (const p of live) {
    if (!wanted.includes(p.id)) {
      next.push(p);
      continue;
    }
    const from = seedCatalog.find((s) => s.id === p.id);
    if (!from) {
      console.error(`No product "${p.id}" in seedCatalog — cannot renumber it.`);
      process.exit(1);
    }
    console.log(`${p.slug}`);
    for (const v of from.variants) {
      const was = p.variants.find((x) => x.colour === v.colour);
      const before = was?.skus[0]?.id ?? "(new colour)";
      console.log(`   ${v.colour.padEnd(12)} ${String(before).padEnd(22)} ->  ${v.skus[0]?.id} …`);
    }
    next.push(from);
    changed++;
  }

  const missing = wanted.filter((id) => !live.some((p) => p.id === id));
  if (missing.length) {
    console.error(`\nNot live, so nothing to renumber: ${missing.join(", ")}`);
    console.error("Use graft-catalog.ts to add a product for the first time.");
    process.exit(1);
  }

  if (!write) {
    console.log(`\nCheck only. ${changed} product(s) would be rewritten. Re-run with --write.`);
    return;
  }

  // Clear the outgoing sku rows for these products FIRST.
  //
  // saveCatalogToDb upserts before it deletes, so that a failure halfway
  // through never orphans a row. That ordering is right for adding and
  // removing and impossible for RE-KEYING: `skus` has a unique constraint on
  // (variant_id, size), so for one moment the old MUR-TS-LT-BLK-XS and the new
  // 2690001001 both claim (black, XS) and the insert is rejected. Nothing is
  // lost by clearing them here -- these exact rows are about to be rewritten,
  // order_items.sku_id is `on delete set null`, and every past order carries
  // its own denormalised product name, colour, size and price.
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const variantIds = live
    .filter((p) => wanted.includes(p.id))
    .flatMap((p) => p.variants.map((v) => v.id));
  if (variantIds.length) {
    const { error } = await db.from("skus").delete().in("variant_id", variantIds);
    if (error) throw new Error(`Failed to clear old skus: ${error.message}`);
    console.log(`
Cleared old skus for ${variantIds.length} colourway(s).`);
  }

  await saveCatalogToDb(next);
  const after = await getCatalogFromDb();
  console.log(`\nCatalog holds ${after.length} products:`);
  for (const p of after) {
    console.log(`   ${p.slug} — ${p.variants.length} colours, ` +
      `${p.variants.reduce((n, v) => n + v.skus.length, 0)} skus, ` +
      `first sku ${p.variants[0]?.skus[0]?.id}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

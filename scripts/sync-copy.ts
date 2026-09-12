// Pushes description, details and price from lib/catalog.ts to the live rows
// of the named products -- and ONLY those three columns.
//
//   npx tsx scripts/sync-copy.ts large-text-tee small-logo-tee          check
//   npx tsx scripts/sync-copy.ts large-text-tee small-logo-tee --write  apply
//
// Why not renumber-skus.ts or a re-graft: both take the file's variants and
// images too, and the image order is now edited in /admin (it is how the
// card thumbnail is chosen). Copy lives in the file; photography order lives
// in the database; this moves the first without touching the second.

import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const args = process.argv.slice(2);
  const write = args.includes("--write");
  const ids = args.filter((a) => !a.startsWith("--"));
  if (!ids.length) {
    console.error("Name at least one product id.");
    process.exit(2);
  }
  const { seedCatalog } = await import("../lib/catalog");
  const { createClient } = await import("@supabase/supabase-js");
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  for (const id of ids) {
    const p = seedCatalog.find((x) => x.id === id);
    if (!p) {
      console.error(`No "${id}" in seedCatalog.`);
      process.exit(1);
    }
    const { data: live } = await db
      .from("products")
      .select("id,price,description,details")
      .eq("id", id)
      .maybeSingle();
    if (!live) {
      console.error(`"${id}" is not live -- graft it first.`);
      process.exit(1);
    }
    console.log(`${id}`);
    console.log(`   price        £${(live.price / 100).toFixed(2)} -> £${(p.price / 100).toFixed(2)}`);
    console.log(`   description  ${live.description.slice(0, 50)}… -> ${p.description.slice(0, 50)}…`);
    console.log(`   details      ${live.details.length} lines -> ${p.details.length} lines`);
    if (write) {
      const { error } = await db
        .from("products")
        .update({ price: p.price, description: p.description, details: p.details })
        .eq("id", id);
      if (error) {
        console.error(`   FAILED: ${error.message}`);
        process.exit(1);
      }
      console.log("   written");
    }
  }
  if (!write) console.log("\nCheck only. Re-run with --write to apply.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

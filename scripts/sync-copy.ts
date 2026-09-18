// Pushes name, slug, description, details and price from lib/catalog.ts to
// the live rows of the named products -- the words, and ONLY the words.
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
  const { db } = await import("../lib/db");
  const sql = db();

  for (const id of ids) {
    const p = seedCatalog.find((x) => x.id === id);
    if (!p) {
      console.error(`No "${id}" in seedCatalog.`);
      process.exit(1);
    }
    const [live] = (await sql`
      select id, name, slug, price, description, details from products where id = ${id}
    `) as { id: string; name: string; slug: string; price: number; description: string; details: string[] }[];
    if (!live) {
      console.error(`"${id}" is not live -- graft it first.`);
      process.exit(1);
    }
    console.log(`${id}`);
    if (live.name !== p.name) console.log(`   name         ${live.name} -> ${p.name}`);
    if (live.slug !== p.slug) console.log(`   slug         /product/${live.slug} -> /product/${p.slug}`);
    console.log(`   price        £${(live.price / 100).toFixed(2)} -> £${(p.price / 100).toFixed(2)}`);
    console.log(`   description  ${live.description.slice(0, 50)}… -> ${p.description.slice(0, 50)}…`);
    console.log(`   details      ${live.details.length} lines -> ${p.details.length} lines`);
    if (write) {
      try {
        await sql`
          update products
             set name = ${p.name}, slug = ${p.slug}, price = ${p.price},
                 description = ${p.description}, details = ${p.details}::text[]
           where id = ${id}
        `;
      } catch (e) {
        console.error(`   FAILED: ${(e as Error).message}`);
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

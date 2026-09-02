// One-off: repair UTF-8-as-latin1 mojibake ("â€”" etc.) in product text.
// Dry-runs by default; pass --write to apply.
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const db = createClient(url, key);

// Reverse the latin1 misdecode: each mojibake sequence's code points are the
// UTF-8 bytes of the intended character.
// cp1252's 0x80–0x9F block maps to these code points — reverse them so
// "â€”" (E2 80 94 misread as cp1252) round-trips back to an em-dash.
const CP1252: Record<number, number> = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a,
  0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92,
  0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c,
  0x017e: 0x9e, 0x0178: 0x9f,
};

function demojibake(s: string): string {
  if (!/[âÃ]/.test(s)) return s;
  try {
    const bytes = Uint8Array.from([...s].map((c) => {
      const cp = c.codePointAt(0)!;
      const mapped = CP1252[cp] ?? cp;
      if (mapped > 0xff) throw new Error("not mojibake");
      return mapped;
    }));
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return s; // not pure mojibake — leave untouched
  }
}

async function main() {
  const write = process.argv.includes("--write");
  const { data, error } = await db.from("products").select("id,name,description,details");
  if (error) throw error;

  for (const p of data!) {
    const desc = demojibake(p.description ?? "");
    const details = (p.details ?? []).map(demojibake);
    const changed =
      desc !== p.description || JSON.stringify(details) !== JSON.stringify(p.details);
    if (!changed) continue;

    console.log(`\n${p.name} (${p.id})`);
    if (desc !== p.description) console.log(`  desc: ${p.description}\n     -> ${desc}`);
    if (write) {
      const { error: e2 } = await db
        .from("products")
        .update({ description: desc, details })
        .eq("id", p.id);
      if (e2) throw e2;
      console.log("  updated ✔");
    }
  }
  console.log(write ? "\nDone." : "\nDry run — pass --write to apply.");
}

main();

// Database access: Neon Postgres over HTTP.
//
// Replaced Supabase on 2026-09-18. Every query in the app is server-side and
// runs as the database owner, so there is one connection string and one
// client — no anon/service split, and nothing for RLS to do.
//
// Neon's HTTP driver is used rather than a TCP pool because the app runs on
// serverless platforms (Vercel today, Cloudflare Workers next) where a
// connection cannot be kept between requests, and because Neon suspends the
// compute when idle: each query is one HTTPS request that wakes it. Queries
// that must succeed or fail together go through `sql.transaction([...])`,
// which sends them as one non-interactive transaction — so a statement may
// not depend on the result of an earlier one in the same batch. Where a
// dependency exists (an order's items need its id) the id is generated here
// first.

import { neon, NeonQueryFunction } from "@neondatabase/serverless";

export type Sql = NeonQueryFunction<false, false>;

export function dbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

let cached: Sql | null = null;

export function db(): Sql {
  if (cached) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Database is not configured (DATABASE_URL).");
  cached = neon(url, {
    // Next.js patches global fetch and may cache it; a query is never
    // cacheable. See the history of lib/supabase.ts for the day that cost.
    fetchOptions: { cache: "no-store" },
  });
  return cached;
}

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function supabaseConfigured() {
  return Boolean(url && anonKey);
}

// Next.js patches global fetch and caches by default, and supabase-js never
// opts individual requests out of that. Found this the hard way: after
// adding a column to a SELECT, `next dev` kept serving the pre-migration
// response shape indefinitely — right in Postgres, right over raw REST,
// right from the same supabase-js client called outside Next, but stale
// through every Next-served route until the dev server was restarted.
// `export const dynamic = "force-dynamic"` on a route does not reach into
// nested library fetches and force them not to cache. Passing a fetch that
// always sets `cache: "no-store"` fixes it at the one place every catalog
// read goes through, instead of relying on remembering to restart whenever
// a query shape changes.
const noStoreFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, cache: "no-store" });

/**
 * Anon client. Reads public catalog data; every write it attempts is refused
 * by RLS. Safe to use anywhere.
 */
export function supabasePublic(): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)."
    );
  }
  return createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { fetch: noStoreFetch },
  });
}

/**
 * Service-role client. Bypasses RLS entirely, so it must never be constructed
 * in code that can reach the browser — server route handlers and scripts only.
 * The key is deliberately not NEXT_PUBLIC_*, so importing this into a client
 * component fails loudly rather than shipping the key to users.
 */
export function supabaseAdmin(): SupabaseClient {
  if (!url || !serviceKey) {
    throw new Error(
      "Supabase admin is not configured (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)."
    );
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
    global: { fetch: noStoreFetch },
  });
}

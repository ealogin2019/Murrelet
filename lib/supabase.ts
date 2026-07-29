import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function supabaseConfigured() {
  return Boolean(url && anonKey);
}

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
  return createClient(url, anonKey, { auth: { persistSession: false } });
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
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

// Supabase Storage client — the last thing still on Supabase.
//
// The database moved to Neon on 2026-09-18 (lib/db.ts). Only the private
// `shipping-labels` bucket used by lib/shipping.ts remains here, until the
// files move to Cloudflare R2. Server-only: the key is not NEXT_PUBLIC_*, so
// importing this into a client component fails loudly.

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function supabaseAdmin(): SupabaseClient {
  if (!url || !serviceKey) {
    throw new Error(
      "Supabase storage is not configured (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)."
    );
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
}

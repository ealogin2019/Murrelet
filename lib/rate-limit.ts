// Rate limiting for the admin login, backed by Postgres.
//
// An earlier version kept counters in memory. That does not work on Vercel:
// consecutive requests are served by different instances, so each one saw a
// count of 1 and the limit never engaged. Measured, six requests hit six
// instances. The state has to be shared, so it lives in the database and the
// increment happens inside a single statement (see the admin_rate_limit
// function) rather than as a read-then-write from the app.

import { supabaseAdmin, supabaseConfigured } from "./supabase";

const MAX_ATTEMPTS = 8;
const WINDOW = "10 minutes";

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

export async function checkRateLimit(key: string): Promise<RateLimitResult> {
  // With no database there is nothing to count in. Allow the attempt rather
  // than locking the owner out of their own admin panel — the password is
  // what actually guards this, and a broken limiter must not become an
  // outage.
  if (!supabaseConfigured()) return { allowed: true, retryAfterSeconds: 0 };

  try {
    const { data, error } = await supabaseAdmin()
      .rpc("admin_rate_limit", {
        p_key: key,
        p_max: MAX_ATTEMPTS,
        p_window: WINDOW,
      })
      .single<{ allowed: boolean; retry_after: number }>();

    if (error || !data) throw error ?? new Error("no rate limit row returned");
    return { allowed: data.allowed, retryAfterSeconds: data.retry_after };
  } catch (err) {
    // Same reasoning as above: fail open, but loudly, so a database problem
    // shows up in the logs instead of silently disabling the limiter.
    console.error("Rate limit check failed; allowing attempt:", err);
    return { allowed: true, retryAfterSeconds: 0 };
  }
}

export async function clearRateLimit(key: string): Promise<void> {
  if (!supabaseConfigured()) return;
  try {
    await supabaseAdmin().rpc("admin_rate_limit_clear", { p_key: key });
  } catch (err) {
    console.error("Rate limit clear failed:", err);
  }
}

/**
 * Best-effort client identity. x-forwarded-for is attacker-controlled in
 * general, but on Vercel the platform sets it, so the first entry is the real
 * client. Falls back to a shared bucket, which fails closed (everyone shares
 * one limit) rather than open.
 */
export function clientKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || "unknown";
}

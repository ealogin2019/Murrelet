// Fixed-window rate limiter for the admin login.
//
// Deliberately in-memory. On Vercel each serverless instance keeps its own
// counter, so a determined attacker spread across many cold starts gets more
// attempts than the nominal limit — this raises the cost of brute force, it
// does not make it impossible. The actual defence is a strong password; this
// is the layer underneath it.
//
// If admin access ever guards customer data, replace this with a counter in
// Postgres so the limit is global rather than per-instance.

type Window = { count: number; resetAt: number };

const attempts = new Map<string, Window>();

const MAX_ATTEMPTS = 8;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes

/** Drops expired windows so the map cannot grow without bound. */
function sweep(now: number) {
  for (const [key, win] of attempts) {
    if (win.resetAt <= now) attempts.delete(key);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  if (attempts.size > 500) sweep(now);

  const win = attempts.get(key);
  if (!win || win.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1, retryAfterSeconds: 0 };
  }

  win.count += 1;
  if (win.count > MAX_ATTEMPTS) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((win.resetAt - now) / 1000),
    };
  }
  return {
    allowed: true,
    remaining: MAX_ATTEMPTS - win.count,
    retryAfterSeconds: 0,
  };
}

/** A successful login clears the window so a typo doesn't linger. */
export function clearRateLimit(key: string) {
  attempts.delete(key);
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

import { NextRequest, NextResponse } from "next/server";

// Inlined from lib/auth.ts so the Edge runtime has no external module to resolve.
const ADMIN_COOKIE = "murrelet_admin";
const encoder = new TextEncoder();

async function getKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function toBase64Url(bytes: ArrayBuffer) {
  const bin = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function timingSafeEqualStr(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return false;

  const [expiresStr, sig] = token.split(".");
  if (!expiresStr || !sig) return false;

  const expires = Number(expiresStr);
  if (!Number.isFinite(expires) || Date.now() > expires) return false;

  const key = await getKey(secret);
  const expectedSig = toBase64Url(await crypto.subtle.sign("HMAC", key, encoder.encode(expiresStr)));
  return timingSafeEqualStr(sig, expectedSig);
}

/**
 * While the store is in development the WHOLE site sits behind a password,
 * not just /admin.
 *
 * Two exemptions, both deliberate:
 *
 *   /api/stripe/webhook   Stripe cannot present a password. It authenticates
 *                         with a signature over the raw body instead, which is
 *                         stronger than basic auth, and gating it would mean
 *                         paid orders silently never reach the database.
 *
 *   _next/static, images  Served before middleware in most cases and useless
 *                         on their own; gating them only breaks the login
 *                         prompt's own styling.
 *
 * Fails CLOSED. If SITE_PASSWORD is missing in production the site refuses
 * everyone rather than quietly serving to the public -- a typo in an
 * environment variable should not be the difference between private and
 * launched. Development is never gated, so local work is unaffected.
 */
const PUBLIC_PREFIXES = ["/api/stripe/webhook"];

function unauthorized(message: string) {
  return new NextResponse(message, {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Murrelet — in development", charset="UTF-8"',
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}

function sitePasswordOk(req: NextRequest): boolean | null {
  if (process.env.NODE_ENV === "development") return true;
  const expected = process.env.SITE_PASSWORD;
  if (!expected) return null; // misconfigured -- fail closed, say so
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return false;
  let decoded: string;
  try {
    decoded = atob(header.slice(6));
  } catch {
    return false;
  }
  const i = decoded.indexOf(":");
  if (i < 0) return false;
  const user = decoded.slice(0, i);
  const pass = decoded.slice(i + 1);
  const expectedUser = process.env.SITE_USER || "murrelet";
  // Compare both, and always both, so the reply time does not say which was wrong.
  const okUser = timingSafeEqualStr(user, expectedUser);
  const okPass = timingSafeEqualStr(pass, expected);
  return okUser && okPass;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    const ok = sitePasswordOk(req);
    if (ok === null) {
      return new NextResponse(
        "This site is private and SITE_PASSWORD is not configured.",
        { status: 503, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } }
      );
    }
    if (!ok) return unauthorized("Authentication required.");
  }

  if (!pathname.startsWith("/admin") && !pathname.startsWith("/api/admin")) {
    return NextResponse.next();
  }

  // Let the login page and the login/logout API routes through unauthenticated.
  if (
    pathname === "/admin/login" ||
    pathname === "/api/admin/login" ||
    pathname === "/api/admin/logout"
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  const valid = await verifySessionToken(token);

  if (!valid) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }
    const loginUrl = new URL("/admin/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

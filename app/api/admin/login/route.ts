import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, checkPassword, createSessionToken } from "@/lib/auth";
import { checkRateLimit, clearRateLimit, clientKey } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  if (!process.env.ADMIN_PASSWORD || !process.env.ADMIN_SESSION_SECRET) {
    return NextResponse.json(
      { error: "Admin login isn't configured yet. Set ADMIN_PASSWORD and ADMIN_SESSION_SECRET." },
      { status: 500 }
    );
  }

  // Rate limit before touching the password, so an attacker cannot use
  // response timing to tell a throttled attempt from a wrong one.
  const key = clientKey(req);
  const limit = checkRateLimit(key);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const body = await req.json().catch(() => null);
  const password = body?.password;

  if (typeof password !== "string" || !checkPassword(password)) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  clearRateLimit(key);
  const token = await createSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}

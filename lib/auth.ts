// Minimal single-password admin auth. Uses Web Crypto (available in both the
// Edge middleware runtime and the Node route handler runtime) so this file
// works unmodified in both places.

export const ADMIN_COOKIE = "murrelet_admin";
const SESSION_LENGTH_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

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

export async function createSessionToken(): Promise<string> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not set.");
  const expires = Date.now() + SESSION_LENGTH_MS;
  const key = await getKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(String(expires)));
  return `${expires}.${toBase64Url(sig)}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
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

export function checkPassword(candidate: string): boolean {
  const actual = process.env.ADMIN_PASSWORD;
  if (!actual) return false;
  return timingSafeEqualStr(candidate, actual);
}

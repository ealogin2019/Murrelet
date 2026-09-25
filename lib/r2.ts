// Files: Cloudflare R2, spoken to over its S3 API.
//
// Two buckets, because a bucket is the unit of public access in R2. The
// public one (R2_BUCKET) has a public URL and holds admin uploads and the hero
// document. The private one (R2_PRIVATE_BUCKET) has no public URL at all and
// holds shipping labels, which carry a customer's name and address — those are
// read only through signed URLs that expire. A single bucket with a `labels/`
// prefix was the first attempt and was wrong: enabling the public URL exposes
// every key in the bucket to anyone who can guess one.
//
// aws4fetch rather than the AWS SDK because it is a few kilobytes and runs
// unchanged on Cloudflare Workers.

import { AwsClient } from "aws4fetch";

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  privateBucket: string;
  publicUrl: string;
};

export function r2Configured(): boolean {
  return Boolean(config());
}

function config(): R2Config | null {
  const {
    R2_ACCOUNT_ID: accountId,
    R2_ACCESS_KEY_ID: accessKeyId,
    R2_SECRET_ACCESS_KEY: secretAccessKey,
    R2_BUCKET: bucket,
    R2_PRIVATE_BUCKET: privateBucket,
    R2_PUBLIC_URL: publicUrl,
  } = process.env;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !privateBucket || !publicUrl) {
    return null;
  }
  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    privateBucket,
    publicUrl: publicUrl.replace(/\/$/, ""),
  };
}

function need(): R2Config {
  const cfg = config();
  if (!cfg) {
    throw new Error(
      "R2 is not configured (R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / " +
        "R2_BUCKET / R2_PRIVATE_BUCKET / R2_PUBLIC_URL)."
    );
  }
  return cfg;
}

function client(cfg: R2Config) {
  return new AwsClient({
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    service: "s3",
    region: "auto",
  });
}

/** `private` selects the bucket with no public URL. */
function objectUrl(cfg: R2Config, key: string, priv: boolean): string {
  const bucket = priv ? cfg.privateBucket : cfg.bucket;
  return `https://${cfg.accountId}.r2.cloudflarestorage.com/${bucket}/${key
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

/** Public URL of a key in the public bucket. */
export function publicUrl(key: string): string {
  return `${need().publicUrl}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

export async function putObject(
  key: string,
  body: Blob | ArrayBuffer | Uint8Array | string,
  contentType: string,
  priv = false
): Promise<void> {
  const cfg = need();
  const res = await client(cfg).fetch(objectUrl(cfg, key, priv), {
    method: "PUT",
    body: body instanceof Uint8Array ? new Blob([body as BlobPart]) : body,
    headers: { "content-type": contentType },
  });
  if (!res.ok) throw new Error(`R2 put ${key} failed: ${res.status} ${await res.text()}`);
}

/** The object's body, or null if there is no such key. */
export async function getObject(key: string, priv = false): Promise<Response | null> {
  const cfg = need();
  const res = await client(cfg).fetch(objectUrl(cfg, key, priv), {
    cache: "no-store",
  } as RequestInit);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`R2 get ${key} failed: ${res.status}`);
  return res;
}

/** A URL that reads a key in the PRIVATE bucket for `ttlSeconds`, then stops
 *  working. The only way anything in that bucket is ever read by a browser. */
export async function signedUrl(key: string, ttlSeconds: number): Promise<string> {
  const cfg = need();
  const url = new URL(objectUrl(cfg, key, true));
  url.searchParams.set("X-Amz-Expires", String(ttlSeconds));
  const signed = await client(cfg).sign(new Request(url, { method: "GET" }), {
    aws: { signQuery: true },
  });
  return signed.url;
}

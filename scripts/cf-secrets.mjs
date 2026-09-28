// Uploads the Worker's runtime secrets to Cloudflare from .env.local.
//
//   node scripts/cf-secrets.mjs            show which names would be sent
//   node scripts/cf-secrets.mjs --write    send them (wrangler secret bulk)
//
// Values are piped straight to wrangler on stdin and never printed or written
// to disk. Only the names below are sent -- nothing else in .env.local.
// NEXT_PUBLIC_* are absent on purpose: Next inlines those at BUILD time, so
// they must be in the environment when `npm run cf:build` runs, not here.
import { readFileSync } from "fs";
import { spawnSync } from "child_process";

const RUNTIME = [
  "DATABASE_URL",
  "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET",
  "RESEND_API_KEY", "MAIL_FROM", "MAIL_REPLY_TO",
  "ADMIN_PASSWORD", "ADMIN_SESSION_SECRET",
  "SITE_PASSWORD", "SITE_USER",
  "R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET", "R2_PRIVATE_BUCKET", "R2_PUBLIC_URL",
  "SENDCLOUD_PUBLIC_KEY", "SENDCLOUD_SECRET_KEY", "SENDCLOUD_WEBHOOK_SECRET",
  "SENDCLOUD_SENDER_ADDRESS_ID", "SENDCLOUD_SHIPPING_OPTION_CODE", "SENDCLOUD_TEST_MODE",
];
// Without these the live site either refuses to serve or cannot take money.
const REQUIRED = ["DATABASE_URL", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "SITE_PASSWORD",
  "ADMIN_PASSWORD", "ADMIN_SESSION_SECRET", "R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "R2_PRIVATE_BUCKET", "R2_PUBLIC_URL"];

const env = {};
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!m) continue;
  let v = m[2].trim();
  if (/^".*"$/.test(v)) v = v.slice(1, -1);
  if (v) env[m[1]] = v;
}

const send = Object.fromEntries(RUNTIME.filter((k) => env[k]).map((k) => [k, env[k]]));
const missing = REQUIRED.filter((k) => !env[k]);
console.log(`Would send ${Object.keys(send).length}: ${Object.keys(send).join(", ")}`);
if (missing.length) {
  console.log(`\nMISSING from .env.local (set each yourself: npx wrangler secret put NAME):\n  ${missing.join("\n  ")}`);
}
if (!process.argv.includes("--write")) {
  console.log("\nCheck only. Re-run with --write to upload.");
  process.exit(0);
}
const r = spawnSync("npx", ["wrangler", "secret", "bulk"], {
  input: JSON.stringify(send), stdio: ["pipe", "inherit", "inherit"], shell: true,
});
process.exit(r.status ?? 1);

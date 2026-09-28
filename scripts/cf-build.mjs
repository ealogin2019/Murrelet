// Builds the Cloudflare Worker with the PRODUCTION public URL baked in.
//
// NEXT_PUBLIC_* values are inlined at build time, and a local build reads
// .env.local, whose NEXT_PUBLIC_SITE_URL is http://localhost:3000 for dev.
// A Worker built from that sends paying customers back to localhost after
// Stripe checkout. A real environment variable outranks every .env file, so
// it is set here, for this build only.
import { spawnSync } from "child_process";

const SITE = "https://murrelet.co.uk";
const env = { ...process.env, NEXT_PUBLIC_SITE_URL: SITE };
console.log(`Building the Worker with NEXT_PUBLIC_SITE_URL=${SITE}`);
const r = spawnSync("npx", ["opennextjs-cloudflare", "build"], { stdio: "inherit", env, shell: true });
process.exit(r.status ?? 1);

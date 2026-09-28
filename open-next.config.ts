// OpenNext adapter config for Cloudflare Workers.
//
// No incremental cache is configured on purpose: every page that reads the
// catalogue is force-dynamic and goes to Neon per request, so there is
// nothing for an ISR cache to hold. Static pages ship as Workers assets.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig();

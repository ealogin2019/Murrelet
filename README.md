# Murrelet Store

A small storefront (36 seed products: t-shirts, jeans, hoodies, jumpers) built with Next.js and Stripe Checkout, with a password-protected admin panel for editing products and the homepage carousel from a browser — no code editing required after launch.

## What's included

- Shop page with category filters and a homepage hero image carousel
- Product detail pages with size selection
- Cart (persisted in the browser)
- Stripe Checkout integration with two shipping options (standard / express, free over $75), pricing looked up server-side at checkout so a tampered request can't change what's charged
- `/admin` — a minimal password-protected dashboard to edit products (name, price, category, sizes, description, photo) and the homepage carousel (images, headline text, order), backed by Vercel Blob storage
- Success and cancel pages

## 1. Install dependencies

```bash
npm install
```

## 2. Add your Stripe keys

Copy `.env.example` to `.env.local` and fill in your Stripe keys (Dashboard → Developers → API keys):

```bash
cp .env.example .env.local
```

```
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Use your **test** keys first. Test the full checkout flow with Stripe's test card `4242 4242 4242 4242`, any future expiry, any CVC. Switch to live keys (`sk_live_` / `pk_live_`) only once you're ready to accept real payments.

## 3. Run locally

```bash
npm run dev
```

Visit `http://localhost:3000`. The admin panel (see below) needs a couple more env vars and, for saving changes, a Vercel Blob store — the storefront itself works without them, showing the built-in seed catalog and hero images read-only.

## 4. Set up the admin panel

The admin panel lives at `/admin` and lets you edit products and the homepage carousel from a browser — no code, no redeploys. It needs three things:

**a. A password.** Add to `.env.local` (and later to your Vercel project's environment variables):
```
ADMIN_PASSWORD=pick-something-only-you-know
ADMIN_SESSION_SECRET=a-long-random-string
```
Generate the secret with `openssl rand -hex 32` (or any random 32+ character string) — it's used to sign the login session, not shown to anyone.

**b. A Blob store**, so edits actually persist (otherwise the site always shows the same built-in seed data). On [vercel.com](https://vercel.com), open your project → **Storage** tab → **Create Database** → **Blob** → attach it to this project. Vercel automatically adds a `BLOB_READ_WRITE_TOKEN` environment variable for you — nothing to copy by hand. For local dev, run `vercel env pull .env.local` afterward to pull that token down too.

**c. That's it.** Visit `/admin`, sign in with `ADMIN_PASSWORD`, and you'll see two tabs:
- **Products** — edit name, category, price, sizes, description, and photo for any existing product; add new ones; delete ones you don't sell. Click a thumbnail to upload a new photo (uploads instantly to Blob); click **Save changes** to publish everything at once.
- **Homepage carousel** — the rotating hero images. Upload photos, edit the headline/subheading text shown over each, reorder with the ↑/↓ buttons, add or remove slides, then **Save changes**.

Changes go live immediately for everyone — no rebuild or redeploy needed, since the storefront reads current data from Blob on every page load.

## 5. Seed photos and catalog (before you touch `/admin`)

The 36 seed products and 3 hero images ship with the project so it looks complete on day one. Each product has `image` (a real photo) and `fallbackImage` (a light placeholder graphic) in `lib/products.ts` — if `image` is ever missing, the page quietly falls back to the placeholder instead of showing a broken image.

To fill in the remaining seed product photos: open `public/images/real/PHOTOS-NEEDED.md` — it lists a free stock photo (Pexels, no attribution required) for every image slot, with the exact filename and folder to save it under. This step is optional once `/admin` is set up, since you can just upload real photos there instead — it's only useful for polishing the initial seed data before your first deploy.

`lib/products.ts` and `lib/hero.ts` are the **seed** data — they're what a fresh deploy shows before anyone has saved anything through `/admin`. After that, `/admin` is the source of truth; editing these files won't affect a live site that already has Blob data saved (though it's still handy for local dev, or for restoring a clean starting point).

## 6. Editing listings later

**Primary way: `/admin`** (see above) — this is what it's for. Log in from any browser, edit text and photos, hit save.

**Fallback, no `/admin` needed:** you can still hand-edit `lib/products.ts` on github.com (pencil icon → edit → commit) the way earlier versions of this README described. This only changes the *seed* data though, so it won't override anything already saved through `/admin` on a live site — use it for local dev or before your first deploy, not for day-to-day edits once the store is live.

## 7. Adjust shipping

Shipping rates are set in `app/api/checkout/route.ts` under `shipping_options` — currently a flat $5 standard rate (free over $75) and a $15 express rate. Edit the amounts, thresholds, or `allowed_countries` there. For more advanced shipping (weight- or location-based rates), configure [Stripe Shipping Rates](https://dashboard.stripe.com/settings/shipping/rates) in your Stripe Dashboard and reference the rate IDs instead.

## 8. Deploy (hosting)

Deploy on **Vercel** (built by the same team as Next.js, and required for the admin panel's Blob storage to work):

1. Push this project to a GitHub repo.
2. Go to [vercel.com/new](https://vercel.com/new), import the repo.
3. In the project's **Environment Variables** settings, add: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL` (your final domain, e.g. `https://yourstore.vercel.app`), `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`.
4. Deploy.
5. After the first deploy: project → **Storage** tab → **Create Database** → **Blob** → attach it. This adds `BLOB_READ_WRITE_TOKEN` automatically. Redeploy once (Deployments tab → ⋯ → Redeploy) so the new env var takes effect.
6. Visit `https://yourdomain/admin` and log in with `ADMIN_PASSWORD` to add your real products and hero images.

Vercel's free tier comfortably covers a store this size, including Blob storage.

### Custom domain

Once deployed, add your domain under the host's "Domains" settings and update `NEXT_PUBLIC_SITE_URL` to match — this is used to build the Stripe success/cancel redirect URLs.

## 9. Go live checklist

- [ ] Blob store attached in Vercel and `BLOB_READ_WRITE_TOKEN` present (redeploy once after attaching)
- [ ] `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` set in Vercel's environment variables (a real password, not the placeholder)
- [ ] Logged into `/admin` and replaced seed products with real ones (or edited them in place)
- [ ] Real hero carousel images and headline text set via `/admin`
- [ ] Prices double-checked
- [ ] Switched to Stripe **live** keys in the hosting provider's environment variables (not `.env.local`, which is only for local dev)
- [ ] Shipping countries/rates match what you can actually fulfill
- [ ] Test a full purchase with a real card in a small amount before announcing the store

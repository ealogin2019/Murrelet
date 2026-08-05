-- Category taxonomy moves from product-type (shirts/polo-shirts/shorts) to
-- demographic (men/women/kids), per the minimalist nav direction.
--
-- Postgres enums can't cheaply drop values without recreating the type and
-- every column that depends on it, and there's no real cost to leaving
-- unused labels in place — so the old three stay defined but unused rather
-- than forcing a type rebuild for a placeholder catalog that's about to be
-- replaced wholesale anyway.
--
-- ADD VALUE cannot run inside the same transaction as a statement that USES
-- the new value, so this migration only adds — the reseed that assigns
-- products to 'men' happens in a separate later connection (npm run
-- catalog:sync), never in this file.
alter type product_category add value if not exists 'men';
alter type product_category add value if not exists 'women';
alter type product_category add value if not exists 'kids';

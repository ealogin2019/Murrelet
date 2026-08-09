-- Second filter axis, alongside gender rather than replacing it: what kind
-- of garment (T-Shirts, Hoodies, ...), independent of who it's for. The
-- hero's category picker sets this; gender stays a separate, combinable
-- filter on the listing page.
--
-- Nullable, not required: a product with no type set just doesn't appear in
-- any type-filtered view (still shows in "all") rather than blocking a save
-- admin is actively using right now. Same pattern as skus.stock being
-- nullable for "not tracked yet".
create type product_type as enum (
  't-shirts',
  'hoodies',
  'sweatshirts',
  'socks',
  'trunks-boxers',
  'jeans',
  'puffer-jackets'
);

alter table products add column type product_type;

create index products_type_idx on products (type) where active;

-- Murrelet catalog + orders.
-- Target: Supabase project oinredsmcydvadbacqit.
-- All money is integer pence. Never numeric, never float.

create type product_category as enum ('shirts', 'polo-shirts', 'shorts');

-- ---------------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------------

create table products (
  id           text primary key,
  slug         text not null unique,
  name         text not null,
  category     product_category not null,
  description  text not null default '',
  details      text[] not null default '{}',
  badges       text[] not null default '{}',
  -- List price. A variant may undercut this; it may never exceed it silently.
  price        integer not null check (price >= 0),
  active       boolean not null default true,
  position     integer not null default 0,
  created_at   timestamptz not null default now()
);

create table variants (
  id          text primary key,
  product_id  text not null references products (id) on delete cascade,
  colour      text not null,
  swatch      text not null,
  -- NULL = inherits products.price. This is the whole "selected colours
  -- from £x" mechanism; do not backfill it with the product price.
  price       integer check (price >= 0),
  images      text[] not null default '{}',
  position    integer not null default 0,
  unique (product_id, colour)
);

create table skus (
  id          text primary key,
  variant_id  text not null references variants (id) on delete cascade,
  size        text not null,
  in_stock    boolean not null default true,
  -- NULL = not tracked (showcase mode). A number once inventory is real.
  stock       integer check (stock >= 0),
  position    integer not null default 0,
  unique (variant_id, size)
);

create index variants_product_id_idx on variants (product_id);
create index skus_variant_id_idx on skus (variant_id);
create index products_category_idx on products (category) where active;

-- ---------------------------------------------------------------------------
-- Orders
--
-- user_id is nullable and unused today: checkout is guest-only. It exists now
-- so that adding Supabase Auth later is purely additive — no backfill, no
-- rewrite of this table. Same for email, which is the guest's only identity.
-- ---------------------------------------------------------------------------

create table orders (
  id                     uuid primary key default gen_random_uuid(),
  order_number           text not null unique,
  email                  text not null,
  user_id                uuid references auth.users (id) on delete set null,
  status                 text not null default 'pending'
                           check (status in ('pending','paid','fulfilled','cancelled','refunded')),
  subtotal_pence         integer not null check (subtotal_pence >= 0),
  shipping_pence         integer not null default 0 check (shipping_pence >= 0),
  total_pence            integer not null check (total_pence >= 0),
  stripe_session_id      text unique,
  stripe_payment_intent  text,
  shipping_address       jsonb,
  created_at             timestamptz not null default now()
);

-- Line items snapshot their product text and price. Editing or deleting a
-- product must never change what a past order says it charged, so sku_id is
-- ON DELETE SET NULL rather than cascade.
create table order_items (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null references orders (id) on delete cascade,
  sku_id            text references skus (id) on delete set null,
  product_name      text not null,
  colour            text not null,
  size              text not null,
  unit_price_pence  integer not null check (unit_price_pence >= 0),
  quantity          integer not null check (quantity > 0),
  image_url         text
);

create index order_items_order_id_idx on order_items (order_id);
create index orders_email_idx on orders (email);
create index orders_user_id_idx on orders (user_id);

-- ---------------------------------------------------------------------------
-- RLS
--
-- Catalog: world-readable when active. Writes go through the service role
-- (the admin panel), never the anon key.
-- Orders: no public policy at all. The Stripe webhook writes them with the
-- service role; the success page reads one back by stripe_session_id through
-- a server route, not from the browser.
-- ---------------------------------------------------------------------------

alter table products    enable row level security;
alter table variants    enable row level security;
alter table skus        enable row level security;
alter table orders      enable row level security;
alter table order_items enable row level security;

create policy "active products are public"
  on products for select using (active);

create policy "variants of active products are public"
  on variants for select using (
    exists (select 1 from products p where p.id = variants.product_id and p.active)
  );

create policy "skus of active products are public"
  on skus for select using (
    exists (
      select 1 from variants v
      join products p on p.id = v.product_id
      where v.id = skus.variant_id and p.active
    )
  );

-- Deliberately no select/insert/update policy on orders or order_items.
-- Service role bypasses RLS; everyone else gets nothing.

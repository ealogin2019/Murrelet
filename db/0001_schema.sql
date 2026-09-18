-- Murrelet store schema for Neon (plain Postgres, no Supabase).
-- Derived 2026-09-18 from the seven supabase/migrations/*.sql files as applied
-- to project oinredsmcydvadbacqit, minus RLS, policies, role grants, the
-- storage bucket and the auth.users foreign key (user_id stays as a bare uuid).
-- Every query runs server-side with the owner role, so there is nothing for
-- RLS to protect.
--
-- Apply to an empty database (Git Bash; DATABASE_URL from .env.local):
--   export DATABASE_URL=...
--   MSYS_NO_PATHCONV=1 docker run --rm -i -e DATABASE_URL postgres:17-alpine \
--     psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q < db/0001_schema.sql
--
-- Schema changes from here on are new files in this directory, numbered
-- 0002_..., applied the same way; this file is not re-run against a live db.

-- Functions are declared before the tables they touch.
SET check_function_bodies = false;

CREATE TYPE "public"."product_category" AS ENUM (
    'shirts',
    'polo-shirts',
    'shorts',
    'men',
    'women',
    'kids'
);

CREATE TYPE "public"."product_type" AS ENUM (
    't-shirts',
    'hoodies',
    'sweatshirts',
    'socks',
    'trunks-boxers',
    'jeans',
    'puffer-jackets'
);

CREATE OR REPLACE FUNCTION "public"."admin_rate_limit"("p_key" "text", "p_max" integer, "p_window" interval) RETURNS TABLE("allowed" boolean, "retry_after" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_count    integer;
  v_reset_at timestamptz;
begin
  insert into admin_login_attempts as a (key, count, reset_at)
  values (p_key, 1, now() + p_window)
  on conflict (key) do update
    set count    = case when a.reset_at <= now() then 1 else a.count + 1 end,
        reset_at = case when a.reset_at <= now() then now() + p_window else a.reset_at end
  returning a.count, a.reset_at into v_count, v_reset_at;

  return query
  select
    v_count <= p_max,
    greatest(0, ceil(extract(epoch from (v_reset_at - now())))::integer);
end;
$$;

CREATE OR REPLACE FUNCTION "public"."admin_rate_limit_clear"("p_key" "text") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  delete from admin_login_attempts where key = p_key;
$$;

CREATE OR REPLACE FUNCTION "public"."decrement_stock_for_order"("p_order_id" "uuid") RETURNS TABLE("sku_id" "text", "remaining" integer, "sold" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  return query
  with sold_lines as (
    -- One row per sku even if the same sku appears on several order lines.
    select oi.sku_id as id, sum(oi.quantity)::integer as qty
    from order_items oi
    where oi.order_id = p_order_id and oi.sku_id is not null
    group by oi.sku_id
  )
  update skus s
     -- Clamped at zero on purpose. The money has already been taken by the
     -- time this runs, so a shortfall must not raise: the check constraint
     -- would abort the webhook, Stripe would retry it forever, and the order
     -- would never be marked settled. Going to zero and off sale is the
     -- recoverable outcome; the shortfall shows up as remaining = 0 with
     -- sold > 0 for someone to look at.
     set stock = greatest(s.stock - sold_lines.qty, 0),
         -- Selling the last one takes it off sale. Nothing puts it back
         -- automatically; restocking is a deliberate act in the admin panel.
         in_stock = case when s.stock - sold_lines.qty <= 0 then false else s.in_stock end
    from sold_lines
   where s.id = sold_lines.id
     and s.stock is not null
  returning s.id, s.stock, sold_lines.qty;
end;
$$;

CREATE TABLE IF NOT EXISTS "public"."admin_login_attempts" (
    "key" "text" NOT NULL,
    "count" integer DEFAULT 0 NOT NULL,
    "reset_at" timestamp with time zone NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "sku_id" "text",
    "product_name" "text" NOT NULL,
    "colour" "text" NOT NULL,
    "size" "text" NOT NULL,
    "unit_price_pence" integer NOT NULL,
    "quantity" integer NOT NULL,
    "image_url" "text",
    CONSTRAINT "order_items_quantity_check" CHECK (("quantity" > 0)),
    CONSTRAINT "order_items_unit_price_pence_check" CHECK (("unit_price_pence" >= 0))
);

CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_number" "text" NOT NULL,
    "email" "text",
    "user_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "subtotal_pence" integer NOT NULL,
    "shipping_pence" integer DEFAULT 0 NOT NULL,
    "total_pence" integer,
    "stripe_session_id" "text",
    "stripe_payment_intent" "text",
    "shipping_address" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "customer_name" "text",
    "carrier" "text",
    "tracking_number" "text",
    "tracking_url" "text",
    "label_path" "text",
    "sendcloud_parcel_id" bigint,
    "carrier_cost_pence" integer,
    "label_created_at" timestamp with time zone,
    "shipped_at" timestamp with time zone,
    "delivered_at" timestamp with time zone,
    CONSTRAINT "orders_shipping_pence_check" CHECK (("shipping_pence" >= 0)),
    CONSTRAINT "orders_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'paid'::"text", 'shipped'::"text", 'delivered'::"text", 'fulfilled'::"text", 'cancelled'::"text", 'refunded'::"text"]))),
    CONSTRAINT "orders_subtotal_pence_check" CHECK (("subtotal_pence" >= 0)),
    CONSTRAINT "orders_total_pence_check" CHECK (("total_pence" >= 0))
);

CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "category" "public"."product_category" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "details" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "badges" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "price" integer NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "type" "public"."product_type",
    CONSTRAINT "products_price_check" CHECK (("price" >= 0))
);

CREATE TABLE IF NOT EXISTS "public"."skus" (
    "id" "text" NOT NULL,
    "variant_id" "text" NOT NULL,
    "size" "text" NOT NULL,
    "in_stock" boolean DEFAULT true NOT NULL,
    "stock" integer,
    "position" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "skus_stock_check" CHECK (("stock" >= 0))
);

CREATE TABLE IF NOT EXISTS "public"."variants" (
    "id" "text" NOT NULL,
    "product_id" "text" NOT NULL,
    "colour" "text" NOT NULL,
    "swatch" "text" NOT NULL,
    "price" integer,
    "images" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "variants_price_check" CHECK (("price" >= 0))
);

ALTER TABLE ONLY "public"."admin_login_attempts"
    ADD CONSTRAINT "admin_login_attempts_pkey" PRIMARY KEY ("key");

ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_order_number_key" UNIQUE ("order_number");

ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_stripe_session_id_key" UNIQUE ("stripe_session_id");

ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_slug_key" UNIQUE ("slug");

ALTER TABLE ONLY "public"."skus"
    ADD CONSTRAINT "skus_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."skus"
    ADD CONSTRAINT "skus_variant_id_size_key" UNIQUE ("variant_id", "size");

ALTER TABLE ONLY "public"."variants"
    ADD CONSTRAINT "variants_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."variants"
    ADD CONSTRAINT "variants_product_id_colour_key" UNIQUE ("product_id", "colour");

CREATE INDEX "admin_login_attempts_reset_at_idx" ON "public"."admin_login_attempts" USING "btree" ("reset_at");

CREATE INDEX "order_items_order_id_idx" ON "public"."order_items" USING "btree" ("order_id");

CREATE INDEX "orders_email_idx" ON "public"."orders" USING "btree" ("email");

CREATE INDEX "orders_sendcloud_parcel_id_idx" ON "public"."orders" USING "btree" ("sendcloud_parcel_id") WHERE ("sendcloud_parcel_id" IS NOT NULL);

CREATE INDEX "orders_user_id_idx" ON "public"."orders" USING "btree" ("user_id");

CREATE INDEX "products_category_idx" ON "public"."products" USING "btree" ("category") WHERE "active";

CREATE INDEX "products_type_idx" ON "public"."products" USING "btree" ("type") WHERE "active";

CREATE INDEX "skus_variant_id_idx" ON "public"."skus" USING "btree" ("variant_id");

CREATE INDEX "variants_product_id_idx" ON "public"."variants" USING "btree" ("product_id");

ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "public"."skus"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."skus"
    ADD CONSTRAINT "skus_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."variants"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."variants"
    ADD CONSTRAINT "variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;

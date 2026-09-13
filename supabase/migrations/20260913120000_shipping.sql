-- Shipping via Sendcloud.
--
-- An order gains a label, tracking and two more states. The shape follows what
-- Hyms learned running the same carrier integration for a season:
--
--   paid              money in. Nothing has moved.
--   paid + label      a label exists. STILL 'paid' -- a label is not a parcel
--                     in a van. Sendcloud emits "announced" scans the moment a
--                     label is made, and treating those as movement marked
--                     Hyms orders shipped while they were still on the desk.
--   shipped           the carrier scanned it, or we pressed the button.
--   delivered         carrier delivery scan.
--
-- 'fulfilled' stays in the check so any existing row keeps its value; nothing
-- new is written with it.

alter table orders drop constraint if exists orders_status_check;
alter table orders add constraint orders_status_check
  check (status in ('pending','paid','shipped','delivered','fulfilled','cancelled','refunded'));

alter table orders
  add column if not exists customer_name        text,
  add column if not exists carrier              text,
  add column if not exists tracking_number      text,
  add column if not exists tracking_url         text,
  -- path inside the private shipping-labels bucket; a signed URL is minted on demand
  add column if not exists label_path           text,
  add column if not exists sendcloud_parcel_id  bigint,
  -- what Sendcloud will bill for the label, so shipping charged vs paid is measurable
  add column if not exists carrier_cost_pence   integer,
  add column if not exists label_created_at     timestamptz,
  add column if not exists shipped_at           timestamptz,
  add column if not exists delivered_at         timestamptz;

create index if not exists orders_sendcloud_parcel_id_idx on orders (sendcloud_parcel_id)
  where sendcloud_parcel_id is not null;

-- Labels carry a customer's name and address. Private bucket; served only via
-- signed URLs from the admin.
insert into storage.buckets (id, name, public)
values ('shipping-labels', 'shipping-labels', false)
on conflict (id) do nothing;

-- An order is created before payment, so that the line items and the prices
-- charged are recorded at the moment the Stripe session is made rather than
-- reconstructed from a webhook payload afterwards. At that point there is no
-- customer email yet — Stripe collects it on the hosted page.
alter table orders alter column email drop not null;

-- Totals are unknown until Stripe reports the shipping option chosen.
alter table orders alter column total_pence drop not null;

-- Guards against a webhook (which can be delivered more than once) creating
-- a second row for a session that already has one.
create unique index if not exists orders_stripe_session_id_key
  on orders (stripe_session_id)
  where stripe_session_id is not null;

-- Decrementing stock when an order is paid.
--
-- This has to happen inside the database, not as a read-then-write from the
-- webhook handler. Two customers buying the last item at the same moment both
-- read stock = 1, both write 0, and two are sold. `stock - n` here is
-- evaluated against the row Postgres holds locked for the update, so the
-- second caller sees the first one's result rather than a stale copy.
--
-- Untracked SKUs (stock is null) are showcase mode. The `stock is not null`
-- guard skips them entirely, so turning tracking on stays a deliberate act
-- per SKU rather than something a sale does by accident.
--
-- Idempotency is the caller's job, not this function's: running it twice for
-- one order would decrement twice. The webhook calls it only on the pending ->
-- paid transition that markOrderPaid actually performed, which happens at most
-- once per order however many times Stripe retries.

create or replace function decrement_stock_for_order(p_order_id uuid)
returns table (sku_id text, remaining integer, sold integer)
language plpgsql
security definer
set search_path = public
as $$
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

-- Only the server may run this. anon and authenticated are the keys that ship
-- to browsers; neither has any business moving inventory.
revoke all on function decrement_stock_for_order(uuid) from public, anon, authenticated;
grant execute on function decrement_stock_for_order(uuid) to service_role;

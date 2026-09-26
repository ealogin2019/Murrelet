-- Which delivery the customer paid for: 'standard', 'express' or 'ireland'.
--
-- The label code used to buy the cheapest contracted option for every order,
-- so a customer who paid £5.95 for express got Royal Mail Tracked 48 -- a
-- service they had paid extra not to receive. The checkout now tags each
-- Stripe rate with its service and the webhook records it here; the label
-- follows it. Null on orders from before 2026-09-26, read as standard.
alter table orders add column if not exists shipping_service text
  check (shipping_service in ('standard', 'express', 'ireland'));

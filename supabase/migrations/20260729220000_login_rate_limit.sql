-- Global rate limiting for the admin login.
--
-- The previous limiter was in-memory, which on Vercel means per-instance:
-- measured, six consecutive requests were served by six different instances,
-- so the counter never reached its threshold. The state has to be shared.

create table admin_login_attempts (
  key        text primary key,
  count      integer not null default 0,
  reset_at   timestamptz not null
);

alter table admin_login_attempts enable row level security;
-- No policies: only the service role touches this table.

/**
 * Records an attempt and reports whether it is allowed.
 *
 * The whole read-modify-write happens inside one statement so two concurrent
 * attempts cannot both read the same count and each believe they are under
 * the limit. ON CONFLICT takes a row lock, which serialises them.
 */
create or replace function admin_rate_limit(
  p_key    text,
  p_max    integer,
  p_window interval
)
returns table (allowed boolean, retry_after integer)
language plpgsql
security definer
set search_path = public
as $$
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

/** Clears the window after a successful login. */
create or replace function admin_rate_limit_clear(p_key text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from admin_login_attempts where key = p_key;
$$;

-- Housekeeping: nothing schedules this, but it keeps the table bounded if a
-- cron job is added later.
create index admin_login_attempts_reset_at_idx on admin_login_attempts (reset_at);

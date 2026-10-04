-- HealthChain-owned backend controls. Does not modify the unrelated growth tables.
create schema if not exists healthchain_private;
revoke all on schema healthchain_private from public, anon, authenticated;
grant usage on schema healthchain_private to service_role;

create table if not exists healthchain_private.healthchain_rate_limits (
  rate_key text primary key check (rate_key ~ '^[0-9a-f]{64}$'),
  hit_count integer not null check (hit_count > 0),
  expires_at timestamptz not null
);
alter table healthchain_private.healthchain_rate_limits enable row level security;
revoke all on healthchain_private.healthchain_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on healthchain_private.healthchain_rate_limits to service_role;
create index if not exists healthchain_rate_limits_expiry
  on healthchain_private.healthchain_rate_limits (expires_at);

create or replace function public.healthchain_consume_rate_limit(
  p_key text, p_limit integer, p_window_ms integer
) returns boolean language plpgsql security invoker set search_path = '' as $$
declare
  v_now timestamptz := clock_timestamp();
  v_count integer;
begin
  if p_key is null or p_key !~ '^[0-9a-f]{64}$' or p_limit is null or
     p_limit < 1 or p_limit > 100000 or p_window_ms is null or
     p_window_ms < 1000 or p_window_ms > 86400000 then
    raise exception 'Invalid rate-limit request' using errcode = '22023';
  end if;
  insert into healthchain_private.healthchain_rate_limits as current_limit (rate_key, hit_count, expires_at)
    values (p_key, 1, v_now + p_window_ms * interval '1 millisecond')
  on conflict (rate_key) do update set
    hit_count = case when current_limit.expires_at <= v_now then 1
                     else least(current_limit.hit_count + 1, p_limit + 1) end,
    expires_at = case when current_limit.expires_at <= v_now
                     then v_now + p_window_ms * interval '1 millisecond'
                     else current_limit.expires_at end
  returning hit_count into v_count;
  return v_count <= p_limit;
end;
$$;
revoke all on function public.healthchain_consume_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.healthchain_consume_rate_limit(text, integer, integer) to service_role;

create or replace function public.healthchain_prune_rate_limits()
returns integer language plpgsql security invoker set search_path = '' as $$
declare v_deleted integer;
begin
  delete from healthchain_private.healthchain_rate_limits where expires_at < clock_timestamp();
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;
revoke all on function public.healthchain_prune_rate_limits() from public, anon, authenticated;
grant execute on function public.healthchain_prune_rate_limits() to service_role;

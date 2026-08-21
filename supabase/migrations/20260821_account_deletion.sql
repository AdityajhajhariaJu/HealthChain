-- Delete all HealthChain-owned data for one account atomically. Auth identity
-- deletion remains in the API after this transaction succeeds.
create or replace function public.delete_healthchain_user_data(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.cases where user_id = p_user_id;
  delete from public.profiles where id = p_user_id;
  delete from public.health_memory where user_id = p_user_id;
  delete from public.user_devices where user_id = p_user_id;

  -- These tables are introduced by optional integrations/migrations. The
  -- existence guard keeps deletion compatible with older deployments while
  -- still including the data whenever the table is installed.
  if to_regclass('public.analytics_events') is not null then
    execute 'delete from public.analytics_events where user_id = $1' using p_user_id;
  end if;
  if to_regclass('public.payments') is not null then
    execute 'delete from public.payments where user_id = $1' using p_user_id;
  end if;
  if to_regclass('public.ai_requests') is not null then
    execute 'delete from public.ai_requests where user_id = $1' using p_user_id;
  end if;
  if to_regclass('public.ai_usage_daily') is not null then
    execute 'delete from public.ai_usage_daily where user_id = $1' using p_user_id;
  end if;
end;
$$;

revoke all on function public.delete_healthchain_user_data(uuid)
  from public, anon, authenticated;

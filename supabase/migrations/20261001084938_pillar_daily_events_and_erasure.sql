-- Add measured drinks and actual adherence events to the shared owner ledger.
alter table public.health_observations drop constraint if exists health_observations_kind_check;
alter table public.health_observations add constraint health_observations_kind_check
  check (kind in ('meal','symptom','bowel','daily_checkin','context','hydration','medication_dose'));
alter table public.health_observations add constraint health_observations_daily_payload_check check (
  (kind <> 'hydration' or coalesce((jsonb_typeof(payload->'amountMl') = 'number'
    and (payload->>'amountMl')::numeric > 0 and (payload->>'amountMl')::numeric <= 20000
    and payload->>'drinkType' in ('water','electrolyte','tea','lemon','coconut','sparkling')),false))
  and (kind <> 'medication_dose' or coalesce((length(payload->>'medicationId') between 1 and 200
    and length(payload->>'name') between 1 and 500
    and payload->>'status' in ('taken','skipped','unknown')),false))
);
-- A minimal operational tombstone prevents still-valid JWTs and in-flight
-- writes from recreating data while Auth deletion is completing.
create table if not exists public.account_erasure_tombstones (
  user_id uuid primary key,
  requested_at timestamptz not null default now()
);
alter table public.account_erasure_tombstones enable row level security;
revoke all on public.account_erasure_tombstones from public, anon, authenticated;
grant select, insert, update on public.account_erasure_tombstones to service_role;
create or replace function public.healthchain_reject_erased_owner_write()
returns trigger language plpgsql security definer set search_path = '' as $$
declare owner_id uuid;
begin
  owner_id := (to_jsonb(new)->>tg_argv[0])::uuid;
  if exists(select 1 from public.account_erasure_tombstones where user_id = owner_id) then
    raise exception 'This account has been deleted' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.healthchain_reject_erased_owner_write() from public, anon, authenticated;
do $$
declare item record;
begin
  for item in select c.table_name, c.column_name from information_schema.columns c
    join information_schema.tables t on t.table_schema=c.table_schema and t.table_name=c.table_name
    where c.table_schema='public' and t.table_type='BASE TABLE'
      and ((c.column_name='user_id' and c.data_type='uuid' and c.table_name <> 'account_erasure_tombstones')
        or (c.table_name='profiles' and c.column_name='id'))
  loop
    execute format('drop trigger if exists healthchain_erased_owner_guard on public.%I', item.table_name);
    execute format('create trigger healthchain_erased_owner_guard before insert or update on public.%I for each row execute function public.healthchain_reject_erased_owner_write(%L)', item.table_name, item.column_name);
  end loop;
end;
$$;
create or replace function public.delete_healthchain_user_data(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.account_erasure_tombstones(user_id) values(p_user_id) on conflict do nothing;
  if to_regclass('public.health_observations') is not null then
    execute 'delete from public.health_observations where user_id = $1' using p_user_id;
  end if;
  if to_regclass('public.cases') is not null then
    execute 'delete from public.cases where user_id = $1' using p_user_id;
  end if;
  if to_regclass('public.profiles') is not null then
    execute 'delete from public.profiles where id = $1' using p_user_id;
  end if;
  if to_regclass('public.health_memory') is not null then
    execute 'delete from public.health_memory where user_id = $1' using p_user_id;
  end if;
  if to_regclass('public.healthchain_profiles') is not null then
    execute 'delete from public.healthchain_profiles where user_id = $1' using p_user_id;
  end if;
  if to_regclass('public.user_devices') is not null then
    execute 'delete from public.user_devices where user_id = $1' using p_user_id;
  end if;
  if to_regclass('public.analytics_events') is not null then
    execute 'delete from public.analytics_events where user_id = $1' using p_user_id;
  end if;
  if to_regclass('public.user_quotas') is not null then
    execute 'delete from public.user_quotas where user_id = $1' using p_user_id;
  end if;
  if to_regclass('public.case_tombstones') is not null then
    execute 'delete from public.case_tombstones where user_id = $1' using p_user_id;
  end if;
  if to_regclass('public.payment_refunds') is not null and to_regclass('public.payments') is not null then
    execute 'delete from public.payment_refunds r using public.payments p where r.razorpay_payment_id = p.razorpay_payment_id and p.user_id = $1' using p_user_id;
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

  if to_regclass('public.ava_messages') is not null then
    execute 'delete from public.ava_messages where user_id = $1' using p_user_id;
  end if;
  if to_regclass('public.user_health_metrics') is not null then
    execute 'delete from public.user_health_metrics where user_id = $1' using p_user_id;
  end if;
  if to_regclass('public.diet_plan_generations') is not null then
    execute 'delete from public.diet_plan_generations where user_id = $1' using p_user_id;
  end if;
  if to_regclass('public.user_feedback') is not null then
    execute 'delete from public.user_feedback where user_id = $1' using p_user_id;
  end if;
  if to_regclass('public.user_fitness_history') is not null then
    execute 'delete from public.user_fitness_history where user_id = $1' using p_user_id;
  end if;
  if to_regclass('public.user_program_progress') is not null then
    execute 'delete from public.user_program_progress where user_id = $1' using p_user_id;
  end if;
  if to_regclass('public.user_streaks') is not null then
    execute 'delete from public.user_streaks where user_id = $1' using p_user_id;
  end if;
  if to_regclass('public.user_badges') is not null then
    execute 'delete from public.user_badges where user_id = $1' using p_user_id;
  end if;
  if to_regclass('public.user_body_measurements') is not null then
    execute 'delete from public.user_body_measurements where user_id = $1' using p_user_id;
  end if;
  if to_regclass('public.user_progress_photos') is not null then
    execute 'delete from public.user_progress_photos where user_id = $1' using p_user_id;
  end if;
  if to_regclass('public.user_favorites') is not null then
    execute 'delete from public.user_favorites where user_id = $1' using p_user_id;
  end if;
end;
$$;

revoke all on function public.delete_healthchain_user_data(uuid)
  from public, anon, authenticated;
grant execute on function public.delete_healthchain_user_data(uuid)
  to service_role;

-- Storage files must be removed through the Storage API (metadata deletion
-- alone does not erase bytes). This listing is callable only by the server.
create or replace function public.list_healthchain_user_storage(p_user_id uuid)
returns table(bucket_id text, name text) language sql security definer set search_path='' as $$
  select o.bucket_id, o.name from storage.objects o
    where o.owner_id = p_user_id::text order by o.bucket_id, o.name limit 100;
$$;
revoke all on function public.list_healthchain_user_storage(uuid) from public, anon, authenticated;
grant execute on function public.list_healthchain_user_storage(uuid) to service_role;

create or replace function public.healthchain_current_account_active()
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from auth.users where id = auth.uid())
    and not exists(select 1 from public.account_erasure_tombstones where user_id = auth.uid());
$$;
revoke all on function public.healthchain_current_account_active() from public, anon;
grant execute on function public.healthchain_current_account_active() to authenticated;
drop policy if exists healthchain_erased_owner_storage_guard on storage.objects;
create policy healthchain_erased_owner_storage_guard on storage.objects
  as restrictive for all to authenticated
  using (public.healthchain_current_account_active())
  with check (public.healthchain_current_account_active());

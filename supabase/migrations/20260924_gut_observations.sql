-- Canonical owner-scoped health observations. Keep the new client writer gated
-- until this migration and two-user RLS checks have been run in staging.
create table if not exists public.health_observations (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id text not null check (profile_id = 'profile_1'),
  kind text not null check (kind in ('meal','symptom','bowel','daily_checkin','context')),
  occurred_at timestamptz null,
  local_date date null,
  timezone text null,
  time_precision text not null check (time_precision in ('exact','approximate','date_only','unknown')),
  recorded_at timestamptz not null,
  source text not null check (source in ('gut','diet','today','ava','import','legacy')),
  evidence_type text not null check (evidence_type in ('user_report','imported_record','documented_clinician_record')),
  source_record_id text null,
  source_locator jsonb null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and payload->>'kind' = kind),
  revision integer not null check (revision > 0),
  idempotency_key text not null,
  deleted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint health_observations_time_check check (
    (time_precision in ('exact','approximate') and occurred_at is not null)
    or (time_precision = 'date_only' and occurred_at is null and local_date is not null)
    or (time_precision = 'unknown' and occurred_at is null and local_date is null)
  ),
  constraint health_observations_clinician_source_check check (
    evidence_type <> 'documented_clinician_record'
    or (source = 'import' and source_record_id is not null and source_locator is not null)
  ),
  unique (user_id, profile_id, idempotency_key)
);

create index if not exists health_observations_owner_date_idx
  on public.health_observations (user_id, profile_id, local_date desc, id);
create index if not exists health_observations_owner_occurred_idx
  on public.health_observations (user_id, profile_id, occurred_at desc, id);
create index if not exists health_observations_owner_updated_idx
  on public.health_observations (user_id, profile_id, updated_at desc, id);

alter table public.health_observations enable row level security;
revoke all on table public.health_observations from anon;
grant select, insert, update, delete on table public.health_observations to authenticated;

drop policy if exists "Owner reads own observations" on public.health_observations;
create policy "Owner reads own observations" on public.health_observations
  for select to authenticated using (auth.uid() = user_id and profile_id = 'profile_1');
drop policy if exists "Owner creates own observations" on public.health_observations;
create policy "Owner creates own observations" on public.health_observations
  for insert to authenticated with check (auth.uid() = user_id and profile_id = 'profile_1' and evidence_type = 'user_report');
drop policy if exists "Owner updates own observations" on public.health_observations;
create policy "Owner updates own observations" on public.health_observations
  for update to authenticated using (auth.uid() = user_id and profile_id = 'profile_1' and evidence_type = 'user_report')
  with check (auth.uid() = user_id and profile_id = 'profile_1' and evidence_type = 'user_report');
drop policy if exists "Owner deletes own observations" on public.health_observations;
create policy "Owner deletes own observations" on public.health_observations
  for delete to authenticated using (auth.uid() = user_id and profile_id = 'profile_1');

-- Replace the account erasure routine so a failed auth deletion cannot leave
-- the new health table behind. This repeats the established routine intentionally.
create or replace function public.delete_healthchain_user_data(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
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
  if to_regclass('storage.objects') is not null then
    execute 'delete from storage.objects where owner = $1' using p_user_id;
  end if;
end;
$$;

revoke all on function public.delete_healthchain_user_data(uuid)
  from public, anon, authenticated;
grant execute on function public.delete_healthchain_user_data(uuid)
  to service_role;

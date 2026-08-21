-- HealthChain production migration bundle.
-- Generated from supabase/migrations in filename order.
-- Run this once in the target Supabase SQL Editor.
-- It is intended to be idempotent for the current migration chain.

-- ===== 20260818_health_memory.sql =====
-- HealthChain Health Memory: compact, structured, long-lived AI and user health knowledge.
-- Apply through Supabase SQL Editor or the Supabase CLI before enabling the feature in production.
create table if not exists public.health_memory (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id text not null default 'profile_1',
  case_id uuid null,
  kind text not null check (kind in ('case_prep','quick_consult','deep_collab','lab_report','diet','health_buddy','profile_event','pharmacy','research','discussion_guide')),
  source text not null,
  title text not null,
  occurred_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  dedupe_key text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists health_memory_user_profile_occurred_idx
  on public.health_memory (user_id, profile_id, occurred_at desc);
create index if not exists health_memory_case_idx on public.health_memory (case_id) where case_id is not null;
create unique index if not exists health_memory_user_profile_dedupe_idx
  on public.health_memory (user_id, profile_id, dedupe_key) where dedupe_key is not null;

alter table public.health_memory enable row level security;

drop policy if exists "Users can read their Health Memory" on public.health_memory;
create policy "Users can read their Health Memory" on public.health_memory
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can create their Health Memory" on public.health_memory;
create policy "Users can create their Health Memory" on public.health_memory
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can update their Health Memory" on public.health_memory;
create policy "Users can update their Health Memory" on public.health_memory
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete their Health Memory" on public.health_memory;
create policy "Users can delete their Health Memory" on public.health_memory
  for delete to authenticated using (auth.uid() = user_id);

-- Lock down the existing core records as well. These policies make the browser's
-- publishable Supabase key safe only in combination with the signed-in user's JWT.
alter table public.profiles enable row level security;
drop policy if exists "Users manage own profile" on public.profiles;
create policy "Users manage own profile" on public.profiles
  for all to authenticated using (auth.uid() = id) with check (auth.uid() = id);

alter table public.cases enable row level security;
drop policy if exists "Users manage own cases" on public.cases;
create policy "Users manage own cases" on public.cases
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Push notifications are optional on web, but native clients need this table.
-- Creating it here makes the setup safe for projects that do not yet have it.
create table if not exists public.user_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  push_token text not null,
  platform text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, push_token)
);

alter table public.user_devices enable row level security;
drop policy if exists "Users manage own devices" on public.user_devices;
create policy "Users manage own devices" on public.user_devices
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- A read-only, computed operator view. It does not duplicate data; use it in the
-- Supabase dashboard to inspect one user's primary profile, case files, and Health Memory together.
create or replace view public.healthchain_user_overview with (security_invoker = true) as
select
  p.id as user_id,
  p.full_name,
  p.updated_at as profile_updated_at,
  jsonb_build_object(
    'demographics', p.demographics,
    'conditions', p.conditions,
    'medications', p.medications,
    'allergies', p.allergies,
    'family_history', p.family_history,
    'vitals', p.vitals,
    'nutrition', p.nutrition,
    'health_focus', p.health_focus
  ) as profile,
  coalesce((select jsonb_agg(c.data order by c.updated_at desc) from public.cases c where c.user_id = p.id), '[]'::jsonb) as cases,
  coalesce((select jsonb_agg(jsonb_build_object('kind', m.kind, 'title', m.title, 'occurred_at', m.occurred_at, 'payload', m.payload) order by m.occurred_at desc) from public.health_memory m where m.user_id = p.id), '[]'::jsonb) as health_memory
from public.profiles p;

-- ===== 20260821_account_deletion.sql =====
-- Delete all HealthChain-owned data for one account atomically. Auth identity
-- deletion remains in the API after this transaction succeeds.
create or replace function public.delete_healthchain_user_data(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Keep installation and deletion compatible with a partially migrated
  -- project. Every table is checked before dynamic deletion, so an older
  -- deployment cannot fail the function definition with a missing relation.
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
grant execute on function public.delete_healthchain_user_data(uuid)
  to service_role;

-- ===== 20260821_ai_control.sql =====
-- Server-side AI request ledger. It stores operational metadata only,
-- never prompts, records, or generated medical content.
create table if not exists public.ai_requests (
  request_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  operation text not null default 'gemini',
  status text not null check (status in ('in_progress', 'completed', 'failed')),
  input_tokens integer,
  output_tokens integer,
  total_tokens integer,
  error_code text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists ai_requests_user_started_idx
  on public.ai_requests (user_id, started_at desc);

alter table public.ai_requests enable row level security;
-- No client policies: this is written by the server-side service role only.
revoke all on table public.ai_requests from anon, authenticated;
grant all on table public.ai_requests to service_role;

-- ===== 20260821_ai_quota.sql =====
create table if not exists public.ai_usage_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  request_count integer not null default 0,
  total_tokens bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);

alter table public.ai_usage_daily enable row level security;
-- No client policies. Usage is read/written by the server service role only.
revoke all on table public.ai_usage_daily from anon, authenticated;
grant all on table public.ai_usage_daily to service_role;

create or replace function public.consume_ai_request(p_user_id uuid, p_daily_limit integer default 120)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
begin
  insert into public.ai_usage_daily (user_id, usage_date, request_count)
  values (p_user_id, current_date, 1)
  on conflict (user_id, usage_date)
  do update set request_count = ai_usage_daily.request_count + 1, updated_at = now()
  returning request_count into current_count;

  if current_count > p_daily_limit then
    update public.ai_usage_daily
      set request_count = request_count - 1, updated_at = now()
      where user_id = p_user_id and usage_date = current_date;
    return false;
  end if;
  return true;
end;
$$;

create or replace function public.record_ai_tokens(p_user_id uuid, p_total_tokens integer default 0)
returns void
language sql
security definer
set search_path = public
as $$
  update public.ai_usage_daily
    set total_tokens = total_tokens + greatest(coalesce(p_total_tokens, 0), 0), updated_at = now()
    where user_id = p_user_id and usage_date = current_date;
$$;

revoke all on function public.consume_ai_request(uuid, integer) from public, anon, authenticated;
revoke all on function public.record_ai_tokens(uuid, integer) from public, anon, authenticated;
grant execute on function public.consume_ai_request(uuid, integer) to service_role;
grant execute on function public.record_ai_tokens(uuid, integer) to service_role;

-- ===== 20260821_base_events_payments.sql =====
-- Tables used by the production API and the client analytics helper.

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  event_params jsonb not null default '{}'::jsonb,
  user_id uuid null references auth.users(id) on delete set null,
  platform text not null default 'web',
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_user_created_idx
  on public.analytics_events (user_id, created_at desc);

alter table public.analytics_events enable row level security;
drop policy if exists "Users can record own analytics" on public.analytics_events;
create policy "Users can record own analytics" on public.analytics_events
  for insert to anon, authenticated
  with check (user_id is null or auth.uid() = user_id);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  razorpay_order_id text not null,
  razorpay_payment_id text not null,
  amount integer not null check (amount > 0),
  status text not null check (status in ('paid', 'refunded', 'failed')),
  entitlement_expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.payments enable row level security;
-- Payment rows are server-only; the service role is used by the API.
revoke all on table public.payments from anon, authenticated;
grant all on table public.payments to service_role;
comment on table public.payments is
  'Server-only payment and entitlement ledger. No browser client policies.';

-- ===== 20260821_data_integrity.sql =====
-- Keep conflict-resolution timestamps authoritative on the database server.
-- This prevents device clock skew from making stale offline writes appear newer.
create or replace function public.healthchain_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Core tables may already exist in older projects. Install the trigger only
-- when the table and its expected updated_at column are present.
do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'profiles', 'cases', 'health_memory', 'user_devices', 'ai_usage_daily', 'healthchain_profiles'
  ] loop
    if to_regclass('public.' || target_table) is not null
       and exists (
         select 1
         from information_schema.columns
         where table_schema = 'public'
           and information_schema.columns.table_name = target_table
           and column_name = 'updated_at'
       ) then
      execute format('drop trigger if exists %I on public.%I', target_table || '_updated_at', target_table);
      execute format(
        'create trigger %I before insert or update on public.%I for each row execute function public.healthchain_set_updated_at()',
        target_table || '_updated_at', target_table
      );
    end if;
  end loop;
end $$;

revoke all on function public.healthchain_set_updated_at() from public, anon, authenticated;
grant execute on function public.healthchain_set_updated_at() to service_role;

-- ===== 20260821_operator_views.sql =====
-- Scalable operator-facing views. Unlike the legacy combined view, these
-- return bounded rows that can be paginated in the Supabase dashboard/API.
create index if not exists cases_user_updated_idx
  on public.cases (user_id, updated_at desc);

create or replace view public.healthchain_user_summary with (security_invoker = true) as
select
  p.id as user_id,
  p.full_name,
  p.updated_at as profile_updated_at,
  (select count(*) from public.cases c where c.user_id = p.id) as case_count,
  (select count(*) from public.health_memory m where m.user_id = p.id) as memory_count,
  (select max(m.occurred_at) from public.health_memory m where m.user_id = p.id) as last_memory_at
from public.profiles p;

create or replace view public.healthchain_case_overview with (security_invoker = true) as
select
  c.user_id,
  c.id as case_id,
  c.title,
  c.status,
  c.specialty,
  c.updated_at,
  c.data
from public.cases c;

create or replace view public.healthchain_memory_overview with (security_invoker = true) as
select
  m.user_id,
  m.profile_id,
  m.id as memory_id,
  m.case_id,
  m.kind,
  m.source,
  m.title,
  m.occurred_at,
  m.updated_at,
  m.payload
from public.health_memory m;

-- Explicitly document that the AI ledger is server-only. The service role
-- bypasses RLS; browser clients receive no rows from this table.
comment on table public.ai_requests is
  'Server-only AI operational ledger. Contains no prompts or generated medical content.';

-- ===== 20260821_payment_entitlement.sql =====
-- Make payment recording and Pro activation one database transaction.
-- The API verifies the provider signature first, then calls this function.
alter table if exists public.payments
  add column if not exists entitlement_expires_at timestamptz;

create or replace function public.activate_payment_entitlement(
  p_user_id uuid,
  p_order_id text,
  p_payment_id text,
  p_amount integer,
  p_expires_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_user uuid;
  effective_expiry timestamptz;
begin
  select user_id, entitlement_expires_at
    into existing_user, effective_expiry
    from public.payments
    where razorpay_payment_id = p_payment_id
    for update;

  if existing_user is not null and existing_user <> p_user_id then
    raise exception 'payment belongs to another account';
  end if;

  if existing_user is null then
    effective_expiry := p_expires_at;
    insert into public.payments (
      user_id, razorpay_order_id, razorpay_payment_id, amount, status, entitlement_expires_at
    ) values (
      p_user_id, p_order_id, p_payment_id, p_amount, 'paid', effective_expiry
    );
  end if;

  update public.profiles
    set is_pro = true,
        pro_expires_at = effective_expiry,
        updated_at = now()
    where id = p_user_id;

  if not found then
    raise exception 'profile not found for payment account';
  end if;
  return true;
end;
$$;

revoke all on function public.activate_payment_entitlement(uuid, text, text, integer, timestamptz)
  from public, anon, authenticated;
grant execute on function public.activate_payment_entitlement(uuid, text, text, integer, timestamptz)
  to service_role;

-- ===== 20260821_payment_integrity.sql =====
-- Prevent replayed provider identifiers from creating duplicate payment rows.
create unique index if not exists payments_razorpay_payment_id_uidx
  on public.payments (razorpay_payment_id)
  where razorpay_payment_id is not null;

create unique index if not exists payments_razorpay_order_id_uidx
  on public.payments (razorpay_order_id)
  where razorpay_order_id is not null;

-- ===== 20260822_caregiver_profiles.sql =====
-- Durable, account-scoped snapshots for every local caregiver profile.
-- This stores structured profile metadata only; uploaded source documents stay
-- outside this table and are not copied into the snapshot payload.
create table if not exists public.healthchain_profiles (
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id text not null,
  profile_name text not null default 'My Profile',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, profile_id)
);

create index if not exists healthchain_profiles_user_updated_idx
  on public.healthchain_profiles (user_id, updated_at desc);

alter table public.healthchain_profiles enable row level security;
revoke all on table public.healthchain_profiles from anon;
grant select, insert, update, delete on table public.healthchain_profiles to authenticated;

drop policy if exists "Users manage own caregiver profiles" on public.healthchain_profiles;
create policy "Users manage own caregiver profiles"
  on public.healthchain_profiles
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

comment on table public.healthchain_profiles is
  'Durable structured caregiver profile snapshots owned by the authenticated account.';

-- Extend the owner-scoped operator summary only after the profile snapshot
-- table exists. This keeps one query useful for account-level support while
-- retaining the existing bounded case and memory views.
create or replace view public.healthchain_user_summary with (security_invoker = true) as
select
  p.id as user_id,
  p.full_name,
  p.updated_at as profile_updated_at,
  (select count(*) from public.cases c where c.user_id = p.id) as case_count,
  (select count(*) from public.health_memory m where m.user_id = p.id) as memory_count,
  (select max(m.occurred_at) from public.health_memory m where m.user_id = p.id) as last_memory_at,
  (select count(*) from public.healthchain_profiles hp where hp.user_id = p.id) as caregiver_profile_count,
  coalesce((select jsonb_agg(jsonb_build_object(
    'profile_id', hp.profile_id,
    'profile_name', hp.profile_name,
    'updated_at', hp.updated_at,
    'data', hp.data
  ) order by hp.updated_at desc) from public.healthchain_profiles hp where hp.user_id = p.id), '[]'::jsonb) as caregiver_profiles
from public.profiles p;

-- Operator aggregates are deliberately server-side. The browser must use the
-- owner-scoped base tables, never an all-account overview view.
revoke all on public.healthchain_user_overview,
  public.healthchain_user_summary,
  public.healthchain_case_overview,
  public.healthchain_memory_overview
  from anon, authenticated;
grant select on public.healthchain_user_overview,
  public.healthchain_user_summary,
  public.healthchain_case_overview,
  public.healthchain_memory_overview
  to service_role;


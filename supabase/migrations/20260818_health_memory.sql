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

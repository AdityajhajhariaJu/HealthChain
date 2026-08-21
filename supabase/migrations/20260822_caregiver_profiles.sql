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

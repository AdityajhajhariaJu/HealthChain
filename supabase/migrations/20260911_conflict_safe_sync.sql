-- Conflict-safe synchronization: revision tracking, soft-deletion timestamps, and durable case tombstones.
-- Additive migration that protects against silent overwrite, clock-skew loss, and resurrection races.

-- 1. Add revision and deleted_at columns to public.cases
do $$
begin
  if to_regclass('public.cases') is not null then
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'cases' and column_name = 'revision'
    ) then
      alter table public.cases add column revision bigint not null default 1;
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'cases' and column_name = 'deleted_at'
    ) then
      alter table public.cases add column deleted_at timestamptz;
    end if;
  end if;
end $$;

create index if not exists cases_user_revision_idx
  on public.cases (user_id, revision desc);

create index if not exists cases_user_deleted_at_idx
  on public.cases (user_id, deleted_at);

-- 2. Create durable case_tombstones table for explicit deletion replication
create table if not exists public.case_tombstones (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id text not null default 'profile_1',
  deleted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (user_id, profile_id, id)
);

create index if not exists case_tombstones_user_profile_idx
  on public.case_tombstones (user_id, profile_id, deleted_at desc);

alter table public.case_tombstones enable row level security;
revoke all on table public.case_tombstones from anon;
grant select, insert, update, delete on table public.case_tombstones to authenticated;

drop policy if exists "Users manage own case tombstones" on public.case_tombstones;
create policy "Users manage own case tombstones"
  on public.case_tombstones
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

comment on table public.case_tombstones is
  'Immutable tombstones for deleted cases to prevent offline devices from resurrecting purged cases.';

-- Keep the authenticated owner policy as the one source of truth. The older
-- public policies have exactly the same owner predicate and only add repeated
-- per-row checks to case/profile reads and writes.
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'cases'
      and policyname = 'Users manage own cases' and cmd = 'ALL'
      and roles = array['authenticated']::name[]
      and qual = '(auth.uid() = user_id)' and with_check = '(auth.uid() = user_id)'
  ) or not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles'
      and policyname = 'Users manage own profile' and cmd = 'ALL'
      and roles = array['authenticated']::name[]
      and qual = '(auth.uid() = id)' and with_check = '(auth.uid() = id)'
  ) then
    raise exception 'Owner policy differs from audited definition; stop policy cleanup';
  end if;
end;
$$;

drop policy if exists "Users can create their own cases" on public.cases;
drop policy if exists "Users can delete own cases" on public.cases;
drop policy if exists "Users can delete their own cases" on public.cases;
drop policy if exists "Users can insert own cases" on public.cases;
drop policy if exists "Users can manage their own cases" on public.cases;
drop policy if exists "Users can update own cases" on public.cases;
drop policy if exists "Users can update their own cases" on public.cases;
drop policy if exists "Users can view own cases" on public.cases;
drop policy if exists "Users can view their own cases" on public.cases;

drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can manage their own profiles" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can view their own profile" on public.profiles;

-- Wrapping the request identity in a scalar subquery lets Postgres evaluate it
-- once for a statement, rather than once for every candidate row.
do $$
declare p record;
declare statement text;
begin
  for p in
    select tablename, policyname, qual, with_check from pg_policies
    where schemaname = 'public'
      and tablename in ('cases', 'profiles', 'health_memory',
        'health_observations', 'user_devices', 'user_health_metrics')
      and (coalesce(qual, '') like '%auth.uid()%' or
        coalesce(with_check, '') like '%auth.uid()%')
  loop
    statement := format('alter policy %I on public.%I', p.policyname, p.tablename);
    if p.qual is not null then
      statement := statement || format(' using (%s)',
        replace(p.qual, 'auth.uid()', '(select auth.uid())'));
    end if;
    if p.with_check is not null then
      statement := statement || format(' with check (%s)',
        replace(p.with_check, 'auth.uid()', '(select auth.uid())'));
    end if;
    execute statement;
  end loop;
end;
$$;

-- The Ava context query reads the newest imported samples across all device
-- types; the existing (user_id, metric_type, start_time) index cannot provide
-- that global order without sorting.
create index if not exists idx_user_health_metrics_owner_start_time
  on public.user_health_metrics (user_id, start_time desc);

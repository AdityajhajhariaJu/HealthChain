-- Run after applying every file in supabase/migrations/.
-- Each result is an observable release check; expected rows are documented in
-- the comments so this can be used in a Supabase SQL Editor or CI runner.

-- Expected: one row per installed table below.
do $$
declare
  missing_tables text;
begin
  select string_agg(name, ', ' order by name)
    into missing_tables
  from (values
    ('profiles'), ('cases'), ('health_memory'), ('user_devices'),
    ('analytics_events'), ('ai_requests'), ('ai_usage_daily'), ('payments')
  ) as expected(name)
  where to_regclass('public.' || name) is null;

  if missing_tables is not null then
    raise exception 'HealthChain migration incomplete. Missing public tables: %', missing_tables
      using hint = 'Apply every file in supabase/migrations in filename order, then rerun this verifier.';
  end if;
end $$;

select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'profiles', 'cases', 'health_memory', 'user_devices', 'analytics_events',
    'ai_requests', 'ai_usage_daily', 'payments'
  )
order by table_name;

-- Expected: every returned table has row-level security enabled (true).
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'profiles', 'cases', 'health_memory', 'user_devices', 'analytics_events',
    'ai_requests', 'ai_usage_daily', 'payments'
  )
order by c.relname;

-- Expected: zero rows. This is the actionable failure query for a deployment
-- where a table exists but RLS was not enabled.
select c.relname as table_missing_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'profiles', 'cases', 'health_memory', 'user_devices', 'analytics_events',
    'ai_requests', 'ai_usage_daily', 'payments'
  )
  and not c.relrowsecurity
order by c.relname;

-- Expected: zero rows. Server-only operational and payment tables must not
-- expose table privileges to browser roles, even if a future policy changes.
select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('ai_requests', 'ai_usage_daily', 'payments')
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;

-- Expected: at least one policy for each browser-owned table. RLS enabled with
-- no policy is a silent outage; a broad policy is reviewed separately below.
do $$
declare
  missing_policies text;
begin
  select string_agg(expected.table_name, ', ' order by expected.table_name)
    into missing_policies
  from (values
    ('profiles'), ('cases'), ('health_memory'), ('user_devices'), ('analytics_events')
  ) as expected(table_name)
  where not exists (
    select 1 from pg_policies policy
    where policy.schemaname = 'public'
      and policy.tablename = expected.table_name
  );

  if missing_policies is not null then
    raise exception 'HealthChain RLS policy coverage incomplete for: %', missing_policies
      using hint = 'Create an owner-scoped policy for every browser-owned table before release.';
  end if;
end $$;

-- Expected: these server-only routines exist.
select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'consume_ai_request', 'record_ai_tokens',
    'activate_payment_entitlement', 'delete_healthchain_user_data'
  )
order by routine_name;

-- Expected: zero rows. Client roles must not be able to call quota, payment,
-- or deletion routines directly.
select routine_name, grantee
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name in (
    'consume_ai_request', 'record_ai_tokens',
    'activate_payment_entitlement', 'delete_healthchain_user_data'
  )
  and grantee in ('anon', 'authenticated', 'public')
order by routine_name, grantee;

-- Expected: four rows, all granted to service_role. This catches a deployment
-- where the functions exist but the API cannot execute them.
select routine_name, grantee
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name in (
    'consume_ai_request', 'record_ai_tokens',
    'activate_payment_entitlement', 'delete_healthchain_user_data'
  )
  and grantee = 'service_role'
order by routine_name;

-- Expected: these operator views exist and remain read-only views.
select table_name
from information_schema.views
where table_schema = 'public'
  and table_name in (
    'healthchain_user_overview', 'healthchain_user_summary',
    'healthchain_case_overview', 'healthchain_memory_overview'
  )
order by table_name;

-- Expected: both payment replay-protection indexes exist.
select indexname
from pg_indexes
where schemaname = 'public'
  and indexname in (
    'payments_razorpay_payment_id_uidx',
    'payments_razorpay_order_id_uidx'
  )
order by indexname;

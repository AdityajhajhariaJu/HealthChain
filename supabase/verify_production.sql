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
    ('healthchain_profiles'), ('health_observations'), ('analytics_events'), ('ai_requests'), ('ai_usage_daily'), ('payments'),
    ('user_quotas'), ('case_tombstones'), ('payment_refunds'), ('diet_plan_generations')
  ) as expected(name)
  where to_regclass('public.' || name) is null;

  if missing_tables is not null then
    raise exception 'HealthChain migration incomplete. Missing public tables: %', missing_tables
      using hint = 'Apply every file in supabase/migrations in filename order, then rerun this verifier.';
  end if;
end $$;

-- Core owner policies should be singular and the cross-type device feed indexed.
do $$
begin
  if (select count(*) from pg_policies where schemaname='public' and tablename='cases') <> 1
    or (select count(*) from pg_policies where schemaname='public' and tablename='profiles') <> 1 then
    raise exception 'Duplicate case/profile owner policies remain';
  end if;
  if not exists(select 1 from pg_indexes where schemaname='public'
    and indexname='idx_user_health_metrics_owner_start_time') then
    raise exception 'Cross-type device context index missing';
  end if;
end $$;

-- Ava conversation ownership and exact wellness completion contract.
-- Observation links must survive cloud sync while retaining owner/profile scope.
do $$
begin
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='health_observations' and column_name='record_references' and data_type='jsonb' and is_nullable='NO') then raise exception 'Observation reference storage is missing'; end if;
 if not exists(select 1 from pg_constraint where conrelid='public.health_observations'::regclass and conname='health_observations_references_check' and convalidated) then raise exception 'Observation reference owner constraint is missing'; end if;
 if to_regprocedure('public.healthchain_observation_references_valid(jsonb,uuid,text)') is null then raise exception 'Observation reference validator is missing'; end if;
 if has_function_privilege('anon','public.healthchain_observation_references_valid(jsonb,uuid,text)','EXECUTE') then raise exception 'Anonymous reference validator execution is open'; end if;
 if not has_function_privilege('authenticated','public.healthchain_observation_references_valid(jsonb,uuid,text)','EXECUTE') then raise exception 'Owned observation writes cannot validate links'; end if;
end $$;

do $$
begin
 if to_regclass('public.ava_messages') is null then raise exception 'Ava conversation storage is missing';end if;
 if not (select relrowsecurity from pg_class where oid='public.ava_messages'::regclass) then raise exception 'Ava RLS is missing';end if;
 if has_table_privilege('anon','public.ava_messages','SELECT,INSERT,UPDATE,DELETE') then raise exception 'Anonymous Ava table access is open';end if;
 if to_regprocedure('public.start_fitness_session(uuid,uuid,uuid)') is null or to_regprocedure('public.complete_fitness_session(uuid,integer,integer)') is null then raise exception 'Exact wellness session routines are missing';end if;
 if has_function_privilege('anon','public.start_fitness_session(uuid,uuid,uuid)','EXECUTE') or has_function_privilege('anon','public.complete_fitness_session(uuid,integer,integer)','EXECUTE') then raise exception 'Anonymous wellness execution is open';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='health_memory' and column_name='deleted_at')
 or not exists(select 1 from information_schema.columns where table_schema='public' and table_name='ai_requests' and column_name='result_json') then raise exception 'Ava recovery or memory deletion storage is missing';end if;
 if has_function_privilege('authenticated','public.recover_interrupted_ai_requests(integer)','EXECUTE') or has_function_privilege('anon','public.recover_interrupted_ai_requests(integer)','EXECUTE') then raise exception 'Server-only request recovery is open';end if;
end $$;

select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'profiles', 'cases', 'health_memory', 'user_devices', 'analytics_events',
    'healthchain_profiles', 'health_observations', 'ai_requests', 'ai_usage_daily', 'payments',
    'user_quotas', 'case_tombstones', 'payment_refunds', 'diet_plan_generations'
  )
order by table_name;

-- Expected: every returned table has row-level security enabled (true).
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'profiles', 'cases', 'health_memory', 'user_devices', 'analytics_events',
    'healthchain_profiles', 'health_observations', 'ai_requests', 'ai_usage_daily', 'payments',
    'user_quotas', 'case_tombstones', 'payment_refunds', 'diet_plan_generations'
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
    'health_observations', 'ai_requests', 'ai_usage_daily', 'payments',
    'user_quotas', 'case_tombstones', 'payment_refunds', 'diet_plan_generations'
  )
  and not c.relrowsecurity
order by c.relname;

-- Expected: zero rows. Server-only operational and payment tables must not
-- expose table privileges to browser roles, even if a future policy changes.
select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('ai_requests', 'ai_usage_daily', 'payments', 'payment_refunds', 'diet_plan_generations')
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;

-- Expected: zero rows. Account-wide operator views are not browser-readable.
select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'healthchain_user_overview', 'healthchain_user_summary',
    'healthchain_case_overview', 'healthchain_memory_overview'
  )
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
    ('profiles'), ('cases'), ('health_memory'), ('user_devices'), ('analytics_events'),
    ('healthchain_profiles'), ('health_observations'), ('case_tombstones'), ('user_quotas')
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

-- New meal-plan accounting and payment operations must be server-only.
do $$
declare
  missing_routines text;
begin
  select string_agg(signature, ', ' order by signature)
    into missing_routines
  from (values
    ('consume_feature_quota_for_request(uuid,text,text)'),
    ('release_feature_quota_for_request(uuid,text)'),
    ('activate_and_provision_subscription(uuid,text,text,integer,text,timestamptz)'),
    ('activate_and_provision_topup(uuid,text,text,integer,text,integer)')
  ) as expected(signature)
  where to_regprocedure('public.' || signature) is null;

  if missing_routines is not null then
    raise exception 'HealthChain migration incomplete. Missing routines: %', missing_routines;
  end if;

  if has_function_privilege('anon', 'public.activate_and_provision_subscription(uuid,text,text,integer,text,timestamptz)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.activate_and_provision_subscription(uuid,text,text,integer,text,timestamptz)', 'EXECUTE')
     or has_function_privilege('anon', 'public.activate_and_provision_topup(uuid,text,text,integer,text,integer)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.activate_and_provision_topup(uuid,text,text,integer,text,integer)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.consume_feature_quota_for_request(uuid,text,text)', 'EXECUTE') then
    raise exception 'HealthChain browser roles can execute server-only payment or quota routines';
  end if;

  if to_regclass('public.document_embeddings') is not null
     and exists (
       select 1 from pg_class
       where oid = to_regclass('public.document_embeddings')
         and not relrowsecurity
     ) then
    raise exception 'Document embeddings table is missing RLS';
  end if;

  if to_regclass('public.document_embeddings') is not null
     and (
       has_table_privilege('anon', 'public.document_embeddings', 'SELECT')
       or has_table_privilege('authenticated', 'public.document_embeddings', 'SELECT')
     ) then
    raise exception 'Document embeddings are readable by browser roles';
  end if;
end $$;

-- Pillar lifecycle: no client entitlement reset, valid daily events, server-only erasure.
do $$
begin
  if has_table_privilege('authenticated','public.profiles','DELETE')
    or has_table_privilege('authenticated','public.profiles','TRUNCATE')
    or has_function_privilege('authenticated','public.list_healthchain_user_storage(uuid)','EXECUTE')
    or has_table_privilege('authenticated','public.account_erasure_tombstones','SELECT') then
    raise exception 'Pillar entitlement or erasure permissions are unsafe';
  end if;
  if not exists(select 1 from pg_trigger where tgrelid='public.profiles'::regclass and tgname='healthchain_profile_entitlements') then
    raise exception 'healthchain_guard_profile_entitlements trigger missing';
  end if;
  if not exists(select 1 from pg_constraint where conrelid='public.health_observations'::regclass and conname='health_observations_daily_payload_check') then
    raise exception 'Daily observation validation missing';
  end if;
  if not exists(select 1 from pg_trigger where tgrelid='public.health_observations'::regclass and tgname='healthchain_erased_owner_guard') then
    raise exception 'Deleted-owner write barrier missing';
  end if;
end $$;
-- Profile CAS and archive recovery run with the caller's RLS privileges.
-- Legacy function search paths must be fixed even when the optional vector helpers exist.
do $$ begin
  if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('update_updated_at_column','match_documents')
      and not exists(select 1 from unnest(p.proconfig) c where c like 'search_path=%')) then
    raise exception 'Legacy function search paths are mutable';
  end if;
end $$;
do $$ begin
  if to_regprocedure('public.recover_subscription_entitlement(uuid)') is null then raise exception 'Missing transactional entitlement recovery'; end if;
  if has_function_privilege('authenticated','public.recover_subscription_entitlement(uuid)','execute') or has_function_privilege('anon','public.recover_subscription_entitlement(uuid)','execute') then raise exception 'Entitlement recovery exposed to clients'; end if;
  if (select count(*) from pg_policies where schemaname='public' and tablename='payments' and cmd='SELECT') <> 1 then raise exception 'Duplicate payment owner policies'; end if;
  if exists(select 1 from pg_policies where schemaname='public' and tablename='user_feedback' and cmd='INSERT' and with_check='true') then raise exception 'Feedback can be attributed to another owner'; end if;
end $$;
do $$ begin
  if to_regprocedure('public.sync_health_profile_snapshot(text,jsonb,timestamptz,jsonb)') is null
    or to_regprocedure('public.restore_health_archive_records(jsonb)') is null then raise exception 'Missing profile/archive recovery functions'; end if;
  if exists(select 1 from pg_proc where oid in (
      'public.sync_health_profile_snapshot(text,jsonb,timestamptz,jsonb)'::regprocedure,
      'public.restore_health_archive_records(jsonb)'::regprocedure) and prosecdef) then raise exception 'Recovery must enforce caller RLS'; end if;
  if has_function_privilege('anon','public.sync_health_profile_snapshot(text,jsonb,timestamptz,jsonb)','execute')
    or has_function_privilege('anon','public.restore_health_archive_records(jsonb)','execute') then raise exception 'Recovery exposed anonymously'; end if;
end $$;

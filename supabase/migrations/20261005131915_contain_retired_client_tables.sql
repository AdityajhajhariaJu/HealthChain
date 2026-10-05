-- Applied version matches the Supabase migration ledger.
-- Operator confirmed no other application uses these retired tables.
-- Remove exposed client access; preserve rows and existing service-role access.
do $migration$
declare
  retired_table text;
  column_list text;
  policy_name text;
begin
  foreach retired_table in array array[
    'action_logs','agent_runs','content_items','conversions',
    'growth_assets','growth_auto_dm_rules','growth_backlinks','growth_brand_dna',
    'growth_campaigns','growth_connected_accounts','growth_generated_assets',
    'growth_leads','growth_niche_scans','growth_runs','growth_scheduled_posts',
    'growth_trends','system_state','users'
  ] loop
    if to_regclass(format('public.%I', retired_table)) is null then continue; end if;
    execute format('alter table public.%I enable row level security', retired_table);
    execute format('revoke all privileges on table public.%I from public, anon, authenticated', retired_table);
    select string_agg(quote_ident(attname), ', ' order by attnum) into column_list
      from pg_attribute where attrelid = to_regclass(format('public.%I', retired_table))
      and attnum > 0 and not attisdropped;
    if column_list is not null then
      execute format('revoke all privileges (%s) on table public.%I from public, anon, authenticated', column_list, retired_table);
    end if;
    for policy_name in select policyname from pg_policies
      where schemaname = 'public' and tablename = retired_table
    loop
      execute format('drop policy %I on public.%I', policy_name, retired_table);
    end loop;
  end loop;
end $migration$;

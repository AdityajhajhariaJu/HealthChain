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
    'profiles', 'cases', 'health_memory', 'user_devices', 'ai_usage_daily'
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

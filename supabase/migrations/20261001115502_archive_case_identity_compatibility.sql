-- Live cases use UUID identifiers; legacy tombstones use text. Compare their canonical text identity.
-- Recover missing rows atomically; existing cloud rows and newer facts win.
-- Browser RLS, foreign keys, input checks and erasure guards stay enabled.
create or replace function public.restore_health_archive_records(p_archive jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  target text;
  rows jsonb;
  filter_sql text;
  restored integer;
  counts jsonb := '{}';
  profile jsonb := p_archive->'profile';
begin
  if owner_id is null or not public.healthchain_current_account_active()
     or p_archive->>'userId' is distinct from owner_id::text
     or jsonb_typeof(p_archive) <> 'object' or octet_length(p_archive::text) > 20000000 then
    raise exception 'Invalid archive owner or size' using errcode='42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(owner_id::text || ':archive',0));
  if profile is not null and profile <> 'null'::jsonb then
    if profile->>'id' is distinct from owner_id::text then raise exception 'Invalid archive profile owner' using errcode='42501'; end if;
    insert into public.profiles(id,full_name,demographics,conditions,medications,allergies,family_history,timeline,vitals,nutrition,health_focus)
    values(owner_id,profile->>'full_name',coalesce(profile->'demographics','{}'),coalesce(profile->'conditions','[]'),
      coalesce(profile->'medications','[]'),coalesce(profile->'allergies','[]'),coalesce(profile->'family_history','[]'),
      coalesce(profile->'timeline','[]'),coalesce(profile->'vitals','{}'),coalesce(profile->'nutrition','{}'),profile->>'health_focus')
    on conflict(id) do nothing;
  end if;
  foreach target in array array['case_tombstones','cases','healthchain_profiles','health_memory','health_observations','ava_messages','user_health_metrics','user_body_measurements','user_fitness_history'] loop
    rows := coalesce(p_archive->target,'[]'::jsonb);
    if jsonb_typeof(rows) <> 'array' or jsonb_array_length(rows) > 100000
       or exists(select 1 from jsonb_array_elements(rows) item where jsonb_typeof(item)<>'object' or item->>'user_id' is distinct from owner_id::text) then
      raise exception 'Invalid archive collection: %',target using errcode='42501';
    end if;
    if target='healthchain_profiles' and exists(select 1 from jsonb_array_elements(rows) item where
        jsonb_typeof(item->'data')<>'object' or item->'data' ?| array['isPro','proExpiresAt','is_pro','pro_expires_at','access_token','refresh_token']) then
      raise exception 'Archive cannot restore access claims' using errcode='42501';
    end if;
    filter_sql := 'true';
    if target='cases' then
      filter_sql := 'not exists(select 1 from public.case_tombstones t where t.user_id=r.user_id and t.id::text=r.id::text)';
    elsif target='case_tombstones' then
      filter_sql := 'not exists(select 1 from public.cases c where c.user_id=r.user_id and c.id::text=r.id::text and c.deleted_at is null)';
    elsif target='ava_messages' then
      filter_sql := '(r.case_id is null or exists(select 1 from public.cases c where c.user_id=r.user_id and c.id::text=r.case_id and c.deleted_at is null))';
    end if;
    execute format('insert into public.%I select r.* from jsonb_populate_recordset(null::public.%I,$1) r where %s on conflict do nothing',target,target,filter_sql) using rows;
    get diagnostics restored = row_count;
    counts := counts || jsonb_build_object(target,restored);
  end loop;
  return jsonb_build_object('success',true,'restored',counts,'existingCloudRecordsPreserved',true);
end $$;
revoke all on function public.restore_health_archive_records(jsonb) from public,anon;
grant execute on function public.restore_health_archive_records(jsonb) to authenticated;

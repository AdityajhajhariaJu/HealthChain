-- A client first merges against its immutable baseline, then submits a CAS.
-- The lock covers first inserts as well as updates. RLS and the erasure trigger
-- remain in force; this function never takes a caller-supplied owner ID.
create or replace function public.sync_health_profile_snapshot(
  p_profile_id text, p_expected_data jsonb, p_expected_legacy_at timestamptz, p_data jsonb
)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  current_data jsonb;
  legacy_at timestamptz;
  next_data jsonb;
  stamp timestamptz := now();
begin
  if owner_id is null or not public.healthchain_current_account_active()
     or p_profile_id is null or p_profile_id !~ '^profile_[0-9]{1,12}$'
     or p_data is null or jsonb_typeof(p_data) <> 'object' or octet_length(p_data::text) > 10000000 then
    raise exception 'Invalid health profile sync' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(owner_id::text || ':profile:' || p_profile_id, 0));
  select data into current_data from public.healthchain_profiles
    where user_id = owner_id and profile_id = p_profile_id for update;
  if p_profile_id = 'profile_1' then
    select updated_at into legacy_at from public.profiles where id = owner_id for update;
  end if;
  if current_data is distinct from p_expected_data or legacy_at is distinct from p_expected_legacy_at then
    return jsonb_build_object('success', false, 'conflict', true);
  end if;
  next_data := (p_data - array['isPro','proExpiresAt','is_pro','pro_expires_at','ai_token_usage','ai_usage_reset_date','access_token','refresh_token'])
    || jsonb_build_object('id', p_profile_id, 'updatedAt', stamp);
  insert into public.healthchain_profiles(user_id,profile_id,profile_name,data,updated_at)
    values(owner_id,p_profile_id,coalesce(next_data->>'profileName','My Profile'),next_data,stamp)
    on conflict(user_id,profile_id) do update set
      profile_name=excluded.profile_name,data=excluded.data,updated_at=excluded.updated_at;
  if p_profile_id = 'profile_1' then
    -- One transaction keeps the primary compatibility row aligned. Paid access
    -- and quota columns are deliberately never included in this projection.
    insert into public.profiles(id,full_name,demographics,conditions,medications,allergies,family_history,timeline,vitals,nutrition,health_focus)
    values(owner_id,next_data->>'profileName',
      coalesce(next_data->'demographics','{}'::jsonb) || jsonb_build_object('onboardingCompletedAt',next_data->'onboardingCompletedAt'),
      coalesce(next_data->'conditions','[]'::jsonb),coalesce(next_data->'medications','[]'::jsonb),
      coalesce(next_data->'allergies','[]'::jsonb),coalesce(next_data->'familyHistory','[]'::jsonb),
      coalesce(next_data->'timeline','[]'::jsonb),coalesce(next_data->'vitals','{}'::jsonb),
      coalesce(next_data->'nutrition','{}'::jsonb),next_data->>'healthFocus')
    on conflict(id) do update set full_name=excluded.full_name,demographics=excluded.demographics,
      conditions=excluded.conditions,medications=excluded.medications,allergies=excluded.allergies,
      family_history=excluded.family_history,timeline=excluded.timeline,vitals=excluded.vitals,
      nutrition=excluded.nutrition,health_focus=excluded.health_focus;
  end if;
  return jsonb_build_object('success',true,'data',next_data);
end $$;
revoke all on function public.sync_health_profile_snapshot(text,jsonb,timestamptz,jsonb) from public,anon;
grant execute on function public.sync_health_profile_snapshot(text,jsonb,timestamptz,jsonb) to authenticated;

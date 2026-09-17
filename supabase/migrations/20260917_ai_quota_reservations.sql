-- Tie paid feature usage to the request ledger so a failed provider call can
-- safely return the reserved credit exactly once.
alter table public.ai_requests
  add column if not exists feature_code text,
  add column if not exists feature_quota_consumed boolean not null default false,
  add column if not exists feature_quota_released boolean not null default false;

-- Keep the public free-plan promise enforceable on the server. The client-side
-- counter is only a convenience; this database function remains authoritative.
create or replace function public.consume_feature_quota(
  p_user_id uuid,
  p_feature_name text
) returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_allocated integer;
  v_used integer;
  v_expires_at timestamptz;
begin
  delete from public.user_quotas where user_id = p_user_id and expires_at < now();

  select allocated, used, expires_at into v_allocated, v_used, v_expires_at
  from public.user_quotas
  where user_id = p_user_id and feature_name = p_feature_name
  for update;

  if not found then
    if p_feature_name = 'ava_replies' then
      v_allocated := 10;
    elsif p_feature_name = 'pharmacy_hub' then
      v_allocated := 5;
    elsif p_feature_name = 'quick_consult' then
      v_allocated := 1;
    else
      return jsonb_build_object('allowed', false, 'reason', 'upgrade_required');
    end if;

    insert into public.user_quotas (user_id, feature_name, allocated, used)
    values (p_user_id, p_feature_name, v_allocated, 1)
    on conflict (user_id, feature_name) do nothing;

    if found then
      return jsonb_build_object('allowed', true, 'remaining', v_allocated - 1);
    end if;

    select allocated, used, expires_at into v_allocated, v_used, v_expires_at
    from public.user_quotas
    where user_id = p_user_id and feature_name = p_feature_name
    for update;
  end if;

  if v_used >= v_allocated then
    return jsonb_build_object('allowed', false, 'reason', 'quota_exceeded');
  end if;

  update public.user_quotas
  set used = used + 1, updated_at = now()
  where user_id = p_user_id and feature_name = p_feature_name;

  return jsonb_build_object('allowed', true, 'remaining', v_allocated - v_used - 1);
end;
$$;

create or replace function public.consume_feature_quota_for_request(
  p_user_id uuid,
  p_feature_name text,
  p_request_id text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.ai_requests%rowtype;
  v_result jsonb;
begin
  select * into v_request
  from public.ai_requests
  where request_id = p_request_id and user_id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('allowed', false, 'reason', 'request_not_found');
  end if;

  if v_request.feature_quota_consumed and not v_request.feature_quota_released then
    return jsonb_build_object('allowed', true, 'reason', 'already_reserved');
  end if;

  v_result := public.consume_feature_quota(p_user_id, p_feature_name);
  if coalesce((v_result ->> 'allowed')::boolean, false) then
    update public.ai_requests
    set feature_code = p_feature_name,
        feature_quota_consumed = true,
        feature_quota_released = false
    where request_id = p_request_id and user_id = p_user_id;
  end if;

  return v_result;
end;
$$;

create or replace function public.release_feature_quota_for_request(
  p_user_id uuid,
  p_request_id text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.ai_requests%rowtype;
begin
  select * into v_request
  from public.ai_requests
  where request_id = p_request_id and user_id = p_user_id
  for update;

  if not found
     or not v_request.feature_quota_consumed
     or v_request.feature_quota_released
     or v_request.feature_code is null then
    return false;
  end if;

  update public.user_quotas
  set used = greatest(used - 1, 0), updated_at = now()
  where user_id = p_user_id and feature_name = v_request.feature_code;

  update public.ai_requests
  set feature_quota_released = true
  where request_id = p_request_id and user_id = p_user_id;

  return true;
end;
$$;

revoke all on function public.consume_feature_quota_for_request(uuid, text, text) from public, anon, authenticated;
revoke all on function public.release_feature_quota_for_request(uuid, text) from public, anon, authenticated;
grant execute on function public.consume_feature_quota_for_request(uuid, text, text) to service_role;
grant execute on function public.release_feature_quota_for_request(uuid, text) to service_role;

-- Make the existing one-free-plan promise authoritative on the server.
-- Paid plan access stays governed by the verified profiles entitlement.
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
    elsif p_feature_name = 'dietician_meal_plan' then
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

revoke all on function public.consume_feature_quota(uuid, text) from public, anon, authenticated;
grant execute on function public.consume_feature_quota(uuid, text) to service_role;

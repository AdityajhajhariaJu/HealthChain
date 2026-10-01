-- Lock payment rows before profiles, matching checkout/refund lock ordering.
-- Service-only, transactional recovery cannot resurrect a concurrently refunded receipt.
create or replace function public.recover_subscription_entitlement(p_user_id uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_profile public.profiles%rowtype;
  v_expiry timestamptz;
begin
  perform id from public.payments where user_id=p_user_id order by id for update;
  select * into v_profile from public.profiles where id=p_user_id for update;
  if not found or coalesce(v_profile.is_pro,false) then return jsonb_build_object('recovered',false); end if;
  select max(entitlement_expires_at) into v_expiry from public.payments
    where user_id=p_user_id and status in ('paid','partially_refunded') and entitlement_expires_at>now()
      and (product_type='subscription' or plan_id in ('pro_30_days','pro_90_days') or (product_type is null and plan_id is null));
  if v_expiry is null then return jsonb_build_object('recovered',false); end if;
  update public.profiles set is_pro=true,
    pro_expires_at=greatest(v_expiry,v_profile.pro_expires_at),updated_at=now()
    where id=p_user_id;
  return jsonb_build_object('recovered',true);
end $$;
revoke all on function public.recover_subscription_entitlement(uuid) from public, anon, authenticated;
grant execute on function public.recover_subscription_entitlement(uuid) to service_role;

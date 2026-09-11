-- ============================================================================
-- Migration: 20260911_payment_lifecycle_resilience.sql
-- HealthChain Payment Lifecycle & Entitlement Resilience (Package 10)
-- 
-- Fixes:
-- 1. Accurate duration stacking for variable plans (pro_30_days, pro_90_days).
-- 2. Concurrency lock on profile during entitlement stacking.
-- 3. Non-destructive quota provisioning preserving paid top-ups.
-- 4. Idempotent payment recording and status lookup.
-- ============================================================================

create or replace function public.activate_payment_entitlement(
  p_user_id uuid,
  p_order_id text,
  p_payment_id text,
  p_amount integer,
  p_expires_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public
as $body$
declare
  existing_user uuid;
  effective_expiry timestamptz;
  current_profile_expiry timestamptz;
  plan_duration interval;
begin
  -- 1. Pre-insert the payment to natively lock it via the unique constraint.
  -- This prevents concurrent webhook/API calls from bypassing the table lock.
  insert into public.payments (
    user_id, razorpay_order_id, razorpay_payment_id, amount, status, entitlement_expires_at
  ) values (
    p_user_id, p_order_id, p_payment_id, p_amount, 'paid', null
  ) on conflict (razorpay_payment_id) do nothing;

  -- 2. Lock the newly inserted or already existing payment row
  select user_id, entitlement_expires_at
    into existing_user, effective_expiry
    from public.payments
    where razorpay_payment_id = p_payment_id
    for update;

  if existing_user is not null and existing_user <> p_user_id then
    raise exception 'payment belongs to another account';
  end if;

  -- 3. If entitlement is already calculated, it was processed idempotently by another thread
  if effective_expiry is not null then
    return true;
  end if;

  -- 4. Lock user profile row to serialize concurrent stacking payments
  select pro_expires_at into current_profile_expiry
    from public.profiles
    where id = p_user_id
    for update;

  -- 5. Determine plan duration dynamically from amount or expiry
  if p_amount >= 80000 then
    plan_duration := interval '90 days';
  else
    plan_duration := interval '30 days';
  end if;

  -- 6. Calculate effective expiration date respecting previous active subscriptions
  if current_profile_expiry is not null and current_profile_expiry > now() then
    effective_expiry := current_profile_expiry + plan_duration;
  else
    effective_expiry := coalesce(p_expires_at, now() + plan_duration);
  end if;

  -- 7. Update payment record with verified expiry
  update public.payments
    set entitlement_expires_at = effective_expiry,
        status = 'paid',
        updated_at = coalesce(updated_at, now())
    where razorpay_payment_id = p_payment_id;

  -- 8. Provision user profile
  update public.profiles
    set is_pro = true,
        pro_expires_at = effective_expiry,
        updated_at = now()
    where id = p_user_id;

  if not found then
    raise exception 'profile not found for payment account';
  end if;

  return true;
end;
$body$;

-- Non-destructive base quota provisioning preserving existing top-ups
create or replace function public.provision_base_quota(
  p_user_id uuid,
  p_plan_id text,
  p_expires_at timestamptz
) returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_ava integer;
  v_qc integer;
  v_collab integer;
  v_jarvis integer;
  v_pharmacy integer;
  v_lab integer;
begin
  if p_plan_id = 'pro_90_days' then
    v_ava := 120;
    v_qc := 10;
    v_collab := 8;
    v_jarvis := 5;
    v_pharmacy := 120;
    v_lab := 30;
  else
    v_ava := 30;
    v_qc := 3;
    v_collab := 2;
    v_jarvis := 1;
    v_pharmacy := 60;
    v_lab := 10;
  end if;

  -- Non-destructive upsert into user_quotas preserving user-paid top-up credits
  insert into public.user_quotas (user_id, feature_name, allocated, used, expires_at, updated_at)
  values
    (p_user_id, 'ava_replies', v_ava, 0, p_expires_at, now()),
    (p_user_id, 'quick_consult', v_qc, 0, p_expires_at, now()),
    (p_user_id, 'deep_collab', v_collab, 0, p_expires_at, now()),
    (p_user_id, 'jarvis', v_jarvis, 0, p_expires_at, now()),
    (p_user_id, 'pharmacy_hub', v_pharmacy, 0, p_expires_at, now()),
    (p_user_id, 'lab_report', v_lab, 0, p_expires_at, now())
  on conflict (user_id, feature_name) do update
    set allocated = user_quotas.allocated + excluded.allocated,
        expires_at = greatest(coalesce(user_quotas.expires_at, now()), excluded.expires_at),
        updated_at = now();
end;
$$;

revoke all on function public.activate_payment_entitlement(uuid, text, text, integer, timestamptz)
  from public, anon, authenticated;
grant execute on function public.activate_payment_entitlement(uuid, text, text, integer, timestamptz)
  to service_role;

revoke all on function public.provision_base_quota(uuid, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.provision_base_quota(uuid, text, timestamptz)
  to service_role;

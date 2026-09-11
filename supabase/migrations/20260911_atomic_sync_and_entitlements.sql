-- ============================================================================
-- Migration: 20260911_atomic_sync_and_entitlements.sql
-- HealthChain Atomic Synchronization, Durable Deletions & Payment Entitlements
-- 
-- 1. Revision-conditional atomic case sync to prevent concurrent overwrites.
-- 2. Atomic case deletion with guaranteed durable tombstone insertion.
-- 3. Fulfillment state tracking on payments table ('pending', 'fulfilled', 'failed').
-- 4. Atomic subscription activation and quota allocation (single transaction lock).
-- 5. Atomic top-up activation and quota allocation with safe idempotent retry.
-- ============================================================================

-- 1. Ensure fulfillment tracking columns exist on public.payments
do $$
begin
  if to_regclass('public.payments') is not null then
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'payments' and column_name = 'fulfillment_status'
    ) then
      alter table public.payments add column fulfillment_status text not null default 'pending';
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'payments' and column_name = 'fulfillment_error'
    ) then
      alter table public.payments add column fulfillment_error text;
    end if;
  end if;
end $$;

-- 2. Atomic revision-conditional case sync RPC
create or replace function public.sync_case_with_revision_check(
  p_user_id uuid,
  p_case_id text,
  p_expected_revision bigint,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_curr_rev bigint;
  v_curr_deleted_at timestamptz;
  v_curr_data jsonb;
  v_next_rev bigint;
begin
  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'Unauthorized case sync operation';
  end if;

  -- Lock the target case row for update
  select revision, deleted_at, data
    into v_curr_rev, v_curr_deleted_at, v_curr_data
    from public.cases
    where id = p_case_id and user_id = p_user_id
    for update;

  -- If case is marked deleted on server, report deletion conflict
  if v_curr_deleted_at is not null then
    return jsonb_build_object(
      'success', false,
      'conflict', true,
      'deleted', true,
      'deleted_at', v_curr_deleted_at
    );
  end if;

  -- If revision diverged from client expectation, reject write and return current server state
  if v_curr_rev is not null and p_expected_revision is not null and v_curr_rev <> p_expected_revision then
    return jsonb_build_object(
      'success', false,
      'conflict', true,
      'deleted', false,
      'current_revision', v_curr_rev,
      'current_data', v_curr_data
    );
  end if;

  -- Calculate next revision atomically
  v_next_rev := coalesce(v_curr_rev, 0) + 1;
  if p_payload ? 'revision' then
    v_next_rev := greatest(v_next_rev, (p_payload->>'revision')::bigint);
  end if;

  -- Insert or update case atomically
  insert into public.cases (
    id, user_id, title, status, mode, revision, data, updated_at, created_at
  ) values (
    p_case_id,
    p_user_id,
    coalesce(p_payload->>'title', 'Untitled health case'),
    coalesce(p_payload->>'status', 'active'),
    coalesce(p_payload->>'mode', 'multi'),
    v_next_rev,
    p_payload->'data',
    now(),
    coalesce((p_payload->>'created_at')::timestamptz, now())
  ) on conflict (id) do update
    set title = excluded.title,
        status = excluded.status,
        mode = excluded.mode,
        revision = v_next_rev,
        data = excluded.data,
        updated_at = now();

  return jsonb_build_object(
    'success', true,
    'conflict', false,
    'new_revision', v_next_rev
  );
end;
$$;

-- 3. Atomic case deletion with guaranteed durable tombstone RPC
create or replace function public.delete_case_with_tombstone(
  p_user_id uuid,
  p_case_id text,
  p_profile_id text,
  p_deleted_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'Unauthorized case deletion operation';
  end if;

  -- 1. Insert tombstone atomically
  insert into public.case_tombstones (id, user_id, profile_id, deleted_at, created_at)
  values (p_case_id, p_user_id, coalesce(p_profile_id, 'profile_1'), coalesce(p_deleted_at, now()), now())
  on conflict (user_id, profile_id, id) do update
    set deleted_at = greatest(case_tombstones.deleted_at, excluded.deleted_at);

  -- 2. Delete case row in same transaction
  delete from public.cases
  where id = p_case_id and user_id = p_user_id;

  return true;
end;
$$;

-- 4. Atomic subscription activation and quota allocation
create or replace function public.activate_and_provision_subscription(
  p_user_id uuid,
  p_order_id text,
  p_payment_id text,
  p_amount integer,
  p_plan_id text,
  p_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_user uuid;
  existing_fulfillment text;
  effective_expiry timestamptz;
  current_profile_expiry timestamptz;
  plan_duration interval;
  v_ava integer;
  v_qc integer;
  v_collab integer;
  v_jarvis integer;
  v_pharmacy integer;
  v_lab integer;
begin
  -- 1. Pre-insert payment to lock row via unique razorpay_payment_id
  insert into public.payments (
    user_id, razorpay_order_id, razorpay_payment_id, amount, status, fulfillment_status
  ) values (
    p_user_id, p_order_id, p_payment_id, p_amount, 'paid', 'pending'
  ) on conflict (razorpay_payment_id) do nothing;

  -- 2. Lock payment row
  select user_id, fulfillment_status, entitlement_expires_at
    into existing_user, existing_fulfillment, effective_expiry
    from public.payments
    where razorpay_payment_id = p_payment_id
    for update;

  if existing_user is not null and existing_user <> p_user_id then
    raise exception 'payment belongs to another account';
  end if;

  -- 3. If already fulfilled, return idempotently
  if existing_fulfillment = 'fulfilled' and effective_expiry is not null then
    return jsonb_build_object(
      'success', true,
      'already_processed', true,
      'expires_at', effective_expiry
    );
  end if;

  -- 4. Lock user profile row to serialize concurrent stacking payments
  select pro_expires_at into current_profile_expiry
    from public.profiles
    where id = p_user_id
    for update;

  -- 5. Determine plan duration
  if p_plan_id = 'pro_90_days' or p_amount >= 80000 then
    plan_duration := interval '90 days';
  else
    plan_duration := interval '30 days';
  end if;

  if current_profile_expiry is not null and current_profile_expiry > now() then
    effective_expiry := current_profile_expiry + plan_duration;
  else
    effective_expiry := coalesce(p_expires_at, now() + plan_duration);
  end if;

  -- 6. Calculate quotas
  if p_plan_id = 'pro_90_days' then
    v_ava := 120; v_qc := 10; v_collab := 8; v_jarvis := 5; v_pharmacy := 120; v_lab := 30;
  else
    v_ava := 30; v_qc := 3; v_collab := 2; v_jarvis := 1; v_pharmacy := 60; v_lab := 10;
  end if;

  -- 7. Provision base quotas
  insert into public.user_quotas (user_id, feature_name, allocated, used, expires_at, updated_at)
  values
    (p_user_id, 'ava_replies', v_ava, 0, effective_expiry, now()),
    (p_user_id, 'quick_consult', v_qc, 0, effective_expiry, now()),
    (p_user_id, 'deep_collab', v_collab, 0, effective_expiry, now()),
    (p_user_id, 'jarvis', v_jarvis, 0, effective_expiry, now()),
    (p_user_id, 'pharmacy_hub', v_pharmacy, 0, effective_expiry, now()),
    (p_user_id, 'lab_report', v_lab, 0, effective_expiry, now())
  on conflict (user_id, feature_name) do update
    set allocated = user_quotas.allocated + excluded.allocated,
        expires_at = greatest(coalesce(user_quotas.expires_at, now()), excluded.expires_at),
        updated_at = now();

  -- 8. Update profile pro status
  update public.profiles
    set is_pro = true,
        pro_expires_at = effective_expiry,
        updated_at = now()
    where id = p_user_id;

  -- 9. Mark payment fulfilled
  update public.payments
    set entitlement_expires_at = effective_expiry,
        status = 'paid',
        fulfillment_status = 'fulfilled',
        fulfillment_error = null,
        updated_at = now()
    where razorpay_payment_id = p_payment_id;

  return jsonb_build_object(
    'success', true,
    'already_processed', false,
    'expires_at', effective_expiry
  );
end;
$$;

-- 5. Atomic top-up activation and quota allocation
create or replace function public.activate_and_provision_topup(
  p_user_id uuid,
  p_order_id text,
  p_payment_id text,
  p_amount integer,
  p_feature text,
  p_quantity integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_user uuid;
  existing_fulfillment text;
begin
  -- 1. Insert payment row
  insert into public.payments (
    user_id, razorpay_order_id, razorpay_payment_id, amount, status, fulfillment_status
  ) values (
    p_user_id, p_order_id, p_payment_id, p_amount, 'paid', 'pending'
  ) on conflict (razorpay_payment_id) do nothing;

  -- 2. Lock payment row
  select user_id, fulfillment_status
    into existing_user, existing_fulfillment
    from public.payments
    where razorpay_payment_id = p_payment_id
    for update;

  if existing_user is not null and existing_user <> p_user_id then
    raise exception 'payment belongs to another account';
  end if;

  if existing_fulfillment = 'fulfilled' then
    return jsonb_build_object(
      'success', true,
      'already_processed', true
    );
  end if;

  -- 3. Provision feature quota atomically
  insert into public.user_quotas (user_id, feature_name, allocated, used, expires_at, updated_at)
  values (
    p_user_id,
    p_feature,
    p_quantity,
    0,
    null,
    now()
  ) on conflict (user_id, feature_name) do update
    set allocated = user_quotas.allocated + excluded.allocated,
        updated_at = now();

  -- 4. Mark payment fulfilled
  update public.payments
    set status = 'paid',
        fulfillment_status = 'fulfilled',
        fulfillment_error = null,
        updated_at = now()
    where razorpay_payment_id = p_payment_id;

  return jsonb_build_object(
    'success', true,
    'already_processed', false
  );
end;
$$;

-- Security grants
revoke all on function public.sync_case_with_revision_check(uuid, text, bigint, jsonb) from public, anon;
grant execute on function public.sync_case_with_revision_check(uuid, text, bigint, jsonb) to authenticated, service_role;

revoke all on function public.delete_case_with_tombstone(uuid, text, text, timestamptz) from public, anon;
grant execute on function public.delete_case_with_tombstone(uuid, text, text, timestamptz) to authenticated, service_role;

revoke all on function public.activate_and_provision_subscription(uuid, text, text, integer, text, timestamptz) from public, anon;
grant execute on function public.activate_and_provision_subscription(uuid, text, text, integer, text, timestamptz) to service_role;

revoke all on function public.activate_and_provision_topup(uuid, text, text, integer, text, integer) from public, anon;
grant execute on function public.activate_and_provision_topup(uuid, text, text, integer, text, integer) to service_role;

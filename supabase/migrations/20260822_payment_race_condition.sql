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
as $body
declare
  existing_user uuid;
  effective_expiry timestamptz;
  current_profile_expiry timestamptz;
begin
  -- First, pre-insert the payment to natively lock it via the unique constraint.
  -- This prevents concurrent webhook/API calls from bypassing the table lock.
  insert into public.payments (
    user_id, razorpay_order_id, razorpay_payment_id, amount, status, entitlement_expires_at
  ) values (
    p_user_id, p_order_id, p_payment_id, p_amount, 'paid', null
  ) on conflict (razorpay_payment_id) do nothing;

  -- Lock the newly inserted or already existing row
  select user_id, entitlement_expires_at
    into existing_user, effective_expiry
    from public.payments
    where razorpay_payment_id = p_payment_id
    for update;

  if existing_user is not null and existing_user <> p_user_id then
    raise exception 'payment belongs to another account';
  end if;

  -- If entitlement is already calculated, it was processed by another thread
  if effective_expiry is not null then
    return true;
  end if;

  -- New payment: calculate stacking entitlement
  select pro_expires_at into current_profile_expiry from public.profiles where id = p_user_id;
  if current_profile_expiry is not null and current_profile_expiry > now() then
    effective_expiry := current_profile_expiry + interval '30 days';
  else
    effective_expiry := p_expires_at;
  end if;

  -- Update payment with expiry
  update public.payments
    set entitlement_expires_at = effective_expiry
    where razorpay_payment_id = p_payment_id;

  -- Provision the user profile
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
$body;

-- Idempotent refund ledger and quota/entitlement reconciliation.
alter table public.payments
  add column if not exists plan_id text,
  add column if not exists product_type text,
  add column if not exists feature_name text,
  add column if not exists quantity integer,
  add column if not exists refunded_amount integer not null default 0;

alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments add constraint payments_status_check
  check (status in ('paid', 'partially_refunded', 'refunded', 'failed'));

create table if not exists public.payment_refunds (
  refund_id text primary key,
  razorpay_payment_id text not null,
  amount integer not null check (amount > 0),
  processed_at timestamptz not null default now()
);

alter table public.payment_refunds enable row level security;
revoke all on public.payment_refunds from public, anon, authenticated;
grant all on public.payment_refunds to service_role;

create or replace function public.process_payment_refund(
  p_refund_id text,
  p_payment_id text,
  p_refund_amount integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
  v_previous integer;
  v_total integer;
  v_units_before integer := 0;
  v_units_after integer := 0;
  v_units_to_reverse integer := 0;
  v_expiry timestamptz;
begin
  if p_refund_id is null or p_payment_id is null or p_refund_amount <= 0 then
    raise exception 'invalid refund payload';
  end if;

  if exists (select 1 from public.payment_refunds where refund_id = p_refund_id) then
    return jsonb_build_object('success', true, 'already_processed', true);
  end if;

  select * into v_payment from public.payments
   where razorpay_payment_id = p_payment_id for update;
  if not found then raise exception 'payment not found'; end if;

  v_previous := coalesce(v_payment.refunded_amount, 0);
  v_total := v_previous + p_refund_amount;
  if v_total > v_payment.amount then raise exception 'refund exceeds captured amount'; end if;

  insert into public.payment_refunds(refund_id, razorpay_payment_id, amount)
  values (p_refund_id, p_payment_id, p_refund_amount);

  if v_payment.product_type = 'topup' and coalesce(v_payment.quantity, 0) > 0 then
    v_units_before := floor((v_previous::numeric / v_payment.amount) * v_payment.quantity);
    v_units_after := floor((v_total::numeric / v_payment.amount) * v_payment.quantity);
    v_units_to_reverse := greatest(0, v_units_after - v_units_before);
    if v_units_to_reverse > 0 and v_payment.feature_name is not null then
      update public.user_quotas
         set allocated = greatest(used, allocated - v_units_to_reverse), updated_at = now()
       where user_id = v_payment.user_id and feature_name = v_payment.feature_name;
    end if;
  end if;

  update public.payments
     set refunded_amount = v_total,
         status = case when v_total = amount then 'refunded' else 'partially_refunded' end,
         entitlement_expires_at = case when v_total = amount then null else entitlement_expires_at end,
         updated_at = now()
   where razorpay_payment_id = p_payment_id;

  if v_payment.product_type = 'subscription' and v_total = v_payment.amount then
    select max(entitlement_expires_at) into v_expiry
      from public.payments
     where user_id = v_payment.user_id
       and razorpay_payment_id <> p_payment_id
       and status in ('paid', 'partially_refunded')
       and entitlement_expires_at > now();

    update public.profiles
       set is_pro = v_expiry is not null,
           pro_expires_at = v_expiry,
           updated_at = now()
     where id = v_payment.user_id;
  end if;

  return jsonb_build_object(
    'success', true,
    'already_processed', false,
    'refunded_amount', v_total,
    'fully_refunded', v_total = v_payment.amount
  );
end;
$$;

revoke all on function public.process_payment_refund(text, text, integer)
  from public, anon, authenticated;
grant execute on function public.process_payment_refund(text, text, integer)
  to service_role;

-- Native store receipts are verified by the server before this service-only RPC.
-- No customer-facing role may read or change the purchase ledger.
create table if not exists public.healthchain_store_purchases (
  transaction_key text primary key,
  purchase_group_key text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  product_id text not null,
  plan_id text not null check (plan_id in ('pro_30_days', 'pro_90_days')),
  purchased_at timestamptz,
  expires_at timestamptz,
  granted boolean not null default false,
  revoked boolean not null default false,
  updated_at timestamptz not null default now(),
  check (transaction_key ~ '^(ios|android):[0-9a-f]{64}$')
);
create index if not exists healthchain_store_purchase_owner on public.healthchain_store_purchases(user_id);
create index if not exists healthchain_store_purchase_group on public.healthchain_store_purchases(purchase_group_key);
alter table public.healthchain_store_purchases enable row level security;
revoke all on public.healthchain_store_purchases from public, anon, authenticated;
grant select, insert, update, delete on public.healthchain_store_purchases to service_role;

create or replace function public.apply_healthchain_store_purchase(
  p_user_id uuid, p_platform text, p_transaction_key text, p_group_key text, p_product_id text,
  p_plan_id text, p_purchased_at timestamptz, p_expires_at timestamptz, p_revoked boolean
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  entry public.healthchain_store_purchases%rowtype;
  expiry timestamptz;
  profile_expiry timestamptz;
  remaining_expiry timestamptz;
  quotas jsonb;
  feature text;
  quantity integer;
begin
  if p_platform not in ('ios', 'android') or p_plan_id not in ('pro_30_days', 'pro_90_days')
    or p_transaction_key not like p_platform || ':%'
    or p_group_key not like p_platform || ':%'
    or p_product_id <> (case p_plan_id when 'pro_30_days' then 'com.healthchain.app.pro30' else 'com.healthchain.app.pro90' end)
    or ((p_purchased_at is null or p_expires_at is null) and not p_revoked)
    or p_purchased_at > now() + interval '5 minutes' or p_revoked is null then
    raise exception 'Invalid store entitlement';
  end if;
  -- The stores supply the actual calendar renewal/grace-period expiry.
  expiry := p_expires_at;
  quotas := case p_plan_id when 'pro_30_days'
    then '{"quick_consult":3,"deep_collab":2,"jarvis":1,"ava_replies":30,"pharmacy_hub":60,"lab_report":10}'::jsonb
    else '{"quick_consult":10,"deep_collab":8,"jarvis":5,"ava_replies":120,"pharmacy_hub":120,"lab_report":30}'::jsonb end;
  -- Lock the profile first, serializing different transactions on the same account.
  select pro_expires_at into profile_expiry from public.profiles where id = p_user_id for update;
  if not found then raise exception 'Account profile unavailable'; end if;
  insert into public.healthchain_store_purchases(transaction_key,purchase_group_key,user_id,platform,product_id,plan_id,purchased_at,expires_at)
    values(p_transaction_key,p_group_key,p_user_id,p_platform,p_product_id,p_plan_id,p_purchased_at,expiry)
    on conflict (transaction_key) do nothing;
  select * into entry from public.healthchain_store_purchases where transaction_key=p_transaction_key for update;
  if entry.user_id <> p_user_id or entry.product_id <> p_product_id
    or (entry.purchased_at is not null and p_purchased_at is not null and entry.purchased_at <> p_purchased_at) then
    raise exception 'Store transaction belongs to another account or product';
  end if;
  if p_revoked then
    if entry.granted and not entry.revoked and entry.expires_at > now() then
      for feature, quantity in select key, value::integer from jsonb_each_text(quotas) loop
        update public.user_quotas set allocated = greatest(used, allocated-quantity), updated_at=now()
          where user_id=p_user_id and feature_name=feature;
      end loop;
    end if;
    update public.healthchain_store_purchases set revoked=true,updated_at=now() where transaction_key=p_transaction_key;
    select max(expires_at) into remaining_expiry from public.healthchain_store_purchases
      where user_id=p_user_id and granted and not revoked;
    select greatest(remaining_expiry,max(entitlement_expires_at)) into remaining_expiry from public.payments
      where user_id=p_user_id and fulfillment_status='fulfilled' and status='paid';
    update public.profiles set pro_expires_at=remaining_expiry,is_pro=coalesce(remaining_expiry>now(),false),updated_at=now()
      where id=p_user_id and pro_expires_at=profile_expiry;
    return jsonb_build_object('success',false,'revoked',true);
  end if;
  -- Revocation is permanent for this transaction; duplicated notifications cannot regrant it.
  if entry.revoked then return jsonb_build_object('success',false,'revoked',true); end if;
  if entry.granted then
    update public.healthchain_store_purchases set expires_at=expiry,updated_at=now() where transaction_key=p_transaction_key;
    select max(expires_at) into remaining_expiry from public.healthchain_store_purchases where user_id=p_user_id and granted and not revoked;
    select greatest(remaining_expiry,max(entitlement_expires_at)) into remaining_expiry from public.payments
      where user_id=p_user_id and fulfillment_status='fulfilled' and status='paid';
    update public.profiles set pro_expires_at=remaining_expiry,is_pro=coalesce(remaining_expiry>now(),false),updated_at=now() where id=p_user_id;
    update public.user_quotas set expires_at=remaining_expiry where user_id=p_user_id;
    return jsonb_build_object('success',expiry>now(),'already_processed',true,'expires_at',expiry);
  end if;
  if expiry <= now() then return jsonb_build_object('success',false,'expired',true); end if;
  for feature, quantity in select key, value::integer from jsonb_each_text(quotas) loop
    insert into public.user_quotas(user_id,feature_name,allocated,used,expires_at,updated_at)
      values(p_user_id,feature,quantity,0,greatest(expiry,profile_expiry),now())
      on conflict(user_id,feature_name) do update
      set allocated = case when public.user_quotas.expires_at <= now() then excluded.allocated
        else public.user_quotas.allocated+excluded.allocated end,
        used = case when public.user_quotas.expires_at <= now() then 0 else public.user_quotas.used end,
        expires_at=greatest(public.user_quotas.expires_at,excluded.expires_at),updated_at=now();
  end loop;
  update public.profiles set is_pro=true,pro_expires_at=greatest(profile_expiry,expiry),updated_at=now() where id=p_user_id;
  update public.healthchain_store_purchases set granted=true,purchased_at=p_purchased_at,expires_at=expiry,updated_at=now() where transaction_key=p_transaction_key;
  return jsonb_build_object('success',true,'already_processed',false,'expires_at',expiry);
end; $$;
revoke all on function public.apply_healthchain_store_purchase(uuid,text,text,text,text,text,timestamptz,timestamptz,boolean) from public, anon, authenticated;
grant execute on function public.apply_healthchain_store_purchase(uuid,text,text,text,text,text,timestamptz,timestamptz,boolean) to service_role;

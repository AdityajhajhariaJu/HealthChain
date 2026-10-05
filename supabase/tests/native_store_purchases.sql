-- Synthetic integration checks. All inserted accounts and grants roll back.
begin;
do $$
declare
  owner_a uuid := gen_random_uuid();
  owner_b uuid := gen_random_uuid();
  purchased timestamptz := now();
  result jsonb;
  quantity integer;
  blocked boolean := false;
begin
  insert into auth.users(id,email,raw_user_meta_data,raw_app_meta_data)
    values(owner_a,'store-synthetic-' || owner_a || '@example.invalid','{}','{}'),
          (owner_b,'store-synthetic-' || owner_b || '@example.invalid','{}','{}');
  insert into public.profiles(id) values(owner_a),(owner_b) on conflict(id) do nothing;
  result := public.apply_healthchain_store_purchase(owner_a,'ios','ios:' || repeat('a',64),'ios:' || repeat('d',64),
    'com.healthchain.app.pro30','pro_30_days',purchased,purchased+interval '1 month',false);
  if not (result->>'success')::boolean then raise exception 'Initial grant failed'; end if;
  result := public.apply_healthchain_store_purchase(owner_a,'ios','ios:' || repeat('a',64),'ios:' || repeat('d',64),
    'com.healthchain.app.pro30','pro_30_days',purchased,purchased+interval '1 month',false);
  select allocated into quantity from public.user_quotas where user_id=owner_a and feature_name='quick_consult';
  if quantity <> 3 or not (result->>'already_processed')::boolean then raise exception 'Duplicate grant'; end if;
  begin
    perform public.apply_healthchain_store_purchase(owner_b,'ios','ios:' || repeat('a',64),'ios:' || repeat('d',64),
      'com.healthchain.app.pro30','pro_30_days',purchased,purchased+interval '1 month',false);
  exception when others then blocked := true;
  end;
  if not blocked then raise exception 'Cross-account transaction accepted'; end if;
  result := public.apply_healthchain_store_purchase(owner_a,'ios','ios:' || repeat('b',64),'ios:' || repeat('d',64),
    'com.healthchain.app.pro30','pro_30_days',purchased-interval '3 months',purchased-interval '2 months',false);
  if coalesce((result->>'success')::boolean,false) then raise exception 'Expired restore created access'; end if;
  result := public.apply_healthchain_store_purchase(owner_a,'ios','ios:' || repeat('c',64),'ios:' || repeat('d',64),
    'com.healthchain.app.pro30','pro_30_days',purchased,purchased+interval '2 months',false);
  select allocated into quantity from public.user_quotas where user_id=owner_a and feature_name='quick_consult';
  if quantity <> 6 then raise exception 'Renewal allowance missing'; end if;
  perform public.apply_healthchain_store_purchase(owner_a,'ios','ios:' || repeat('c',64),'ios:' || repeat('d',64),
    'com.healthchain.app.pro30','pro_30_days',purchased,purchased+interval '2 months',true);
  select allocated into quantity from public.user_quotas where user_id=owner_a and feature_name='quick_consult';
  if quantity <> 3 then raise exception 'Refund allowance not removed'; end if;
  perform public.apply_healthchain_store_purchase(owner_a,'ios','ios:' || repeat('c',64),'ios:' || repeat('d',64),
    'com.healthchain.app.pro30','pro_30_days',purchased,purchased+interval '2 months',true);
  select allocated into quantity from public.user_quotas where user_id=owner_a and feature_name='quick_consult';
  if quantity <> 3 then raise exception 'Refund was applied twice'; end if;
  result := public.apply_healthchain_store_purchase(owner_a,'ios','ios:' || repeat('c',64),'ios:' || repeat('d',64),
    'com.healthchain.app.pro30','pro_30_days',purchased,purchased+interval '2 months',false);
  if coalesce((result->>'success')::boolean,false) then raise exception 'Revoked receipt regranted'; end if;
  delete from auth.users where id=owner_a;
  if exists(select 1 from public.healthchain_store_purchases where user_id=owner_a) then raise exception 'Account deletion left purchase ledger'; end if;
end; $$;
rollback;

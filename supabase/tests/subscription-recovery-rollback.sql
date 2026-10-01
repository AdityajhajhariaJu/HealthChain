-- Synthetic receipts only. No payment provider is called and all writes roll back.
begin;
insert into auth.users(id,email) values ('9db68d89-7b52-4b62-95ae-a7c3a4112e75','entitlement-recovery@example.invalid');
insert into public.profiles(id,is_pro,pro_expires_at) values ('9db68d89-7b52-4b62-95ae-a7c3a4112e75',false,'2098-01-01') on conflict(id) do update set is_pro=false,pro_expires_at='2098-01-01';
insert into public.payments(user_id,razorpay_order_id,razorpay_payment_id,amount,status,plan_id,product_type,entitlement_expires_at) values
  ('9db68d89-7b52-4b62-95ae-a7c3a4112e75','synthetic-recovery-order-a','synthetic-recovery-payment-a',49900,'paid','pro_30_days','subscription','2097-01-01'),
  ('9db68d89-7b52-4b62-95ae-a7c3a4112e75','synthetic-recovery-order-b','synthetic-recovery-payment-b',89900,'partially_refunded','pro_90_days','subscription','2099-01-01'),
  ('9db68d89-7b52-4b62-95ae-a7c3a4112e75','synthetic-recovery-order-c','synthetic-recovery-payment-c',9900,'paid','topup_ava','topup','2100-01-01');
do $$ begin
  if not (public.recover_subscription_entitlement('9db68d89-7b52-4b62-95ae-a7c3a4112e75')->>'recovered')::boolean then raise exception 'Valid receipt not recovered'; end if;
  if (select pro_expires_at from public.profiles where id='9db68d89-7b52-4b62-95ae-a7c3a4112e75') <> '2099-01-01'::timestamptz then raise exception 'Latest subscription expiry not used'; end if;
  if (public.recover_subscription_entitlement('9db68d89-7b52-4b62-95ae-a7c3a4112e75')->>'recovered')::boolean then raise exception 'Duplicate recovery counted'; end if;
end $$;
update public.profiles set is_pro=false,pro_expires_at='2101-01-01' where id='9db68d89-7b52-4b62-95ae-a7c3a4112e75';
do $$ begin
  perform public.recover_subscription_entitlement('9db68d89-7b52-4b62-95ae-a7c3a4112e75');
  if (select pro_expires_at from public.profiles where id='9db68d89-7b52-4b62-95ae-a7c3a4112e75') <> '2101-01-01'::timestamptz then raise exception 'Longer existing expiry shortened'; end if;
end $$;
update public.payments set status='refunded',entitlement_expires_at=null where user_id='9db68d89-7b52-4b62-95ae-a7c3a4112e75' and product_type='subscription';
update public.profiles set is_pro=false,pro_expires_at=null where id='9db68d89-7b52-4b62-95ae-a7c3a4112e75';
do $$ begin
  if (public.recover_subscription_entitlement('9db68d89-7b52-4b62-95ae-a7c3a4112e75')->>'recovered')::boolean then raise exception 'Refunded or top-up receipt restored Pro'; end if;
  if has_function_privilege('authenticated','public.recover_subscription_entitlement(uuid)','execute') then raise exception 'Recovery exposed to client'; end if;
end $$;
rollback;

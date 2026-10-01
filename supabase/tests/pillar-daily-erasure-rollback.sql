begin;
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at) values
('3a346b54-6c68-450a-a674-205a59054955','00000000-0000-0000-0000-000000000000','authenticated','authenticated','pillar-synthetic-a@example.invalid','',now(),now(),now()),
('73a5bc67-3885-4985-95e1-0e9eb3bf9864','00000000-0000-0000-0000-000000000000','authenticated','authenticated','pillar-synthetic-b@example.invalid','',now(),now(),now());
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"3a346b54-6c68-450a-a674-205a59054955","role":"authenticated"}',true);
insert into public.health_observations(id,user_id,profile_id,kind,local_date,time_precision,source,evidence_type,payload,idempotency_key,recorded_at,revision) values
('5f0c7b1e-d744-4eec-8dac-a97c1c2e51cc','3a346b54-6c68-450a-a674-205a59054955','profile_1','hydration','2026-10-01','date_only','legacy','user_report','{"kind":"hydration","amountMl":375,"drinkType":"water"}','synthetic-water',now(),1),
('0665166b-121e-45cd-9d64-9264bce34944','3a346b54-6c68-450a-a674-205a59054955','profile_1','medication_dose','2026-10-01','date_only','legacy','user_report','{"kind":"medication_dose","medicationId":"synthetic-med","name":"Synthetic medication","status":"unknown"}','synthetic-dose',now(),1);
do $$ begin
 if (select (payload->>'amountMl')::numeric from public.health_observations where id='5f0c7b1e-d744-4eec-8dac-a97c1c2e51cc') <> 375 then raise exception 'ml drift'; end if;
 begin update public.health_observations set payload='{"kind":"hydration","amountMl":0,"drinkType":"water"}' where id='5f0c7b1e-d744-4eec-8dac-a97c1c2e51cc'; raise exception 'invalid payload accepted'; exception when check_violation then null; end;
 begin update public.health_observations set payload='{"kind":"medication_dose","medicationId":"synthetic-med","name":"Synthetic medication","status":"inferred_taken"}' where id='0665166b-121e-45cd-9d64-9264bce34944'; raise exception 'inferred dose accepted'; exception when check_violation then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"73a5bc67-3885-4985-95e1-0e9eb3bf9864","role":"authenticated"}',true);
do $$ begin if exists(select 1 from public.health_observations where user_id='3a346b54-6c68-450a-a674-205a59054955') then raise exception 'owner isolation failed'; end if; end $$;
reset role;
select public.delete_healthchain_user_data('3a346b54-6c68-450a-a674-205a59054955');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"3a346b54-6c68-450a-a674-205a59054955","role":"authenticated"}',true);
do $$ begin
 if public.healthchain_current_account_active() then raise exception 'deleted account can upload storage'; end if;
 if exists(select 1 from public.health_observations where user_id='3a346b54-6c68-450a-a674-205a59054955') then raise exception 'erasure incomplete'; end if;
 begin insert into public.health_observations(id,user_id,profile_id,kind,local_date,time_precision,source,evidence_type,payload,idempotency_key,recorded_at,revision) values(gen_random_uuid(),'3a346b54-6c68-450a-a674-205a59054955','profile_1','hydration','2026-10-01','date_only','legacy','user_report','{"kind":"hydration","amountMl":375,"drinkType":"water"}','synthetic-resurrection',now(),1); raise exception 'erased owner recreated data'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select jsonb_build_object('exact_375ml',true,'invalid_payloads_rejected',true,'foreign_owner_isolated',true,'erased_owner_write_rejected',true,'storage_revoked',true,'transaction','rolled_back') as evidence;
rollback;

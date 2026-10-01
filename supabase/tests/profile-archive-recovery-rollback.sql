begin;
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at) values
('311a0a3f-d4f9-4014-9152-7a7f9b098807','00000000-0000-0000-0000-000000000000','authenticated','authenticated','profile-archive-a@example.invalid','',now(),now(),now()),
('dd2bce9e-b7f0-47a7-b4e4-fd93fa718807','00000000-0000-0000-0000-000000000000','authenticated','authenticated','profile-archive-b@example.invalid','',now(),now(),now());
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"311a0a3f-d4f9-4014-9152-7a7f9b098807","role":"authenticated"}',true);
do $$
declare snapshot jsonb; legacy_at timestamptz; result jsonb; archived jsonb; archived_case jsonb;
begin
  select updated_at into legacy_at from public.profiles where id=auth.uid();
  result := public.sync_health_profile_snapshot('profile_1',null,legacy_at,'{"profileName":"Synthetic profile","demographics":{"weight":70},"allergies":[],"isPro":true}');
  if not (result->>'success')::boolean then raise exception 'initial profile sync failed'; end if;
  select data into snapshot from public.healthchain_profiles where user_id=auth.uid() and profile_id='profile_1';
  if snapshot ? 'isPro' or (select is_pro from public.profiles where id=auth.uid()) then raise exception 'entitlement promotion'; end if;
  select updated_at into legacy_at from public.profiles where id=auth.uid();
  result := public.sync_health_profile_snapshot('profile_1',snapshot,legacy_at,jsonb_set(snapshot,'{demographics,weight}','73'));
  if not (result->>'success')::boolean then raise exception 'profile update failed'; end if;
  result := public.sync_health_profile_snapshot('profile_1',snapshot,legacy_at,jsonb_set(snapshot,'{allergies}','["peanut"]'));
  if not (result->>'conflict')::boolean then raise exception 'stale snapshot accepted'; end if;
  if (select demographics->>'weight' from public.profiles where id=auth.uid())<>'73' then raise exception 'primary mirror drift'; end if;
  insert into public.health_observations(id,user_id,profile_id,kind,local_date,time_precision,source,evidence_type,payload,idempotency_key,recorded_at,revision)
  values('4f2a0d85-a02d-4de0-8fdd-70f3aa961883',auth.uid(),'profile_1','hydration','2026-10-01','date_only','legacy','user_report','{"kind":"hydration","amountMl":375,"drinkType":"water"}','archive-synthetic-water',now(),1);
  select jsonb_build_object('userId',auth.uid(),'health_observations',jsonb_agg(to_jsonb(o))) into archived from public.health_observations o where o.id='4f2a0d85-a02d-4de0-8fdd-70f3aa961883';
  delete from public.health_observations where id='4f2a0d85-a02d-4de0-8fdd-70f3aa961883';
  result := public.restore_health_archive_records(archived);
  if (result->'restored'->>'health_observations')::int<>1 then raise exception 'missing observation not recovered'; end if;
  update public.health_observations set payload='{"kind":"hydration","amountMl":500,"drinkType":"water"}',revision=2 where id='4f2a0d85-a02d-4de0-8fdd-70f3aa961883';
  perform public.restore_health_archive_records(archived);
  if (select payload->>'amountMl' from public.health_observations where id='4f2a0d85-a02d-4de0-8fdd-70f3aa961883')<>'500' then raise exception 'current cloud value overwritten'; end if;
  insert into public.cases(id,user_id,title) values('8a0d781d-4a11-4291-93b3-cba1ed89b324',auth.uid(),'Synthetic archived case');
  select jsonb_build_object('userId',auth.uid(),'cases',jsonb_agg(to_jsonb(c))) into archived_case from public.cases c where c.id='8a0d781d-4a11-4291-93b3-cba1ed89b324';
  insert into public.case_tombstones(id,user_id,profile_id,deleted_at) values('8a0d781d-4a11-4291-93b3-cba1ed89b324',auth.uid(),'profile_1',now());
  delete from public.cases where id='8a0d781d-4a11-4291-93b3-cba1ed89b324';
  perform public.restore_health_archive_records(archived_case);
  if exists(select 1 from public.cases where id='8a0d781d-4a11-4291-93b3-cba1ed89b324') then raise exception 'deleted case recreated'; end if;
  begin
    perform public.restore_health_archive_records(archived || '{"user_health_metrics":[{"id":"7fb39c98-d79b-415e-b2a5-58fe89306827","user_id":"dd2bce9e-b7f0-47a7-b4e4-fd93fa718807"}]}');
    raise exception 'foreign archived row accepted';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"dd2bce9e-b7f0-47a7-b4e4-fd93fa718807","role":"authenticated"}',true);
do $$ begin
  if exists(select 1 from public.healthchain_profiles where user_id='311a0a3f-d4f9-4014-9152-7a7f9b098807') then raise exception 'profile isolation failed'; end if;
  begin
    perform public.restore_health_archive_records('{"userId":"311a0a3f-d4f9-4014-9152-7a7f9b098807"}');
    raise exception 'foreign archive accepted';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
  if has_function_privilege('anon','public.sync_health_profile_snapshot(text,jsonb,timestamptz,jsonb)','execute')
    or has_function_privilege('anon','public.restore_health_archive_records(jsonb)','execute') then raise exception 'anonymous recovery access'; end if;
end $$;
rollback;

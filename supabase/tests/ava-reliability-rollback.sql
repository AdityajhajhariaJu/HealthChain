-- Synthetic integration verification. This transaction MUST remain rolled back.
begin;
insert into auth.users(id,email) values
 ('86170547-2a12-4304-ab36-cec11b540aee','ava-verify-a@example.invalid'),
 ('ff5d12c9-c608-4d04-ab91-1347b0f2be30','ava-verify-b@example.invalid');
insert into public.fitness_content(id,type,title,is_active,is_premium,duration_minutes,difficulty)
values('3c312d93-865f-4b49-894c-9a6c08dd0c36','workout','Synthetic Ava integration verification',true,false,1,'Beginner');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"86170547-2a12-4304-ab36-cec11b540aee","role":"authenticated"}',true);
do $$
declare result jsonb;counter integer;
begin
 result:=public.start_fitness_session('3c312d93-865f-4b49-894c-9a6c08dd0c36','55a3b1d7-b6a2-4c3d-b309-ef34c198bb31','86170547-2a12-4304-ab36-cec11b540aee');
 if result->>'session_id'<>'55a3b1d7-b6a2-4c3d-b309-ef34c198bb31' then raise exception 'Start identity mismatch';end if;
 perform public.start_fitness_session('3c312d93-865f-4b49-894c-9a6c08dd0c36','55a3b1d7-b6a2-4c3d-b309-ef34c198bb31','86170547-2a12-4304-ab36-cec11b540aee');
 select started_count into counter from public.fitness_content where id='3c312d93-865f-4b49-894c-9a6c08dd0c36';
 if counter<>1 then raise exception 'Repeated start counted more than once';end if;
 begin
  perform public.complete_fitness_session('55a3b1d7-b6a2-4c3d-b309-ef34c198bb31',600,null);
  raise exception 'Invented duration was accepted';
 exception when sqlstate '22023' then null;end;
 perform public.complete_fitness_session('55a3b1d7-b6a2-4c3d-b309-ef34c198bb31',1,null);
 result:=public.complete_fitness_session('55a3b1d7-b6a2-4c3d-b309-ef34c198bb31',1,null);
 if result->>'already_completed'<>'true' then raise exception 'Completion retry was not idempotent';end if;
 select completed_count into counter from public.fitness_content where id='3c312d93-865f-4b49-894c-9a6c08dd0c36';
 if counter<>1 then raise exception 'Repeated completion counted more than once';end if;
 insert into public.ava_messages(id,user_id,role,content)
 values('cdb1d6cf-1a52-4d9b-8dc3-10c0c37f02ee','86170547-2a12-4304-ab36-cec11b540aee','model','Synthetic verification reply');
 begin
  update public.ava_messages set content='Changed immutable reply' where id='cdb1d6cf-1a52-4d9b-8dc3-10c0c37f02ee';
  raise exception 'Original message was mutable';
 exception when sqlstate '22023' then null;end;
end $$;
select set_config('request.jwt.claims','{"sub":"ff5d12c9-c608-4d04-ab91-1347b0f2be30","role":"authenticated"}',true);
do $$
begin
 if exists(select 1 from public.ava_messages where id='cdb1d6cf-1a52-4d9b-8dc3-10c0c37f02ee') then raise exception 'Another owner could read the reply';end if;
 begin
  perform public.complete_fitness_session('55a3b1d7-b6a2-4c3d-b309-ef34c198bb31',1,null);
  raise exception 'Another owner could complete the session';
 exception when insufficient_privilege then null;end;
 begin
  perform public.start_fitness_session('3c312d93-865f-4b49-894c-9a6c08dd0c36','55a3b1d7-b6a2-4c3d-b309-ef34c198bb31','86170547-2a12-4304-ab36-cec11b540aee');
  raise exception 'Delayed owner A request was accepted as owner B';
 exception when insufficient_privilege then null;end;
 begin
  perform public.complete_workout_session('86170547-2a12-4304-ab36-cec11b540aee','3c312d93-865f-4b49-894c-9a6c08dd0c36',1,0);
  raise exception 'Legacy completion accepted another owner';
 exception when insufficient_privilege then null;end;
 begin
  insert into public.ava_messages(id,user_id,role,content) values('4638f539-d374-47e0-955b-a10df9299fb5','86170547-2a12-4304-ab36-cec11b540aee','user','Foreign-owner synthetic attempt');
  raise exception 'Another owner could insert the reply';
 exception when insufficient_privilege then null;end;
end $$;
rollback;

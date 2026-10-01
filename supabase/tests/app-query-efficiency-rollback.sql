-- Synthetic rows only; owner access and foreign denials under the optimized policies.
begin;
set local statement_timeout='10s';
insert into auth.users(id,email) values
 ('1a7d5504-f378-4624-9b8d-c5d3df61df41','query-efficiency-a@example.invalid'),
 ('59c3b07c-73e4-4ed7-b219-1d9c1187e99f','query-efficiency-b@example.invalid');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"1a7d5504-f378-4624-9b8d-c5d3df61df41","role":"authenticated"}',true);
insert into public.cases(id,user_id,title) values
 ('b51c3a98-023b-4b7e-9f85-6d687ce02143','1a7d5504-f378-4624-9b8d-c5d3df61df41','Synthetic query-efficiency case');
insert into public.case_events(case_id,type,label) values
 ('b51c3a98-023b-4b7e-9f85-6d687ce02143','note','Synthetic event');
do $$ begin
  if (select count(*) from public.case_events where case_id='b51c3a98-023b-4b7e-9f85-6d687ce02143') <> 1 then raise exception 'Owner event read failed'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"59c3b07c-73e4-4ed7-b219-1d9c1187e99f","role":"authenticated"}',true);
do $$ begin
  if exists(select 1 from public.case_events where case_id='b51c3a98-023b-4b7e-9f85-6d687ce02143') then raise exception 'Foreign event visible'; end if;
  begin
    insert into public.case_events(case_id,type,label) values ('b51c3a98-023b-4b7e-9f85-6d687ce02143','note','Synthetic event');
    raise exception 'Foreign event insert accepted';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;

-- Only synthetic records; every write is rolled back.
begin;
insert into auth.users(id,email) values
  ('9217b42c-5f91-43f3-9b4c-09eb98e1a8b6','whole-app-a@example.invalid'),
  ('f0d4696a-4ce5-40c1-9f1d-573796a9cc83','whole-app-b@example.invalid');
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
insert into public.user_feedback(id,user_id,message) values ('bb91ad87-5ff5-4596-890a-e64c61e371e7',null,'Synthetic guest feedback');
do $$ begin
  begin
    insert into public.user_feedback(user_id,message) values ('9217b42c-5f91-43f3-9b4c-09eb98e1a8b6','Synthetic forged guest');
    raise exception 'Guest attributed feedback to another owner';
  exception when insufficient_privilege then null; end;
end $$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"9217b42c-5f91-43f3-9b4c-09eb98e1a8b6","role":"authenticated"}',true);
insert into public.user_feedback(id,user_id,message) values ('5d9198fd-4293-4390-9999-9f5b98f4d9a3','9217b42c-5f91-43f3-9b4c-09eb98e1a8b6','Synthetic owned feedback');
do $$ begin
  if not exists(select 1 from public.user_feedback where id='5d9198fd-4293-4390-9999-9f5b98f4d9a3') then raise exception 'Owner cannot read feedback'; end if;
  if exists(select 1 from public.user_feedback where id='bb91ad87-5ff5-4596-890a-e64c61e371e7') then raise exception 'Owner read guest feedback'; end if;
  begin
    insert into public.user_feedback(user_id,message) values ('f0d4696a-4ce5-40c1-9f1d-573796a9cc83','Synthetic forged owner');
    raise exception 'Owner attributed feedback to another owner';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"f0d4696a-4ce5-40c1-9f1d-573796a9cc83","role":"authenticated"}',true);
do $$ begin
  if exists(select 1 from public.user_feedback where id='5d9198fd-4293-4390-9999-9f5b98f4d9a3') then raise exception 'Other account read feedback'; end if;
end $$;
rollback;

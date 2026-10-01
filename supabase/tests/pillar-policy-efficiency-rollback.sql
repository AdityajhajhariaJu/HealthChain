-- Run against a deployed project through the SQL editor. No synthetic rows persist.
begin;
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at) values
('7efbeec9-8f23-4b11-86ac-cb01a44e8596','00000000-0000-0000-0000-000000000000','authenticated','authenticated','policy-synthetic-a@example.invalid','',now(),now(),now()),
('fbf67664-b2c2-4d59-bce4-51880a0c95d0','00000000-0000-0000-0000-000000000000','authenticated','authenticated','policy-synthetic-b@example.invalid','',now(),now(),now());
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"7efbeec9-8f23-4b11-86ac-cb01a44e8596","role":"authenticated"}',true);
insert into public.cases(id,user_id,title) values ('1b8111c2-a4d4-4fa9-bda2-aeb5786a0d1e','7efbeec9-8f23-4b11-86ac-cb01a44e8596','Synthetic policy case');
do $$
begin
  if (select count(*) from public.cases where id='1b8111c2-a4d4-4fa9-bda2-aeb5786a0d1e') <> 1 then
    raise exception 'Owner case read failed';
  end if;
  begin
    insert into public.cases(user_id,title) values ('fbf67664-b2c2-4d59-bce4-51880a0c95d0','wrong owner');
    raise exception 'Foreign case insert accepted';
  exception when others then
    if sqlerrm <> 'Unauthorized case write' then raise; end if;
  end;
end $$;
select set_config('request.jwt.claims','{"sub":"fbf67664-b2c2-4d59-bce4-51880a0c95d0","role":"authenticated"}',true);
do $$
begin
  if exists(select 1 from public.cases where id='1b8111c2-a4d4-4fa9-bda2-aeb5786a0d1e') then
    raise exception 'Foreign case visible';
  end if;
  if exists(select 1 from public.profiles where id='7efbeec9-8f23-4b11-86ac-cb01a44e8596') then
    raise exception 'Foreign profile visible';
  end if;
end $$;
reset role;
rollback;

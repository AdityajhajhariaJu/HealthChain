-- Synthetic owners only. Every inserted record is rolled back.
begin;
do $test$
declare
  owner_a uuid := gen_random_uuid();
  owner_b uuid := gen_random_uuid();
  case_id text := gen_random_uuid()::text;
  blocked boolean;
  count_rows integer;
begin
  insert into auth.users(id,email,raw_user_meta_data,raw_app_meta_data)
    values(owner_a,'launch-security-' || owner_a || '@example.invalid','{}','{}'),
      (owner_b,'launch-security-' || owner_b || '@example.invalid','{}','{}');
  insert into public.profiles(id) values(owner_a),(owner_b) on conflict(id) do nothing;
  insert into public.cases(id,user_id,title,status,specialty,revision,data)
    values(case_id::uuid,owner_a,'Synthetic launch-security case','active','general',1,'{}');
  perform set_config('request.jwt.claims', jsonb_build_object('role','authenticated')::text, true);
  blocked := false;
  begin
    perform public.delete_case_with_tombstone(owner_a,case_id,'profile_1',now());
  exception when insufficient_privilege then blocked := true;
  end;
  if not blocked then raise exception 'Missing owner claim accepted'; end if;
  perform set_config('request.jwt.claims', jsonb_build_object('role','authenticated','sub',owner_a)::text, true);
  blocked := false;
  begin
    perform public.delete_case_with_tombstone(owner_b,case_id,'profile_1',now());
  exception when insufficient_privilege then blocked := true;
  end;
  if not blocked then raise exception 'Cross-account deletion accepted'; end if;
  if not public.delete_case_with_tombstone(owner_a,case_id,'profile_1',now()) then
    raise exception 'Owner deletion failed';
  end if;
  if exists(select 1 from public.cases where id=case_id::uuid) then
    raise exception 'Owner case was not deleted';
  end if;
  perform set_config('request.jwt.claims', jsonb_build_object('role','service_role')::text, true);
  if not public.delete_case_with_tombstone(owner_b,case_id,'profile_1',now()) then
    raise exception 'Service deletion failed';
  end if;
  select count(*) into count_rows from public.case_tombstones
    where id=case_id and user_id in (owner_a,owner_b);
  if count_rows <> 2 then raise exception 'Synthetic tombstone writes did not match owners'; end if;
  if has_function_privilege('anon','public.delete_case_with_tombstone(uuid,text,text,timestamp with time zone)','execute') then
    raise exception 'Anonymous deletion RPC access remains';
  end if;
  if (1-('[1,0]'::extensions.vector operator(extensions.<=>) '[1,0]'::extensions.vector)) <> 1 then
    raise exception 'Vector operator unavailable';
  end if;
  -- Zero limit validates the relocated matcher without reading stored embeddings.
  perform * from public.match_documents('[1,0]'::extensions.vector,2,0);
end $test$;
rollback;

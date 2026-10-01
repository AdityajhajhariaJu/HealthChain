-- Synthetic ownership/link test. MUST remain a rolled-back transaction.
begin;
insert into auth.users(id,email) values
  ('d7709d5d-7d69-48cf-8ec6-39bc6e9178ca','pillar-links-a@example.invalid'),
  ('f8cabaf0-7628-4a1b-9153-e7982408be7a','pillar-links-b@example.invalid');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"d7709d5d-7d69-48cf-8ec6-39bc6e9178ca","role":"authenticated"}',true);
insert into public.health_observations
  (id,user_id,profile_id,kind,local_date,time_precision,recorded_at,source,evidence_type,payload,revision,idempotency_key,record_references)
values
  ('64ca24a5-f745-44d5-82db-631084971d62','d7709d5d-7d69-48cf-8ec6-39bc6e9178ca','profile_1','daily_checkin','2026-10-01','date_only',now(),'diet','user_report',
   '{"kind":"daily_checkin","localDate":"2026-10-01","answers":{"bloating":"yes"}}',1,'synthetic-linked-reaction',
   '[{"ownerId":"d7709d5d-7d69-48cf-8ec6-39bc6e9178ca","profileId":"profile_1","kind":"observation","id":"synthetic-meal"},{"ownerId":"d7709d5d-7d69-48cf-8ec6-39bc6e9178ca","profileId":"profile_1","kind":"case","id":"synthetic-case"}]');
do $$
begin
  if (select jsonb_array_length(record_references) from public.health_observations where id='64ca24a5-f745-44d5-82db-631084971d62')<>2 then raise exception 'Links lost after insert'; end if;
  begin
    update public.health_observations set record_references='[{"ownerId":"f8cabaf0-7628-4a1b-9153-e7982408be7a","profileId":"profile_1","kind":"case","id":"foreign"}]'
      where id='64ca24a5-f745-44d5-82db-631084971d62';
    raise exception 'Foreign owner reference was accepted';
  exception when check_violation then null; end;
  begin
    update public.health_observations set record_references='{"invalid":"shape"}' where id='64ca24a5-f745-44d5-82db-631084971d62';
    raise exception 'Invalid reference container was accepted';
  exception when check_violation then null; end;
  if public.healthchain_observation_references_valid('[{"id":"x"}]','d7709d5d-7d69-48cf-8ec6-39bc6e9178ca','profile_1') then raise exception 'Incomplete reference was accepted'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"f8cabaf0-7628-4a1b-9153-e7982408be7a","role":"authenticated"}',true);
do $$
begin
  if exists(select 1 from public.health_observations where id='64ca24a5-f745-44d5-82db-631084971d62') then raise exception 'Other account read linked record'; end if;
  update public.health_observations set record_references='[]' where id='64ca24a5-f745-44d5-82db-631084971d62';
  if found then raise exception 'Other account cleared links'; end if;
end $$;
rollback;

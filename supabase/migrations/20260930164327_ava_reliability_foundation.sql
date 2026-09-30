-- Ava durability, request recovery and exact wellness session ownership.
alter table public.health_memory add column if not exists deleted_at timestamptz;
alter table public.ai_requests add column if not exists request_hash text;
alter table public.ai_requests add column if not exists result_json jsonb;
alter table public.ai_requests add column if not exists result_expires_at timestamptz;
alter table public.ai_requests add constraint ai_requests_result_size check (result_json is null or octet_length(result_json::text)<=500000);

create table public.ava_messages (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 profile_id text not null default 'profile_1' check(profile_id='profile_1'),
 case_id text,
 role text not null check(role in ('user','model')),
 content text not null check(length(btrim(content))>0 and length(content)<=60000),
 metadata jsonb not null default '{}'::jsonb check(jsonb_typeof(metadata)='object' and octet_length(metadata::text)<=100000),
 created_at timestamptz not null default now()
);
create index ava_messages_owner_date_idx on public.ava_messages(user_id,profile_id,created_at,id);
alter table public.ava_messages enable row level security;
revoke all on public.ava_messages from anon, public;
grant select, insert, update, delete on public.ava_messages to authenticated;
create policy ava_messages_owner on public.ava_messages for all to authenticated
 using(user_id=(select auth.uid()))
 with check(user_id=(select auth.uid()) and profile_id='profile_1' and (
   case_id is null or exists(select 1 from public.cases c where c.id::text=case_id and c.user_id=(select auth.uid()) and c.deleted_at is null)
 ));
-- Original answer and evidence snapshot are immutable. Merge receipts from concurrent devices.
create function public.preserve_ava_message() returns trigger language plpgsql set search_path='' as $$
begin
 if new.metadata ? 'receipts' and jsonb_typeof(new.metadata->'receipts')<>'object' then
  raise exception 'Invalid action receipts' using errcode='22023';
 end if;
 if new.user_id<>old.user_id or new.profile_id<>old.profile_id or new.case_id is distinct from old.case_id
   or new.role<>old.role or new.content<>old.content or new.created_at<>old.created_at then
   raise exception 'Ava message identity and content are immutable' using errcode='22023';
 end if;
 new.metadata:=old.metadata || jsonb_build_object('receipts',coalesce(old.metadata->'receipts','{}'::jsonb)||coalesce(new.metadata->'receipts','{}'::jsonb));
 return new;
end;
$$;
revoke all on function public.preserve_ava_message() from public,anon,authenticated;
create trigger ava_message_identity before update on public.ava_messages for each row execute function public.preserve_ava_message();

create or replace function public.start_fitness_session(p_content_id uuid,p_session_id uuid default gen_random_uuid(),p_expected_owner uuid default null)
 returns jsonb language plpgsql security definer set search_path='' as $$
declare v_owner uuid:=auth.uid();v_content public.fitness_content%rowtype;v_session public.user_fitness_history%rowtype;v_inserted uuid;
begin
 if v_owner is null or p_expected_owner is null or v_owner<>p_expected_owner then raise exception 'Session owner mismatch' using errcode='42501';end if;
 select * into v_content from public.fitness_content where id=p_content_id and is_active and (publish_at is null or publish_at<=now());
 if not found then raise exception 'Activity unavailable' using errcode='22023';end if;
 if v_content.is_premium and not exists(select 1 from public.profiles where id=v_owner and is_pro and pro_expires_at>now()) then
   raise exception 'This activity requires an active plan' using errcode='42501';
 end if;
 insert into public.user_fitness_history(id,user_id,content_id,content_type,started_at)
 values(p_session_id,v_owner,p_content_id,v_content.type,now()) on conflict(id) do nothing returning id into v_inserted;
 select * into v_session from public.user_fitness_history where id=p_session_id and user_id=v_owner and content_id=p_content_id;
 if not found then raise exception 'Session unavailable' using errcode='42501';end if;
 if v_inserted is not null then update public.fitness_content set started_count=coalesce(started_count,0)+1 where id=p_content_id;end if;
 return jsonb_build_object('session_id',v_session.id,'started_at',v_session.started_at,'completed',v_session.was_completed);
end;
$$;

create or replace function public.complete_fitness_session(p_session_id uuid,p_duration_seconds integer,p_calories integer default null)
 returns jsonb language plpgsql security definer set search_path='' as $$
declare v_owner uuid:=auth.uid();v_session public.user_fitness_history%rowtype;v_total integer;v_badges text[]:='{}';v_slug text;
begin
 if v_owner is null then raise exception 'Sign in required' using errcode='42501';end if;
 select * into v_session from public.user_fitness_history where id=p_session_id and user_id=v_owner for update;
 if not found then raise exception 'Session unavailable' using errcode='42501';end if;
 if v_session.was_completed then
  return jsonb_build_object('session_id',v_session.id,'completed',true,'already_completed',true,'duration_seconds',v_session.duration_seconds,'new_badges','[]'::jsonb);
 end if;
 if p_duration_seconds is null or p_duration_seconds<1 or p_duration_seconds>21600
   or p_duration_seconds>extract(epoch from now()-v_session.started_at)+5
   or (p_calories is not null and (p_calories<0 or p_calories>3000)) then
   raise exception 'Invalid participation duration or calories' using errcode='22023';
 end if;
 update public.user_fitness_history set completed_at=now(),was_completed=true,duration_seconds=p_duration_seconds,calories_burned=p_calories where id=p_session_id;
 update public.fitness_content set completed_count=coalesce(completed_count,0)+1 where id=v_session.content_id;
 select count(*) into v_total from public.user_fitness_history where user_id=v_owner and was_completed;
 if v_total=1 then v_slug:='first_workout';elsif v_total=10 then v_slug:='10_workouts';end if;
 if v_slug is not null then
   insert into public.user_badges(user_id,badge_slug) values(v_owner,v_slug) on conflict do nothing;
   v_badges:=array_append(v_badges,v_slug);
 end if;
 return jsonb_build_object('session_id',v_session.id,'completed',true,'duration_seconds',p_duration_seconds,'new_badges',v_badges,'total_workouts',v_total);
end;
$$;

-- Compatibility for older clients: derive one exact owned pending session, never update all.
create or replace function public.complete_workout_session(p_user_id uuid,p_content_id uuid,p_duration_seconds integer,p_calories integer)
 returns jsonb language plpgsql security definer set search_path='' as $$
declare v_session uuid;v_count integer;
begin
 if auth.uid() is null or auth.uid()<>p_user_id then raise exception 'Session owner mismatch' using errcode='42501';end if;
 select count(*), (array_agg(id order by started_at desc))[1] into v_count,v_session
 from public.user_fitness_history where user_id=auth.uid() and content_id=p_content_id and completed_at is null;
 if v_count>1 then raise exception 'Multiple pending sessions; select the exact session' using errcode='22023';end if;
 if v_count=0 then
   select id into v_session from public.user_fitness_history where user_id=auth.uid() and content_id=p_content_id and was_completed order by completed_at desc limit 1;
   if v_session is null then raise exception 'No started session' using errcode='22023';end if;
 end if;
 return public.complete_fitness_session(v_session,p_duration_seconds,p_calories);
end;
$$;
revoke all on function public.start_fitness_session(uuid,uuid,uuid) from public,anon;
revoke all on function public.complete_fitness_session(uuid,integer,integer) from public,anon;
revoke all on function public.complete_workout_session(uuid,uuid,integer,integer) from public,anon;
grant execute on function public.start_fitness_session(uuid,uuid,uuid) to authenticated;
grant execute on function public.complete_fitness_session(uuid,integer,integer) to authenticated;
grant execute on function public.complete_workout_session(uuid,uuid,integer,integer) to authenticated;

-- Recovery window is 24 hours; the existing authenticated daily cron purges expired content.
create index ai_requests_recovery_expiry_idx on public.ai_requests(result_expires_at) where result_json is not null;
create index ai_requests_interrupted_idx on public.ai_requests(started_at) where status='in_progress';

-- Batch recovery avoids a separate network round trip for every reserved request.
create function public.recover_interrupted_ai_requests(p_limit integer default 1000)
 returns jsonb language plpgsql security definer set search_path='' as $$
declare v_request record;v_recovered integer:=0;v_failed integer:=0;v_purged integer:=0;
begin
 update public.ai_requests set status='failed',error_code='request_interrupted',finished_at=now()
 where status='in_progress' and started_at<now()-interval '10 minutes';
 for v_request in select request_id,user_id from public.ai_requests
  where status='failed' and feature_quota_consumed and not feature_quota_released
  order by started_at limit least(greatest(coalesce(p_limit,1000),1),5000) for update skip locked
 loop
  begin
   if public.release_feature_quota_for_request(v_request.user_id,v_request.request_id) then v_recovered:=v_recovered+1;
   else v_failed:=v_failed+1;end if;
  exception when others then v_failed:=v_failed+1;
  end;
 end loop;
 update public.ai_requests set result_json=null where result_json is not null and result_expires_at<=now();
 get diagnostics v_purged=row_count;
 return jsonb_build_object('recovered',v_recovered,'failed',v_failed,'purged',v_purged);
end;
$$;
revoke all on function public.recover_interrupted_ai_requests(integer) from public,anon,authenticated;
grant execute on function public.recover_interrupted_ai_requests(integer) to service_role;

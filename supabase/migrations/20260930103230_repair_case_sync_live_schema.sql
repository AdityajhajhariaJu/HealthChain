-- Repair case sync against the deployed UUID ID and specialty column.
-- Keep the existing authenticated owner check and RPC signature.
create or replace function public.sync_case_with_revision_check(
  p_user_id uuid, p_case_id text, p_expected_revision bigint, p_payload jsonb
) returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_case_id uuid;
  v_curr_rev bigint;
  v_curr_deleted_at timestamptz;
  v_curr_data jsonb;
  v_next_rev bigint;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Unauthorized case sync operation';
  end if;
  v_case_id := p_case_id::uuid;
  -- Serialize the first insert too, when there is no row to lock yet.
  perform pg_advisory_xact_lock(hashtextextended(p_case_id, 0));
  if exists (select 1 from public.cases where id = v_case_id and user_id <> p_user_id) then
    raise exception 'Case identifier belongs to another account';
  end if;
  if exists (select 1 from public.case_tombstones where id = p_case_id and user_id = p_user_id) then
    return jsonb_build_object('success', false, 'conflict', true, 'deleted', true);
  end if;
  select revision, deleted_at, data into v_curr_rev, v_curr_deleted_at, v_curr_data
    from public.cases where id = v_case_id and user_id = p_user_id for update;
  if v_curr_deleted_at is not null then
    return jsonb_build_object('success', false, 'conflict', true, 'deleted', true, 'deleted_at', v_curr_deleted_at);
  end if;
  if v_curr_rev is not null and p_expected_revision is not null and v_curr_rev <> p_expected_revision then
    return jsonb_build_object('success', false, 'conflict', true, 'deleted', false,
      'current_revision', v_curr_rev, 'current_data', v_curr_data);
  end if;
  v_next_rev := coalesce(v_curr_rev, 0) + 1;
  if p_payload ? 'revision' then
    v_next_rev := greatest(v_next_rev, (p_payload->>'revision')::bigint);
  end if;
  insert into public.cases (id, user_id, title, status, specialty, revision, data, updated_at, created_at)
  values (v_case_id, p_user_id, coalesce(p_payload->>'title', 'Untitled health case'),
    coalesce(p_payload->>'status', 'active'), coalesce(p_payload->>'specialty', 'general'),
    v_next_rev, p_payload->'data', now(), coalesce((p_payload->>'created_at')::timestamptz, now()))
  on conflict (id) do update set title = excluded.title, status = excluded.status,
    specialty = excluded.specialty, revision = v_next_rev, data = excluded.data, updated_at = now()
    where public.cases.user_id = p_user_id;
  return jsonb_build_object('success', true, 'conflict', false, 'new_revision', v_next_rev);
end;
$$;
-- CREATE OR REPLACE preserves the existing restricted execute grants.
notify pgrst, 'reload schema';

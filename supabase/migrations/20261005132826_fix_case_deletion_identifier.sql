-- Applied version matches the Supabase migration ledger.
-- Cast the API's text identifier to the cases table's UUID identifier.
-- Retain intentional owner-authorized RPCs and reject missing owner claims.
create or replace function public.delete_case_with_tombstone(
  p_user_id uuid, p_case_id text, p_profile_id text, p_deleted_at timestamptz
)
returns boolean language plpgsql security definer set search_path = '' as $body$
begin
  if auth.role() is distinct from 'service_role'
    and (auth.uid() is null or auth.uid() is distinct from p_user_id) then
    raise exception 'Unauthorized case deletion operation' using errcode = '42501';
  end if;
  insert into public.case_tombstones (id, user_id, profile_id, deleted_at, created_at)
  values (p_case_id, p_user_id, coalesce(p_profile_id, 'profile_1'), coalesce(p_deleted_at, now()), now())
  on conflict (user_id, profile_id, id) do update
    set deleted_at = greatest(case_tombstones.deleted_at, excluded.deleted_at);
  delete from public.cases where id = p_case_id::uuid and user_id = p_user_id;
  return true;
end $body$;
revoke all on function public.delete_case_with_tombstone(uuid, text, text, timestamptz) from public, anon;
grant execute on function public.delete_case_with_tombstone(uuid, text, text, timestamptz) to authenticated, service_role;

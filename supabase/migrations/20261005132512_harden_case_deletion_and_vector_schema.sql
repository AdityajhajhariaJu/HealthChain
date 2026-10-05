-- Applied version matches the Supabase migration ledger.
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
  delete from public.cases where id = p_case_id and user_id = p_user_id;
  return true;
end $body$;
revoke all on function public.delete_case_with_tombstone(uuid, text, text, timestamptz) from public, anon;
grant execute on function public.delete_case_with_tombstone(uuid, text, text, timestamptz) to authenticated, service_role;

-- Keep vector's types/operators out of the API schema; preserve the existing matcher.
create schema if not exists extensions;
do $migration$
begin
  if exists (select 1 from pg_extension e join pg_namespace n on n.oid=e.extnamespace
    where e.extname='vector' and n.nspname='public') then
    alter extension vector set schema extensions;
  end if;
  if to_regprocedure('public.match_documents(extensions.vector,double precision,integer)') is not null then
    execute $definition$
      create or replace function public.match_documents(query_embedding extensions.vector, match_threshold double precision, match_count integer)
      returns table(id uuid, source_file text, chunk_content text, similarity double precision)
      language plpgsql security invoker set search_path = '' as $matcher$
      begin
        return query select d.id, d.source_file, d.chunk_content,
          1 - (d.embedding operator(extensions.<=>) query_embedding) as similarity
        from public.document_embeddings d
        where 1 - (d.embedding operator(extensions.<=>) query_embedding) > match_threshold
        order by d.embedding operator(extensions.<=>) query_embedding limit match_count;
      end $matcher$;
    $definition$;
  end if;
end $migration$;

-- Existing document chunks are private server data, including their text.
-- Some installations do not include the optional document search schema.
do $$
begin
  if to_regclass('public.document_embeddings') is not null then
    execute 'alter table public.document_embeddings enable row level security';
    execute 'revoke all on table public.document_embeddings from public, anon, authenticated';
    execute 'grant all on table public.document_embeddings to service_role';
  end if;
end $$;

-- Payment and quota mutations are performed by verified server routes only.
revoke all on function public.activate_and_provision_subscription(uuid, text, text, integer, text, timestamptz)
  from public, anon, authenticated;
revoke all on function public.activate_and_provision_topup(uuid, text, text, integer, text, integer)
  from public, anon, authenticated;
grant execute on function public.activate_and_provision_subscription(uuid, text, text, integer, text, timestamptz)
  to service_role;
grant execute on function public.activate_and_provision_topup(uuid, text, text, integer, text, integer)
  to service_role;

-- These optional trigger helpers and the legacy usage mutation are not browser RPCs.
do $$
begin
  if to_regprocedure('public.handle_new_user()') is not null then
    execute 'revoke all on function public.handle_new_user() from public, anon, authenticated';
  end if;
  if to_regprocedure('public.prevent_ai_quota_tampering()') is not null then
    execute 'revoke all on function public.prevent_ai_quota_tampering() from public, anon, authenticated';
  end if;
  if to_regprocedure('public.prevent_pro_status_tampering()') is not null then
    execute 'revoke all on function public.prevent_pro_status_tampering() from public, anon, authenticated';
  end if;
  if to_regprocedure('public.increment_ai_usage(uuid, integer)') is not null then
    execute 'revoke all on function public.increment_ai_usage(uuid, integer) from public, anon, authenticated';
  end if;
end $$;

alter function public.provision_topup(uuid, text, integer) set search_path = public;

-- Production hardening for ownership, deletion, and quota RPC boundaries.
-- Safe to apply after all 20260911 migrations.

create or replace function public.enforce_case_write_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and old.user_id <> new.user_id then
    raise exception 'Case ownership cannot be changed';
  end if;

  if auth.uid() is not null and new.user_id <> auth.uid() then
    raise exception 'Unauthorized case write';
  end if;

  if exists (
    select 1
    from public.case_tombstones tombstone
    where tombstone.id = new.id
      and tombstone.user_id = new.user_id
  ) then
    raise exception 'Deleted case cannot be recreated';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_case_write_integrity_trigger on public.cases;
create trigger enforce_case_write_integrity_trigger
before insert or update on public.cases
for each row execute function public.enforce_case_write_integrity();

revoke all on function public.enforce_case_write_integrity() from public, anon, authenticated;

-- These functions are invoked by trusted server code with the service role.
-- Browser clients must never grant credits or consume another account's quota.
revoke all on function public.provision_topup(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.provision_topup(uuid, text, integer) to service_role;

revoke all on function public.consume_feature_quota(uuid, text) from public, anon, authenticated;
grant execute on function public.consume_feature_quota(uuid, text) to service_role;

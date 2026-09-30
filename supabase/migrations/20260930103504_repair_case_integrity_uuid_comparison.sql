-- Match the text tombstone key to the UUID case key without changing protections.
create or replace function public.enforce_case_write_integrity()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and old.user_id <> new.user_id then
    raise exception 'Case ownership cannot be changed';
  end if;
  if auth.uid() is not null and new.user_id <> auth.uid() then
    raise exception 'Unauthorized case write';
  end if;
  if exists (select 1 from public.case_tombstones tombstone
    where tombstone.id = new.id::text and tombstone.user_id = new.user_id) then
    raise exception 'Deleted case cannot be recreated';
  end if;
  return new;
end;
$$;

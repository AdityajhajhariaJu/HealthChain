-- Prevent authenticated clients from manually elevating their privileges
-- by updating the is_pro and pro_expires_at columns via the public API.
create or replace function public.protect_entitlement_columns()
returns trigger
language plpgsql
as $body
begin
  -- If the update is coming from the client (authenticated user)
  if auth.role() = 'authenticated' then
    -- Force the entitlement columns to remain unchanged
    new.is_pro = old.is_pro;
    new.pro_expires_at = old.pro_expires_at;
  end if;
  return new;
end;
$body;

drop trigger if exists protect_entitlement_columns_trigger on public.profiles;
create trigger protect_entitlement_columns_trigger
before update on public.profiles
for each row
execute function public.protect_entitlement_columns();

-- Entitlements are server-owned even when the profile row is client-editable.
-- Client profile deletion is not account deletion; use the authenticated API.
revoke delete, truncate, references, trigger on public.profiles from public, anon, authenticated;
revoke insert, update on public.profiles from anon;

create or replace function public.healthchain_guard_profile_entitlements()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      if coalesce(new.is_pro, false) or new.pro_expires_at is not null then
        raise exception 'Paid access is managed by the server' using errcode = '42501';
      end if;
      new.is_pro := false;
      new.pro_expires_at := null;
      new.ai_token_usage := 0;
      new.ai_usage_reset_date := now() + interval '30 days';
    else
      new.is_pro := old.is_pro;
      new.pro_expires_at := old.pro_expires_at;
      new.ai_token_usage := greatest(coalesce(old.ai_token_usage, 0), coalesce(new.ai_token_usage, 0));
      new.ai_usage_reset_date := old.ai_usage_reset_date;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.healthchain_guard_profile_entitlements() from public, anon, authenticated;
drop trigger if exists healthchain_profile_entitlements on public.profiles;
create trigger healthchain_profile_entitlements before insert or update on public.profiles
for each row execute function public.healthchain_guard_profile_entitlements();

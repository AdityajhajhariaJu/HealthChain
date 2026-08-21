create table if not exists public.ai_usage_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  request_count integer not null default 0,
  total_tokens bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);

alter table public.ai_usage_daily enable row level security;
-- No client policies. Usage is read/written by the server service role only.

create or replace function public.consume_ai_request(p_user_id uuid, p_daily_limit integer default 120)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
begin
  insert into public.ai_usage_daily (user_id, usage_date, request_count)
  values (p_user_id, current_date, 1)
  on conflict (user_id, usage_date)
  do update set request_count = ai_usage_daily.request_count + 1, updated_at = now()
  returning request_count into current_count;

  if current_count > p_daily_limit then
    update public.ai_usage_daily
      set request_count = request_count - 1, updated_at = now()
      where user_id = p_user_id and usage_date = current_date;
    return false;
  end if;
  return true;
end;
$$;

create or replace function public.record_ai_tokens(p_user_id uuid, p_total_tokens integer default 0)
returns void
language sql
security definer
set search_path = public
as $$
  update public.ai_usage_daily
    set total_tokens = total_tokens + greatest(coalesce(p_total_tokens, 0), 0), updated_at = now()
    where user_id = p_user_id and usage_date = current_date;
$$;

revoke all on function public.consume_ai_request(uuid, integer) from public, anon, authenticated;
revoke all on function public.record_ai_tokens(uuid, integer) from public, anon, authenticated;
grant execute on function public.consume_ai_request(uuid, integer) to service_role;
grant execute on function public.record_ai_tokens(uuid, integer) to service_role;

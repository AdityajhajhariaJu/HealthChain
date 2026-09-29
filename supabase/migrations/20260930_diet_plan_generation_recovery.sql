-- A validated generated plan must be recoverable after a lost HTTP response or
-- local save failure. This sensitive payload is server-only and account-owned.
create table if not exists public.diet_plan_generations (
  request_id text primary key references public.ai_requests(request_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  plan jsonb not null check (jsonb_typeof(plan) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists diet_plan_generations_user_created_idx
  on public.diet_plan_generations (user_id, created_at desc);

alter table public.diet_plan_generations enable row level security;
revoke all on table public.diet_plan_generations from anon, authenticated;
grant all on table public.diet_plan_generations to service_role;

-- Tables used by the production API and the client analytics helper.

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  event_params jsonb not null default '{}'::jsonb,
  user_id uuid null references auth.users(id) on delete set null,
  platform text not null default 'web',
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_user_created_idx
  on public.analytics_events (user_id, created_at desc);

alter table public.analytics_events enable row level security;
drop policy if exists "Users can record own analytics" on public.analytics_events;
create policy "Users can record own analytics" on public.analytics_events
  for insert to anon, authenticated
  with check (user_id is null or auth.uid() = user_id);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  razorpay_order_id text not null,
  razorpay_payment_id text not null,
  amount integer not null check (amount > 0),
  status text not null check (status in ('paid', 'refunded', 'failed')),
  entitlement_expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.payments enable row level security;
-- Payment rows are server-only; the service role is used by the API.
comment on table public.payments is
  'Server-only payment and entitlement ledger. No browser client policies.';

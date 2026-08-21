-- Server-side AI request ledger. It stores operational metadata only,
-- never prompts, records, or generated medical content.
create table if not exists public.ai_requests (
  request_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  operation text not null default 'gemini',
  status text not null check (status in ('in_progress', 'completed', 'failed')),
  input_tokens integer,
  output_tokens integer,
  total_tokens integer,
  error_code text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists ai_requests_user_started_idx
  on public.ai_requests (user_id, started_at desc);

alter table public.ai_requests enable row level security;
-- No client policies: this is written by the server-side service role only.


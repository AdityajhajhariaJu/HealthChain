-- Scalable operator-facing views. Unlike the legacy combined view, these
-- return bounded rows that can be paginated in the Supabase dashboard/API.
create index if not exists cases_user_updated_idx
  on public.cases (user_id, updated_at desc);

create or replace view public.healthchain_user_summary with (security_invoker = true) as
select
  p.id as user_id,
  p.full_name,
  p.updated_at as profile_updated_at,
  (select count(*) from public.cases c where c.user_id = p.id) as case_count,
  (select count(*) from public.health_memory m where m.user_id = p.id) as memory_count,
  (select max(m.occurred_at) from public.health_memory m where m.user_id = p.id) as last_memory_at
from public.profiles p;

create or replace view public.healthchain_case_overview with (security_invoker = true) as
select
  c.user_id,
  c.id as case_id,
  c.title,
  c.status,
  c.specialty,
  c.updated_at,
  c.data
from public.cases c;

create or replace view public.healthchain_memory_overview with (security_invoker = true) as
select
  m.user_id,
  m.profile_id,
  m.id as memory_id,
  m.case_id,
  m.kind,
  m.source,
  m.title,
  m.occurred_at,
  m.updated_at,
  m.payload
from public.health_memory m;

-- Explicitly document that the AI ledger is server-only. The service role
-- bypasses RLS; browser clients receive no rows from this table.
comment on table public.ai_requests is
  'Server-only AI operational ledger. Contains no prompts or generated medical content.';

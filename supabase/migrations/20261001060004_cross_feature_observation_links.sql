-- Preserve explicit links when observations travel between Diet, Gut and Ava.
-- These links are user-reported references, not proof of a causal relationship.
alter table public.health_observations
  add column if not exists record_references jsonb not null default '[]'::jsonb;

create or replace function public.healthchain_observation_references_valid(refs jsonb, owner_id uuid, profile text)
returns boolean language plpgsql immutable security invoker set search_path = '' as $$
begin
  if refs is null or pg_catalog.jsonb_typeof(refs) <> 'array' then return false; end if;
  if pg_catalog.jsonb_array_length(refs) > 32 then return false; end if;
  return not exists (
    select 1 from pg_catalog.jsonb_array_elements(refs) as item(value)
    where pg_catalog.jsonb_typeof(value) <> 'object'
      or coalesce(value->>'ownerId', '') <> owner_id::text
      or coalesce(value->>'profileId', '') <> profile
      or coalesce(value->>'kind', '') not in ('observation', 'case', 'trial')
      or pg_catalog.jsonb_typeof(value->'id') is distinct from 'string'
      or pg_catalog.length(pg_catalog.btrim(coalesce(value->>'id', ''))) not between 1 and 200
  );
end;
$$;
revoke all on function public.healthchain_observation_references_valid(jsonb, uuid, text) from public, anon;
grant execute on function public.healthchain_observation_references_valid(jsonb, uuid, text) to authenticated, service_role;

alter table public.health_observations drop constraint if exists health_observations_references_check;
alter table public.health_observations add constraint health_observations_references_check
  check (public.healthchain_observation_references_valid(record_references, user_id, profile_id));

comment on column public.health_observations.record_references is
  'Explicit same-owner/profile links. Consumers resolve targets within owned records; links are not causal findings.';

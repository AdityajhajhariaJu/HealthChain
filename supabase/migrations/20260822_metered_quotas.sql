create table if not exists public.user_quotas (
  user_id uuid not null references auth.users(id) on delete cascade,
  feature_name text not null,
  allocated integer not null default 0,
  used integer not null default 0,
  expires_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, feature_name)
);

alter table public.user_quotas enable row level security;
drop policy if exists "Users can read own quotas" on public.user_quotas;
create policy "Users can read own quotas" on public.user_quotas 
  for select to authenticated 
  using (auth.uid() = user_id);

-- Grants
revoke all on table public.user_quotas from anon, authenticated;
grant select on table public.user_quotas to authenticated;
grant all on table public.user_quotas to service_role;

-- Function to provision base subscription quotas
create or replace function public.provision_base_quota(
  p_user_id uuid,
  p_plan_id text,
  p_expires_at timestamptz
) returns void
language plpgsql security definer
as $$
begin
  -- Wipe existing quotas so top-ups from an old subscription don't roll over
  delete from public.user_quotas where user_id = p_user_id;

  if p_plan_id = 'pro_30_days' then
    insert into public.user_quotas (user_id, feature_name, allocated, expires_at) values
      (p_user_id, 'ava_replies', 30, p_expires_at),
      (p_user_id, 'quick_consult', 3, p_expires_at),
      (p_user_id, 'deep_collab', 2, p_expires_at),
      (p_user_id, 'jarvis', 1, p_expires_at),
      (p_user_id, 'pharmacy_hub', 60, p_expires_at),
      (p_user_id, 'lab_report', 10, p_expires_at);
  elsif p_plan_id = 'pro_90_days' then
    insert into public.user_quotas (user_id, feature_name, allocated, expires_at) values
      (p_user_id, 'ava_replies', 120, p_expires_at),
      (p_user_id, 'quick_consult', 10, p_expires_at),
      (p_user_id, 'deep_collab', 8, p_expires_at),
      (p_user_id, 'jarvis', 5, p_expires_at),
      (p_user_id, 'pharmacy_hub', 120, p_expires_at),
      (p_user_id, 'lab_report', 30, p_expires_at);
  end if;
end;
$$;

-- Function to provision micro-transaction top-ups
create or replace function public.provision_topup(
  p_user_id uuid,
  p_feature_name text,
  p_amount integer
) returns void
language plpgsql security definer
as $$
begin
  -- Top-ups apply to the current active row, meaning they expire when the base plan expires
  update public.user_quotas
  set allocated = allocated + p_amount, updated_at = now()
  where user_id = p_user_id and feature_name = p_feature_name;
end;
$$;

-- Function to atomically consume a feature token
create or replace function public.consume_feature_quota(
  p_user_id uuid,
  p_feature_name text
) returns jsonb
language plpgsql security definer
as $$
declare
  v_allocated integer;
  v_used integer;
  v_expires_at timestamptz;
begin
  -- Wipe expired quotas first
  delete from public.user_quotas where user_id = p_user_id and expires_at < now();

  -- Lock the row for atomic usage increment
  select allocated, used, expires_at into v_allocated, v_used, v_expires_at
  from public.user_quotas
  where user_id = p_user_id and feature_name = p_feature_name
  for update;

  if not found then
    -- Handle Free Tier fallback
    if p_feature_name = 'ava_replies' then
      v_allocated := 5;
    elsif p_feature_name = 'pharmacy_hub' then
      v_allocated := 5;
    else
      -- Feature not available on free tier
      return jsonb_build_object('allowed', false, 'reason', 'upgrade_required');
    end if;
    
    -- Insert the free tier row (no expiry)
    insert into public.user_quotas (user_id, feature_name, allocated, used)
    values (p_user_id, p_feature_name, v_allocated, 1)
    on conflict (user_id, feature_name) do nothing;

    return jsonb_build_object('allowed', true, 'remaining', v_allocated - 1);
  end if;

  if v_used >= v_allocated then
    return jsonb_build_object('allowed', false, 'reason', 'quota_exceeded');
  end if;

  update public.user_quotas
  set used = used + 1, updated_at = now()
  where user_id = p_user_id and feature_name = p_feature_name;

  return jsonb_build_object('allowed', true, 'remaining', v_allocated - v_used - 1);
end;
$$;

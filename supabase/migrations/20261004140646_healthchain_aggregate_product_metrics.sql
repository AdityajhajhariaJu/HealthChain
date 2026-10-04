-- Aggregate-only product measurement: no account, session, IP, prompt or record columns.
create schema if not exists healthchain_private;
revoke all on schema healthchain_private from public, anon, authenticated;
grant usage on schema healthchain_private to service_role;

create or replace function healthchain_private.valid_product_metric(p_event text, p_dimension text, p_platform text)
returns boolean language sql immutable security invoker set search_path = pg_catalog as $$
  select coalesce(p_platform in ('web','android','ios') and case p_event
    when 'page_view' then p_dimension in ('/','/pricing','/privacy','/terms','/terms-policies','/privacy-security','/delete-account','/acceptable-use','/app-license','/consumer-health-privacy','/login','/signup','/help','/review-demo','workspace')
    when 'feature_used' then p_dimension = 'workspace'
    when 'button_click' then p_dimension in ('get_started','feedback','workspace_action')
    when 'begin_checkout' then p_dimension = 'web_checkout'
    when 'purchase' then p_dimension = 'web_checkout'
    when 'onboarding' then p_dimension in ('started','completed')
    when 'audio_action' then p_dimension in ('playing','offline_playing','downloaded','download_failed','playback_failed')
    when 'ai_request' then p_dimension in ('started','completed','failed')
    when 'app_error' then p_dimension in ('screen','asset_load')
    else false end, false)
$$;
revoke all on function healthchain_private.valid_product_metric(text,text,text) from public, anon, authenticated;
grant execute on function healthchain_private.valid_product_metric(text,text,text) to service_role;

create table if not exists healthchain_private.product_metric_counts (
  day date not null,
  event text not null,
  dimension text not null,
  platform text not null,
  hits bigint not null default 1 check (hits > 0),
  primary key (day,event,dimension,platform),
  check (healthchain_private.valid_product_metric(event,dimension,platform))
);
alter table healthchain_private.product_metric_counts enable row level security;
revoke all on healthchain_private.product_metric_counts from public, anon, authenticated;
grant select, insert, update, delete on healthchain_private.product_metric_counts to service_role;

create or replace function public.healthchain_count_product_metric(p_event text,p_dimension text,p_platform text)
returns void language plpgsql security invoker set search_path = pg_catalog as $$
begin
  if not healthchain_private.valid_product_metric(p_event,p_dimension,p_platform) then
    raise exception 'Invalid product metric' using errcode = '22023';
  end if;
  insert into healthchain_private.product_metric_counts(day,event,dimension,platform,hits)
    values ((now() at time zone 'UTC')::date,p_event,p_dimension,p_platform,1)
    on conflict (day,event,dimension,platform) do update
      set hits = healthchain_private.product_metric_counts.hits + 1;
end $$;
revoke all on function public.healthchain_count_product_metric(text,text,text) from public, anon, authenticated;
grant execute on function public.healthchain_count_product_metric(text,text,text) to service_role;

create or replace function public.healthchain_product_metric_report(p_days integer default 30)
returns table(day date,event text,dimension text,platform text,hits bigint)
language plpgsql security invoker set search_path = pg_catalog as $$
begin
  if p_days is null or p_days not in (7,30,90) then raise exception 'Invalid report period' using errcode = '22023'; end if;
  return query select m.day,m.event,m.dimension,m.platform,m.hits
    from healthchain_private.product_metric_counts m
    where m.day >= (now() at time zone 'UTC')::date - (p_days - 1)
      and m.day <= (now() at time zone 'UTC')::date
    order by m.day desc,m.event,m.dimension,m.platform;
end $$;
revoke all on function public.healthchain_product_metric_report(integer) from public, anon, authenticated;
grant execute on function public.healthchain_product_metric_report(integer) to service_role;

create or replace function public.healthchain_prune_product_metrics()
returns bigint language plpgsql security invoker set search_path = pg_catalog as $$
declare removed bigint;
begin
  delete from healthchain_private.product_metric_counts where day < (now() at time zone 'UTC')::date - 89;
  get diagnostics removed = row_count;
  return removed;
end $$;
revoke all on function public.healthchain_prune_product_metrics() from public, anon, authenticated;
grant execute on function public.healthchain_prune_product_metrics() to service_role;

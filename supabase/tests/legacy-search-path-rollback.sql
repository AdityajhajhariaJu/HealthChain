-- Synthetic temporary rows only; no patient documents are returned.
begin;
create temporary table audit_search_path_trigger (id integer, updated_at timestamptz);
create trigger audit_updated_at before update on audit_search_path_trigger
  for each row execute function public.update_updated_at_column();
insert into audit_search_path_trigger values (1,'2000-01-01');
update audit_search_path_trigger set id=2;
do $$ begin
  if not exists(select 1 from audit_search_path_trigger where updated_at=now()) then
    raise exception 'Legacy timestamp trigger failed';
  end if;
  if (select count(*) from public.match_documents(null::public.vector,2,0)) <> 0 then
    raise exception 'Zero-limit document match failed';
  end if;
  if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('update_updated_at_column','match_documents')
      and not exists(select 1 from unnest(p.proconfig) c where c like 'search_path=%')) then
    raise exception 'Legacy function search paths are mutable';
  end if;
end $$;
rollback;

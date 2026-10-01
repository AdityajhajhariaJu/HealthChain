-- Preserve optional legacy functions while removing caller-controlled name resolution.
-- These helpers are invoker functions; existing ownership and grants are retained.
do $migration$
begin
  if to_regprocedure('public.update_updated_at_column()') is not null then
    execute 'alter function public.update_updated_at_column() set search_path = ''''';
  end if;
  if to_regtype('public.vector') is not null then
    if to_regprocedure('public.match_documents(public.vector,double precision,integer)') is not null
      and to_regclass('public.document_embeddings') is not null then
      execute $definition$
        create or replace function public.match_documents(query_embedding public.vector, match_threshold double precision, match_count integer)
        returns table(id uuid, source_file text, chunk_content text, similarity double precision)
        language plpgsql security invoker set search_path = '' as $body$
        begin
          return query
          select d.id, d.source_file, d.chunk_content,
            1 - (d.embedding operator(public.<=>) query_embedding) as similarity
          from public.document_embeddings d
          where 1 - (d.embedding operator(public.<=>) query_embedding) > match_threshold
          order by d.embedding operator(public.<=>) query_embedding
          limit match_count;
        end;
        $body$;
      $definition$;
    end if;
  end if;
end $migration$;

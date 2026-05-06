-- ============================================================
-- Fix: acesso via Data API + Realtime para dashboard compartilhado
-- Execute no SQL Editor do Supabase (projeto de producao)
-- ============================================================

-- Garantir permissao de schema
grant usage on schema public to anon, authenticated;

-- Garantir permissoes de tabela (Data API)
grant select, insert, update, delete on table public.campaign_metrics to authenticated;
grant select, insert, update, delete on table public.dashboard_data_source to authenticated;

-- Reforco para uso futuro via anon (somente leitura, opcional)
grant select on table public.campaign_metrics to anon;
grant select on table public.dashboard_data_source to anon;

-- Publicar tabelas no Realtime
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'campaign_metrics'
  ) then
    alter publication supabase_realtime add table public.campaign_metrics;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'dashboard_data_source'
  ) then
    alter publication supabase_realtime add table public.dashboard_data_source;
  end if;
end $$;

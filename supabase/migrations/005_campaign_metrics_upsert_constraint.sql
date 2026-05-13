-- ============================================================
-- Analytics PTA — Unique constraint para upsert diário do Meta
-- Execute no Supabase SQL Editor antes de usar o auto-sync
-- ============================================================

-- Remove duplicatas mantendo a linha mais recente por (date, campaign_name, source)
DELETE FROM public.campaign_metrics
WHERE id NOT IN (
  SELECT DISTINCT ON (date, campaign_name, source) id
  FROM public.campaign_metrics
  ORDER BY date, campaign_name, source, created_at DESC
);

-- Adiciona constraint única para habilitar upsert eficiente
ALTER TABLE public.campaign_metrics
  ADD CONSTRAINT IF NOT EXISTS campaign_metrics_date_campaign_source_key
  UNIQUE (date, campaign_name, source);

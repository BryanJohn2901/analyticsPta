-- ─── 012: Products table ────────────────────────────────────────────────────
-- Stores the full ProductData as JSONB so it's shared across all devices
-- for the same authenticated user.

CREATE TABLE IF NOT EXISTS public.products (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL CHECK (type IN ('pos','imersao')),
  data       JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_select" ON public.products
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "products_insert" ON public.products
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "products_update" ON public.products
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "products_delete" ON public.products
  FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;

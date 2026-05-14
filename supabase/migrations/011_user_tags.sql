-- ─── 011: Custom historical tags per user ──────────────────────────────────
-- Stores up to 5 custom filter tags per user per historical kind.

CREATE TABLE IF NOT EXISTS public.user_tags (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind       TEXT        NOT NULL CHECK (kind IN ('lancamento','evento','perpetuo','instagram')),
  name       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, kind, name)
);

ALTER TABLE public.user_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_tags_select" ON public.user_tags
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_tags_insert" ON public.user_tags
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_tags_delete" ON public.user_tags
  FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, DELETE ON public.user_tags TO authenticated;

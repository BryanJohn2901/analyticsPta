-- Subfiltro interno por categoria fixa (ex.: BM, TF) na vinculação de contas Meta
ALTER TABLE public.user_account_entries
  ADD COLUMN IF NOT EXISTS internal_filter TEXT;

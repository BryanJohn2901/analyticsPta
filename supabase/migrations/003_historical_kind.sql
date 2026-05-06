-- Add kind discriminator + flexible extras column
alter table if exists public.historical_rows
  add column if not exists kind text not null default 'lancamento',
  add column if not exists extra jsonb not null default '{}'::jsonb;

create index if not exists historical_rows_kind_idx on public.historical_rows(kind);

-- Constraint: kind deve ser um dos valores conhecidos
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'historical_rows_kind_check'
  ) then
    alter table public.historical_rows
      add constraint historical_rows_kind_check
      check (kind in ('lancamento','evento','perpetuo','instagram'));
  end if;
end $$;

-- Add turma (edition/class) column to historical_rows
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)

ALTER TABLE public.historical_rows
  ADD COLUMN IF NOT EXISTS turma TEXT;

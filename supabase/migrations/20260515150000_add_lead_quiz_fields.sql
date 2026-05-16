alter table if exists public.leads
  add column if not exists intent_type text,
  add column if not exists quiz_answers jsonb;

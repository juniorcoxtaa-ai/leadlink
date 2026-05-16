alter table if exists public.leads
  add column if not exists classification text not null default 'frio',
  add column if not exists urgency text not null default 'exploratorio',
  add column if not exists budget_range text not null default 'indefinido',
  add column if not exists score_detail jsonb,
  add column if not exists next_step text,
  add column if not exists profile_summary text;

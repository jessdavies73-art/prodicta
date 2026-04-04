alter table public.results
  add column if not exists candidate_type text,
  add column if not exists predictions jsonb,
  add column if not exists reality_timeline jsonb,
  add column if not exists decision_alerts jsonb;

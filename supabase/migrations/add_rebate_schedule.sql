alter table public.candidate_outcomes
  add column if not exists rebate_schedule jsonb;

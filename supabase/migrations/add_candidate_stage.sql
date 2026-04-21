-- Candidate shortlisting stage. Drives the dashboard Section 2 groups and the
-- per-row Progress / Hold / Reject actions. Legacy candidates stay 'active',
-- which renders without a pill in the main table.
alter table public.candidates
  add column if not exists stage text default 'active'
  check (stage in ('active', 'progress', 'hold', 'reject'));

create index if not exists idx_candidates_user_stage
  on public.candidates (user_id, stage)
  where stage <> 'active';

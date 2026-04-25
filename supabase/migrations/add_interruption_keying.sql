-- Per-assessment control over how the in-scenario interruption gate is keyed.
--
-- 'candidate' (default): hash on (candidate.id, scenarioIndex). Each candidate
-- on the same assessment sees the interruption fire on different scenarios.
-- This is the anti-gaming default for one-off invites.
--
-- 'assessment': hash on (assessment.id, scenarioIndex). Every candidate on the
-- same assessment sees the interruption fire on the same scenarios. This is
-- the bulk-invite mode where apples-to-apples comparison matters.
--
-- Probability stays at ~30% per scenario in both modes; only the seed changes.
-- Existing rows backfill to 'candidate' (the safer default for assessments
-- created before this column shipped).
alter table public.assessments
  add column if not exists interruption_keying text not null default 'candidate';

alter table public.assessments
  drop constraint if exists assessments_interruption_keying_chk;

alter table public.assessments
  add constraint assessments_interruption_keying_chk
  check (interruption_keying in ('candidate', 'assessment'));

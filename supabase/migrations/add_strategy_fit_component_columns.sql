-- Strategy-Fit components launch.
--
-- Two new columns:
--
--   assessments.strategy_fit_components: JSONB carrying any
--     pre-generated Strategy-Fit components produced at assessment
--     creation time. Phase 1 of this launch ships the Strategic
--     Thinking Evaluation under the key 'strategic_thinking'. Future
--     Strategy-Fit components (Stakeholder Management Brief is on the
--     roadmap, currently not built) will live alongside under their
--     own keys without a schema change.
--
--   results.executive_summary: JSONB carrying the synthesised
--     Executive Summary (or Development Summary for junior-mid
--     candidates) generated at scoring time after every other scoring
--     pass completes. Headline label, section list, and a
--     recommendation block. PDF rendering reads this column for the
--     top-of-page-1 panel.
--
-- Both default to NULL. Legacy Strategy-Fit assessments created before
-- this launch keep both columns null and the candidate flow + report
-- gracefully degrade by skipping the new screen / panel.
alter table public.assessments
  add column if not exists strategy_fit_components jsonb default null;
alter table public.results
  add column if not exists executive_summary jsonb default null;

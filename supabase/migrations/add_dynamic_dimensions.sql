-- Dynamic Dimension Detection. Replaces the fixed 4-family / 5-dimension
-- scoring frame with a per-assessment selection of 5 to 7 dimensions plus
-- High/Mid/Low rubrics generated for that specific role.
--
-- detected_dimensions stores: { "dimensions": [{ "name", "weight", "reason" }, ...] }
-- where weights sum to 100 and reasons are the audit trail for why each
-- dimension was selected.
--
-- dimension_rubrics stores: { "rubrics": [{ "dimension", "high_anchor",
-- "mid_anchor", "low_anchor" }, ...] } where each anchor is role-specific.
--
-- Both columns are nullable. Assessments generated before this pipeline
-- shipped read as null and fall back to the legacy fixed-family scoring path
-- in lib/score-candidate.js.
alter table public.assessments
  add column if not exists detected_dimensions jsonb;

alter table public.assessments
  add column if not exists dimension_rubrics jsonb;

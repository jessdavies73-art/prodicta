-- Audit-trail provenance for the modular Workspace.
--
-- Every scoring run on an assessment that used the modular Workspace
-- records two version markers alongside the existing scoring_rubric_version
-- and model_version columns:
--
--   workspace_rubric_version
--     Bumps when the per-block scoring criteria or the cross-block
--     aggregation logic changes in a way that materially affects the
--     score. The Manager Brief and Evidence Pack PDFs surface this in
--     the audit trail panel so a future rebate dispute or tribunal can
--     defensibly show which scoring rubric was applied.
--
--   workspace_block_library_version
--     Bumps when the set of shells / block types shipped in the modular
--     Workspace changes. Phase 1 records 'office-block-library-v1.0'.
--     When healthcare or education shells ship the constant flips and
--     the column captures which library was in force at scoring time.
--
-- Legacy results (scored against the single-call Workspace path) leave
-- these columns null, so the audit trail panel renders the existing 12
-- rows for legacy and 12 + 3 rows for modular without a schema branch.
alter table public.results
  add column if not exists workspace_rubric_version text;

alter table public.results
  add column if not exists workspace_block_library_version text;

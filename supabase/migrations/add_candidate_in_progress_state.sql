-- Add per-candidate in-progress assessment state for the typed-text scenario
-- path on /assess/[token]. Stores a JSONB blob containing scenario responses,
-- ranked actions, forced-choice responses, the current scenario index, and
-- per-scenario time elapsed. Written on auto-save (every 30s of idle and on
-- response field blur) and on scenario advance. Cleared when the candidate
-- submits the full assessment, when they choose "Start over" on the Resume
-- page, or via the DELETE /api/assess/[token]/progress endpoint.
--
-- last_progress_at is a recency signal; the GET endpoint and Resume page can
-- use it to surface "saved at" labels and to gate stale-data behaviour.
--
-- Schema is intentionally JSONB so the progress shape can evolve as further
-- flow branches (modular workspace, calendar, strategic thinking) opt in to
-- progress saving in follow-up work, without requiring a new migration each
-- time the persisted shape changes.
alter table public.candidates
  add column if not exists in_progress_state jsonb,
  add column if not exists last_progress_at timestamptz;

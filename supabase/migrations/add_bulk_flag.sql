-- Bulk vs individual classifier on candidate rows. The Bulk Screening
-- Mode and Individual Screening dashboard panels (agency-only) split
-- their counts off this flag. Set by app/api/candidates/invite/route.js
-- using a length-of-payload heuristic: a single-candidate POST is
-- individual, a multi-candidate POST is bulk.
--
-- Idempotent: safe to re-apply. Existing rows default to false and so
-- show up under Individual Screening, which is the conservative
-- interpretation since pre-flag candidates cannot be retroactively
-- reclassified.
alter table public.candidates
  add column if not exists created_via_bulk boolean not null default false;

comment on column public.candidates.created_via_bulk is
  'True when the candidate was created as part of a bulk invite (more than one candidate in the same POST body). Drives the agency-only Bulk Screening Mode vs Individual Screening dashboard panels. Defaults to false so legacy rows count as individual.';

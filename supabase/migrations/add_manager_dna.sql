-- Manager DNA Assessment.
--
-- Records the hiring manager's own decision-making profile, generated
-- from their responses to two scenario prompts in the Manager DNA flow
-- (app/assessment/[id]/manager-dna/). Used by the candidate report's
-- "Manager DNA Alignment" panel to compare each candidate's pressure-
-- fit profile against the manager's actual style and surface ideal
-- candidate traits + clash risks.
--
-- The table was created out-of-band on the production Supabase project
-- before this migration was checked in. This file makes the schema
-- reproducible for fresh environments and provides a documented
-- rollback. Verified against the live schema on
-- yionbkntbiferdfjpout (db.yionbkntbiferdfjpout.supabase.co): table
-- present, RLS enabled, 0 rows. The schema below mirrors production
-- exactly so applying this migration to a fresh environment produces
-- a database that matches production.
--
-- Schema notes:
--   - id is uuid PK with gen_random_uuid() default.
--   - assessment_id references public.assessments(id).
--   - user_id references auth.users(id) (NOT public.users) because the
--     hiring user is the Supabase auth principal that authored the
--     assessment, not a row in public.users.
--   - One row per (assessment_id, user_id). The upsert in
--     app/api/assessment/[id]/manager-dna/route.js uses
--     onConflict: 'assessment_id,user_id' so the unique constraint is
--     load-bearing.
--   - All free-text and JSONB fields default to NULL. The candidate
--     report only renders the panel when alignment_dimensions is
--     non-null, so partial rows degrade gracefully.
--   - RLS is enabled with no permissive policies; reads go via the
--     service role from the API route, matching how candidate_outcomes
--     and similar admin-owned tables are gated.
create table if not exists public.manager_dna (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Two-scenario manager prompts (delegation, conflict). JSONB so the
  -- shape can evolve without migrations.
  scenarios jsonb default null,
  responses jsonb default null,

  -- Generated profile fields. Stored discretely (rather than as one
  -- JSONB blob) so the candidate report can SELECT just the columns it
  -- renders without parsing.
  management_style text default null,
  delegation_approach text default null,
  conflict_style text default null,
  decision_speed text default null,             -- fast | measured | cautious
  communication_preference text default null,   -- direct | collaborative | structured
  accountability_style text default null,       -- high_autonomy | guided | close_oversight
  ideal_candidate_traits jsonb default null,    -- string[]
  clash_risk_traits jsonb default null,         -- string[]
  alignment_dimensions jsonb default null,      -- { autonomy_vs_guidance, pace_tolerance, structure_preference, conflict_comfort, detail_orientation }: each 0-100
  summary text default null,

  completed_at timestamptz default null,
  created_at timestamptz default now(),

  unique (assessment_id, user_id)
);

alter table public.manager_dna enable row level security;

-- Rollback (run from the Supabase SQL editor if needed):
--
--   drop table if exists public.manager_dna;
--
-- Production already carries this table. Applying this migration to a
-- fresh environment is idempotent (the if not exists clause skips when
-- the table is already present). Applying it to production is a no-op.

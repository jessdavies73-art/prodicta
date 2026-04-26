-- Phase 1 of the modular Workspace engine.
--
-- role_profile is a JSONB shape produced once per assessment by the
-- role-profile-detector at /api/assessment/generate time. It captures the
-- work-type mix, seniority band, function, sector context, company size,
-- IC vs manager, and stakeholder complexity for the role and feeds the
-- scenario-generator selection logic. See lib/role-profile-detector.js
-- for the full schema and prompt.
--
-- shell_family is the high-level UI family the role belongs to:
--   'office'       -> Phase 1, all desk-based roles
--   'healthcare'   -> Phase 2, clinical and care
--   'education'    -> Phase 2, teaching and education support
--   'field_ops'    -> Phase 3, hospitality, retail, security, real estate, etc.
--   'out_of_scope' -> the role is not a fit for any shell; the assess flow
--                     falls back to the legacy WorkspacePage.
--
-- workspace_scenario is the connected scenario the scenario-generator
-- produces once at assessment creation. It contains the scenario spine,
-- trigger, ordered selected_blocks, per-block content, and the five-stage
-- scenario_arc. Cached on the assessment row so every candidate on the
-- same assessment sees the same spine (apples-to-apples comparison).
--
-- use_modular_workspace is the routing flag. When true AND
-- workspace_scenario is populated AND shell_family is in scope, the
-- assess flow mounts the new ModularWorkspace orchestrator. Otherwise
-- the legacy WorkspacePage continues to render. Defaults to false so
-- existing Strategy-Fit assessments keep their current behaviour.
alter table public.assessments
  add column if not exists role_profile jsonb;

alter table public.assessments
  add column if not exists workspace_scenario jsonb;

alter table public.assessments
  add column if not exists shell_family text;

alter table public.assessments
  add column if not exists use_modular_workspace boolean not null default false;

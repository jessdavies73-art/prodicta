-- Phase 2 of the modular Workspace engine.
--
-- healthcare_workspace_enabled is the per-assessment routing flag for
-- Healthcare shell roles. Until this flag is set to true on a row, any
-- assessment with shell_family = 'healthcare' continues to render the
-- legacy WorkspacePage instead of the modular orchestrator. The flag is
-- defaulted to false so existing healthcare assessments are unaffected
-- and the build/test cycle for the new shell can run in parallel with
-- the live Phase 1 Office shell flow.
--
-- The Office shell uses the existing use_modular_workspace flag (added
-- in add_role_profile_and_modular_flag.sql); they are intentionally
-- separate so each shell can be ramped independently and one can be
-- rolled back without touching the other.
alter table public.assessments
  add column if not exists healthcare_workspace_enabled boolean not null default false;

-- Phase 2 Education shell of the modular Workspace engine.
--
-- education_workspace_enabled is the per-assessment routing flag for
-- Education shell roles (teaching, SEN, pastoral, subject leadership,
-- senior leadership, early years, FE/sixth form). Until this flag is
-- set to true on a row, any assessment with shell_family = 'education'
-- continues to render the legacy WorkspacePage instead of the modular
-- orchestrator.
--
-- The flag is defaulted to false so existing education assessments are
-- unaffected and the build/test cycle for the new shell can run in
-- parallel with the live Phase 1 Office and Phase 2 Healthcare flows.
--
-- The Office shell uses use_modular_workspace, the Healthcare shell
-- uses healthcare_workspace_enabled, and the Education shell uses this
-- new flag. The three are intentionally separate so each shell can be
-- ramped independently and one can be rolled back without touching the
-- others.
alter table public.assessments
  add column if not exists education_workspace_enabled boolean not null default false;

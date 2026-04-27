-- Subscription Workspace add-on launch.
--
-- Two new columns on assessments record whether a £25 Workspace
-- simulation add-on was purchased for this assessment (subscribers only;
-- PAYG buyers continue to use the existing Immersive credit flow), and
-- the actual amount charged. Both default to false / 0 so existing rows
-- are unaffected and the read paths stay backwards-compatible.
--
-- Strategy-Fit assessments always include Workspace at no additional
-- charge regardless of tier or PAYG; for those rows the columns are
-- written as workspace_addon_purchased = true, workspace_addon_charged_pence = 0
-- so the audit trail is complete.
alter table public.assessments
  add column if not exists workspace_addon_purchased boolean not null default false;
alter table public.assessments
  add column if not exists workspace_addon_charged_pence integer not null default 0;

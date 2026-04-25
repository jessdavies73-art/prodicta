-- Structured Job Breakdown produced by the pre-scenario extraction pass.
-- Stored as JSONB so the audit trail can show the exact tasks, disruptions,
-- decisions, and failure points the AI identified for the role at the time
-- the assessment was generated.
alter table public.assessments
  add column if not exists job_breakdown jsonb;

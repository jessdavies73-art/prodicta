-- Record the timestamp at which the candidate clicked Start on the
-- /assess/[token] landing screen. The Start button doubles as the consent
-- action: the candidate has been shown a brief disclosure of AI analysis
-- and UK GDPR data handling, and pressing Start records that they saw
-- the disclosure before any scenario response was captured. The column
-- is null for legacy candidates who began their assessment before this
-- column existed; only newly-started assessments populate it.
alter table public.candidates
  add column if not exists consent_timestamp timestamptz;

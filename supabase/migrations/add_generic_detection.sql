-- Anti-generic-answer detection. Stores the per-candidate output of the
-- detectGenericPatterns step in lib/score-candidate.js so the candidate report
-- can render an Answer Authenticity panel and the scoring confidence band can
-- be lowered when a high generic_score is detected.
--
-- Shape: { "score": 0..100, "flags": ["..."], "evidence_per_flag": { "flag": "quote" } }
-- Score is 0 (very specific / genuine) to 100 (highly generic). The report
-- inverts this to an authenticity score for display (jade for high
-- authenticity, amber for moderate, red for high generic).
alter table public.results
  add column if not exists generic_detection jsonb;

-- Ranked decisions and follow-up interruptions per scenario response.
--
-- ranked_actions stores the candidate's three ranked actions plus a short
-- written justification per slot. Shape:
-- {
--   "slots": [
--     { "rank": 1, "action": "...", "justification": "..." },
--     { "rank": 2, "action": "...", "justification": "..." },
--     { "rank": 3, "action": "...", "justification": "..." }
--   ],
--   "submitted_at": "2026-04-25T10:00:00Z"
-- }
--
-- interruption_response captures whether an in-scenario interruption fired
-- (30% chance once the candidate has submitted their first action) and how
-- the candidate handled it. Shape:
-- {
--   "fired": true,
--   "prompt": "While you were doing X, a new event has happened: ...",
--   "revised_slots": [...],
--   "changed_ranking": true,
--   "reasoning": "...",
--   "responded_at": "2026-04-25T10:01:30Z"
-- }
-- When the interruption did not fire, the column may store { "fired": false }
-- or stay null. Both are equivalent for scoring purposes.
alter table public.responses
  add column if not exists ranked_actions jsonb;

alter table public.responses
  add column if not exists interruption_response jsonb;

-- Scoring output: per-candidate judgement on whether the order of their three
-- ranked actions was defensible, and how they handled the in-scenario
-- interruption (held a sensible ranking under new information vs panic-changed
-- a sensible ranking). Both nullable; legacy candidates render fine without.
alter table public.results
  add column if not exists ranking_quality jsonb;

alter table public.results
  add column if not exists interruption_handling jsonb;

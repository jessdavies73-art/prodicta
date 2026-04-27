-- Strategic Thinking Evaluation responses persistence.
--
-- Stores the Strategy-Fit candidate's responses to the Strategic Thinking
-- evaluation questions, captured between the scenarios and the Workspace
-- in app/assess/[uniqueToken]/page.js. The shape is:
--
-- {
--   "<question_id>": "candidate response text",
--   ...,
--   "time_in_component": <seconds spent on the screen>
-- }
--
-- Read by lib/score-candidate.js after Workspace block scoring completes.
-- When this column is null on a row (legacy Strategy-Fit assessments
-- shipped before this migration), Strategic Thinking scoring is silently
-- skipped and the rest of the report renders unchanged.

ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS strategic_thinking_responses JSONB DEFAULT NULL;

COMMENT ON COLUMN assessments.strategic_thinking_responses IS
  'Strategy-Fit Strategic Thinking Evaluation candidate responses, keyed '
  'by question_id, plus a time_in_component seconds field. NULL for legacy '
  'Strategy-Fit assessments produced before this column existed; scoring '
  'gracefully skips when null.';

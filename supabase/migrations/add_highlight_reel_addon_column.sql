-- Pricing alignment: Highlight Reel free on all subscriber assessments.
--
-- highlight_reel_addon_purchased records whether this assessment is
-- entitled to a Highlight Reel. Set true at assessment creation when:
--   - the buyer is a Starter / Professional / Business subscriber
--     (Highlight Reel is bundled into every subscriber assessment), OR
--   - the assessment is Strategy-Fit (Highlight Reel always included
--     in the £65 PAYG price), OR
--   - the PAYG buyer attached the £10 Highlight Reel add-on at create
--     time (Speed-Fit / Depth-Fit only)
--
-- Defaults to false so legacy assessments are unaffected. Reading code
-- treats null and false identically; no Highlight Reel token mints
-- unless this column is true at scoring time.
alter table public.assessments
  add column if not exists highlight_reel_addon_purchased boolean not null default false;

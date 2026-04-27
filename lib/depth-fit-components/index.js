// Depth-Fit components barrel + orchestrator.
//
// generateDepthFitComponents fans out the two generators in parallel,
// returns the aggregated payload, and tolerates one failing without
// dragging the other down. The caller (the assessment generate route)
// persists this to assessments.depth_fit_components as a single JSONB
// blob so reads are cheap.

import { generateDayOnePlanning } from './day-one-planning'
import { generateInboxOverload } from './inbox-overload'
import { DEPTH_FIT_COMPONENTS_VERSION } from './_shared'

export { generateDayOnePlanning } from './day-one-planning'
export { generateInboxOverload } from './inbox-overload'
export {
  DEPTH_FIT_COMPONENTS_VERSION,
  deriveDepthFitSeniority,
  resolveSeniorityForShell,
  DAY_ONE_GUIDANCE,
  INBOX_GUIDANCE,
} from './_shared'

// Reader-side fallback. Returns the day-one-planning payload from
// depth_fit_components if present, otherwise the legacy
// calendar_events. Use this everywhere the candidate-facing calendar
// or the calendar-score input is constructed so in-flight assessments
// produced before this column existed still render.
export function readDayOnePlanning(assessment) {
  if (!assessment) return null
  const dfc = assessment.depth_fit_components
  if (dfc && dfc.day_one_planning) return dfc.day_one_planning
  return assessment.calendar_events || null
}

// Reader-side fallback for the inbox. Same pattern as the calendar:
// prefer the new column, fall back to legacy.
export function readInboxOverload(assessment) {
  if (!assessment) return null
  const dfc = assessment.depth_fit_components
  if (dfc && dfc.inbox_overload) return dfc.inbox_overload
  return assessment.inbox_events || null
}

export async function generateDepthFitComponents({
  client,
  role_title,
  role_profile,
  role_level,
  canonical_level,
  shell_family,
  scenarios,
  mode,
}) {
  const generatedAt = new Date().toISOString()

  // Day One Planning runs for every mode that includes a calendar.
  // Inbox Overload only runs for non-quick modes (matches legacy gating
  // in /api/assessment/generate).
  const calendarPromise = generateDayOnePlanning({
    client,
    role_title,
    role_profile,
    role_level,
    canonical_level,
    shell_family,
  }).catch(err => {
    console.error('[depth-fit-components] day-one-planning failed:', err?.message)
    return null
  })

  const inboxPromise = (mode !== 'quick' && Array.isArray(scenarios) && scenarios.length > 0)
    ? generateInboxOverload({
        client,
        role_title,
        role_profile,
        role_level,
        canonical_level,
        shell_family,
        scenarios,
      }).catch(err => {
        console.error('[depth-fit-components] inbox-overload failed:', err?.message)
        return null
      })
    : Promise.resolve(null)

  const [calendarResult, inboxResult] = await Promise.all([calendarPromise, inboxPromise])

  return {
    version: DEPTH_FIT_COMPONENTS_VERSION,
    generated_at: generatedAt,
    shell_family: shell_family || 'office',
    seniority: calendarResult?.diagnostics?.seniority || inboxResult?.diagnostics?.seniority || null,
    day_one_planning: calendarResult?.payload || null,
    inbox_overload: inboxResult?.payload || null,
    diagnostics: {
      day_one_planning: calendarResult?.diagnostics || null,
      inbox_overload: inboxResult?.diagnostics || null,
    },
  }
}

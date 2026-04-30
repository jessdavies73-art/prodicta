// PRODICTA killer-workflow journey: a six-step narrative that frames the
// product as a single linear flow rather than a flat collection of widgets.
// Steps 1, 2, 5, 6 are universal. Steps 3 and 4 vary by account type and
// employment type so the language matches the buyer's reality:
//   - agencies "send to client" then "track placement / assignment"
//   - direct employers "make a hiring decision" then "track probation /
//     assignment"
//
// This module is the single source of truth for journey copy and IDs. The
// dashboard journey indicator (components/JourneyIndicator.js) consumes
// it; the demo dashboard consumes the same function so the live and demo
// stay in lock-step.

const STEP_1 = { id: 'create-role', label: 'Create role', shortLabel: 'Create' }
const STEP_2 = { id: 'screen-candidates', label: 'Screen candidates', shortLabel: 'Screen' }
const STEP_5 = { id: 'fix-risk', label: 'Fix risk', shortLabel: 'Fix' }
const STEP_6 = { id: 'document-outcome', label: 'Document outcome', shortLabel: 'Document' }

function step3(accountType, employmentType) {
  if (accountType === 'agency') {
    return { id: 'send-to-client', label: 'Send candidates to client', shortLabel: 'Send' }
  }
  // employer
  if (employmentType === 'temporary') {
    return { id: 'make-placement-decision', label: 'Make placement decision', shortLabel: 'Decide' }
  }
  // employer-perm or employer-both both use the hiring-decision label
  return { id: 'make-hiring-decision', label: 'Make hiring decision', shortLabel: 'Decide' }
}

function step4(accountType, employmentType) {
  if (accountType === 'agency') {
    if (employmentType === 'temporary') {
      return { id: 'track-assignment', label: 'Track assignment', shortLabel: 'Track' }
    }
    if (employmentType === 'both') {
      return { id: 'track-placement-assignment', label: 'Track placement and assignment', shortLabel: 'Track' }
    }
    // agency-perm (default)
    return { id: 'track-placement', label: 'Track placement', shortLabel: 'Track' }
  }
  // employer
  if (employmentType === 'temporary') {
    return { id: 'track-assignment', label: 'Track assignment', shortLabel: 'Track' }
  }
  if (employmentType === 'both') {
    return { id: 'track-probation-assignment', label: 'Track probation and assignment', shortLabel: 'Track' }
  }
  // employer-perm (default)
  return { id: 'track-probation', label: 'Track probation', shortLabel: 'Track' }
}

// Returns the six-step array tailored to the (accountType, employmentType)
// pair. Both inputs are normalised so unexpected values (null, undefined,
// legacy strings) fall through to the most common default rather than
// crashing the dashboard.
export function getJourneySteps(accountType, employmentType) {
  const at = accountType === 'agency' ? 'agency' : 'employer'
  const et = employmentType === 'temporary' ? 'temporary'
    : employmentType === 'both' ? 'both'
    : 'permanent'
  return [STEP_1, STEP_2, step3(at, et), step4(at, et), STEP_5, STEP_6]
}

// One-liner descriptions that sit under each step header in the indicator.
// Generic enough to apply to both live and demo without per-tenant tuning.
export const STEP_DESCRIPTIONS = {
  'create-role':                    'Draft a role and prepare an assessment to send.',
  'screen-candidates':              'Invite candidates and review their assessment results.',
  'send-to-client':                 'Bundle candidates and send to your client.',
  'make-hiring-decision':           'Compare shortlisted candidates and decide.',
  'make-placement-decision':        'Compare shortlisted candidates and confirm the placement.',
  'track-placement':                'Watch the rebate window and placement health signals.',
  'track-assignment':               'Monitor live assignments and pre-start risk.',
  'track-placement-assignment':     'Monitor placement health and live assignments side by side.',
  'track-probation':                'Use the Probation Co-pilot through the first 90 days.',
  'track-probation-assignment':     'Track probation outcomes and live assignments together.',
  'fix-risk':                       'Today’s Actions surfaces what needs attention right now.',
  'document-outcome':               'Compliance and audit packs ready for evidence.',
}

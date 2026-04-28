// Account-type / employment-type helpers used to gate UI surfaces by who is
// the legal employer of record for a candidate. Used in both live (where the
// inputs come from the users table) and demo (where the inputs come from the
// demo banner state). Keep these pure: they take primitive inputs and return
// booleans, so they work the same whether the caller has a Supabase profile
// row or just a pair of localStorage strings.

// True only when the viewer is a permanent recruitment agency: an agency
// that places candidates at clients, where the client (not the agency) is
// the employer of record. These users should not see employment-of-record
// compliance UI (SSP, holiday pay, EDI, Fair Work Agency records, sickness
// reporting) because none of it is their legal responsibility.
//
// Defaults to false when either input is missing or unrecognised, so legacy
// or in-flight signups keep their current view until they pick an employment
// type. That means adding this gate is safely additive: a user with no
// default_employment_type set sees no change.
export function isAgencyPerm(profile) {
  if (!profile) return false
  return profile.account_type === 'agency'
    && profile.default_employment_type === 'permanent'
}

// Demo equivalent. The demo's account_type and employment_type live in
// localStorage (prodicta_demo_account_type and prodicta_demo_employment_type),
// so callers pass the two strings directly rather than a profile object.
export function isDemoAgencyPerm(demoAccountType, demoEmploymentType) {
  return demoAccountType === 'agency' && demoEmploymentType === 'permanent'
}

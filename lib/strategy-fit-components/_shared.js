// Shared scaffolding for the Strategy-Fit components (Strategic
// Thinking Evaluation and Executive Summary today; Stakeholder
// Management Brief on the roadmap).
//
// Two seniority signals exist in the codebase and we read both to make
// the routing robust:
//   role_profile.seniority_band  six-tier (junior | mid | manager |
//                                senior_manager | director | c_suite)
//                                produced by lib/role-profile-detector.js
//   assessments.role_level       three-tier (OPERATIONAL | LEADERSHIP |
//                                null) set at assessment creation
//   canonical level              numeric 1-4 derived from the canonical
//                                role mapping match in scenario-generator
//
// The shipped logic uses the canonical level when available (most
// reliable), falls back to seniority_band, then role_level, then a
// safe junior_mid default. The boundary is:
//   junior_mid <- canonical level 1 or 2, or seniority_band in
//                  {junior, mid}, or role_level === 'OPERATIONAL'
//   senior     <- canonical level 3 or 4, or seniority_band in
//                  {manager, senior_manager, director, c_suite}, or
//                  role_level === 'LEADERSHIP'

export function deriveSeniority({ role_profile, canonical_level, role_level } = {}) {
  if (Number.isFinite(canonical_level)) {
    return canonical_level >= 3 ? 'senior' : 'junior_mid'
  }
  const band = role_profile?.seniority_band
  if (band === 'manager' || band === 'senior_manager' || band === 'director' || band === 'c_suite') {
    return 'senior'
  }
  if (band === 'junior' || band === 'mid') {
    return 'junior_mid'
  }
  if (role_level === 'LEADERSHIP') return 'senior'
  if (role_level === 'OPERATIONAL') return 'junior_mid'
  return 'junior_mid'
}

// Compliance language per shell. Used inside generation prompts so the
// AI doesn't drift into definitive claims (clinical for healthcare,
// pedagogical for education) that would breach the platform's
// observation-language posture.
export function shellComplianceLanguage(shell_family) {
  if (shell_family === 'healthcare') {
    return `Compliance language: never make definitive clinical claims. Use "indicators show", "evidence suggests", "clinical judgement appeared". Avoid "would have caused harm", "incompetent", "unsafe practice". Reference NMC, GMC or HCPC standards by name only when the role makes them relevant.`
  }
  if (shell_family === 'education') {
    return `Compliance language: never make definitive pedagogical or capability claims. Use "professional judgement appeared", "patterns suggest", "evidence suggests". Avoid "would have failed the pupils", "incompetent". Anonymise pupil references; never name a real school. Reference Ofsted, ISI, EHCP, Pupil Premium by name only when the role makes them relevant.`
  }
  return `Compliance language: use observation phrasing only. "Evidence suggests", "indicators show", "patterns suggest". Avoid definitive claims about future behaviour ("will fail", "cannot", "do not hire").`
}

// One-line description of the role context for the prompt preamble.
// Compact so it doesn't crowd out the actual scenario content.
export function roleContextLine({ role_profile, roleTitle }) {
  const parts = []
  if (roleTitle) parts.push(roleTitle)
  if (role_profile?.function) parts.push(`function: ${role_profile.function}`)
  if (role_profile?.seniority_band) parts.push(`seniority: ${role_profile.seniority_band}`)
  if (role_profile?.sector_context) parts.push(`sector: ${role_profile.sector_context}`)
  return parts.join(' | ') || 'role context unavailable'
}

// Pull the simplest scoring snapshot the Executive Summary synthesis
// can use without overwhelming the prompt. Trimmed to the headline
// signals: overall score, dimension scores, top strengths and
// watch-outs, the per-block workspace scores, and the existing
// ai_summary if available. Anything else stays out of the prompt.
export function compactScoringSnapshot(result) {
  if (!result || typeof result !== 'object') return {}
  const trim = (s, n) => (typeof s === 'string' ? s.trim().slice(0, n) : '')
  return {
    overall_score: result.overall_score ?? null,
    risk_level: result.risk_level || null,
    hiring_confidence: result.hiring_confidence ?? null,
    pressure_fit_score: result.pressure_fit_score ?? null,
    pass_probability: result.pass_probability ?? null,
    dimension_scores: result.scores && typeof result.scores === 'object' ? result.scores : null,
    strengths: Array.isArray(result.strengths)
      ? result.strengths.slice(0, 5).map(s => ({
          title: trim(s?.title, 80),
          evidence: trim(s?.evidence || s?.detail, 240),
        }))
      : [],
    watch_outs: Array.isArray(result.watchouts)
      ? result.watchouts.slice(0, 5).map(w => ({
          title: trim(w?.title || w?.text || w?.watchout, 80),
          if_ignored: trim(w?.if_ignored, 200),
        }))
      : [],
    ai_summary: trim(result.ai_summary, 600),
    workspace_score: result.workspace_score ?? null,
    workspace_narrative: trim(result.workspace_narrative, 400),
    workspace_signals: Array.isArray(result.workspace_signals) ? result.workspace_signals.slice(0, 5) : [],
    workspace_block_scores: Array.isArray(result.workspace_block_scores)
      ? result.workspace_block_scores.slice(0, 8).map(b => ({
          block_id: b?.block_id || null,
          score: b?.score ?? null,
          narrative: trim(b?.narrative, 240),
        }))
      : [],
  }
}

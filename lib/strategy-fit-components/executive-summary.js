// Executive Summary / Development Summary synthesis generator.
//
// Called from lib/score-candidate.js after every other scoring pass
// completes, for Strategy-Fit (mode === 'advanced') assessments only.
// The generator has the full picture of scoring results and synthesises
// a structured top-of-report summary.
//
// Senior-tier (canonical level 3-4 / seniority_band manager+):
//   headline_label:      'Executive Summary'
//   sections:            Strategic Capability, Operational Readiness,
//                        Stakeholder Mastery, Recommendation
//   recommendation type: senior-tier hiring decision (proceed_with_offer
//                        / strong_with_development_needs / not_recommended)
//
// Junior-mid (canonical level 1-2 / seniority_band junior or mid):
//   headline_label:      'Development Summary'
//   sections:            Decision-Making Capacity, Operational Strengths,
//                        Working with Others, Growth Recommendation
//   recommendation type: development-focused (ready_with_onboarding /
//                        promising_with_structured_support /
//                        better_at_different_level)
//
// Returns the typed shape:
//   {
//     component_id: 'executive-summary',
//     headline_label: 'Executive Summary' | 'Development Summary',
//     seniority_framing: 'senior' | 'junior_mid',
//     sections: [{ section_label, content_paragraph }],
//     recommendation: { type, summary },
//     generated_at: ISO
//   }
//
// Returns null on failure; the report renders without the panel.

import {
  deriveSeniority,
  shellComplianceLanguage,
  roleContextLine,
  compactScoringSnapshot,
} from './_shared.js'

const MODEL = 'claude-haiku-4-5-20251001'
const MAX_TOKENS = 4000

const SENIOR_SECTIONS = [
  { key: 'strategic_capability', label: 'Strategic Capability' },
  { key: 'operational_readiness', label: 'Operational Readiness' },
  { key: 'stakeholder_mastery', label: 'Stakeholder Mastery' },
]

const JUNIOR_SECTIONS = [
  { key: 'decision_making_capacity', label: 'Decision-Making Capacity' },
  { key: 'operational_strengths', label: 'Operational Strengths' },
  { key: 'working_with_others', label: 'Working with Others' },
]

const SENIOR_RECOMMENDATION_TYPES = [
  'proceed_with_offer',
  'strong_with_development_needs',
  'not_recommended',
]
const JUNIOR_RECOMMENDATION_TYPES = [
  'ready_with_onboarding',
  'promising_with_structured_support',
  'better_at_different_level',
]

function buildPrompt({ role_profile, shell_family, roleTitle, candidateName, snapshot, seniority, canonical_level }) {
  const compliance = shellComplianceLanguage(shell_family)
  const context = roleContextLine({ role_profile, roleTitle })
  const isSenior = seniority === 'senior'
  const sections = isSenior ? SENIOR_SECTIONS : JUNIOR_SECTIONS
  const recommendationTypes = isSenior ? SENIOR_RECOMMENDATION_TYPES : JUNIOR_RECOMMENDATION_TYPES

  const sectionList = sections.map((s, i) =>
    `      ${i + 1}. ${s.label} (key "${s.key}"): one short paragraph synthesising the candidate's performance in this area, evidence-based, citing concrete observations from the scoring snapshot below. ${
      isSenior
        ? (
            s.key === 'strategic_capability'
              ? 'Read across the Strategic Thinking Evaluation responses and the cross-block reasoning patterns in the workspace. Strategic capability is about seeing the whole, naming the trade-off, and articulating the call.'
              : s.key === 'operational_readiness'
                ? 'Read across the workspace block scores, the dimension scores, and the strengths. Operational readiness is about whether the candidate can run the role tomorrow with the constraints they will actually face.'
                : 'Read across the conversation simulation and stakeholder-pattern signals in the workspace, plus the watch-outs about tone or commitment. Stakeholder mastery is about whether the candidate lands what they need to land with the people they need to land it with.'
          )
        : (
            s.key === 'decision_making_capacity'
              ? 'Read across the Strategic Thinking Evaluation responses (framed at IC level) and the dimension scores. Decision-making capacity at this seniority is about whether the candidate can weigh trade-offs they actually face today, not whether they think strategically at scale.'
              : s.key === 'operational_strengths'
                ? 'Read across the workspace block scores and the strengths. Operational strengths at this seniority are about reliable delivery, not breadth of leadership.'
                : 'Read across the conversation patterns, parent or family or peer interactions in the workspace, and the watch-outs. Working with others at this seniority is about peer interaction, escalation pattern, customer/family/pupil interaction.'
          )
    }`
  ).join('\n')

  const recommendationGuidance = isSenior
    ? `Recommendation. Pick one of: ${recommendationTypes.map(t => `"${t}"`).join(' / ')}. Write a one to two sentence summary of the recommendation in senior-tier hiring language.`
    : `Recommendation (Growth Recommendation). Pick one of: ${recommendationTypes.map(t => `"${t}"`).join(' / ')}. Write a one to two sentence summary of the recommendation in development-focused language.`

  return `You are writing the ${isSenior ? 'Executive Summary' : 'Development Summary'} that opens the candidate report. The report reader is a ${isSenior ? 'senior decision-maker preparing to make an offer or pass' : 'hiring manager assessing fit and onboarding shape'} for a ${roleTitle || 'role'}. Output JSON only. UK English. No emoji. No em dashes.

Role context: ${context}
Candidate name: ${candidateName || 'Candidate'}
Shell family: ${shell_family || 'office'}
Seniority framing: ${seniority}${Number.isFinite(canonical_level) ? ` (canonical level ${canonical_level})` : ''}

Scoring snapshot to synthesise from:
${JSON.stringify(snapshot)}

Three sections to write:
${sectionList}

${recommendationGuidance}

${compliance}

Each content_paragraph must be 3 to 5 sentences, evidence-based, and reference specific signals from the scoring snapshot (block names, dimension scores, named strengths or watch-outs). Do not list bullet points; write flowing paragraph prose. Do not over-promise; do not make definitive claims about future behaviour.

Output schema:
{
  "component_id": "executive-summary",
  "headline_label": "${isSenior ? 'Executive Summary' : 'Development Summary'}",
  "seniority_framing": "${seniority}",
  "sections": [
${sections.map(s => `    { "section_label": "${s.label}", "content_paragraph": "string" }`).join(',\n')}
  ],
  "recommendation": {
    "type": "${recommendationTypes.join(' | ')}",
    "summary": "string (1-2 sentences)"
  }
}`
}

function parseJson(text) {
  if (!text || typeof text !== 'string') return null
  const cleaned = text.replace(/[—–]/g, ', ')
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (!match) return null
  try { return JSON.parse(match[0]) } catch { return null }
}

function normalise(raw, seniority) {
  if (!raw || typeof raw !== 'object') return null
  const safeStr = (v) => typeof v === 'string' ? v.trim() : ''
  const isSenior = seniority === 'senior'
  const expectedSections = isSenior ? SENIOR_SECTIONS : JUNIOR_SECTIONS
  const expectedTypes = isSenior ? SENIOR_RECOMMENDATION_TYPES : JUNIOR_RECOMMENDATION_TYPES
  const expectedHeadline = isSenior ? 'Executive Summary' : 'Development Summary'

  const sectionsRaw = Array.isArray(raw.sections) ? raw.sections : []
  const sections = sectionsRaw.slice(0, 4).map(s => ({
    section_label: safeStr(s?.section_label),
    content_paragraph: safeStr(s?.content_paragraph),
  })).filter(s => s.section_label && s.content_paragraph && s.content_paragraph.length >= 60)
  if (sections.length < 2) return null

  const rec = raw.recommendation && typeof raw.recommendation === 'object' ? raw.recommendation : {}
  const recType = expectedTypes.includes(rec.type) ? rec.type : expectedTypes[1]
  const recSummary = safeStr(rec.summary)
  if (!recSummary) return null

  return {
    component_id: 'executive-summary',
    headline_label: expectedHeadline,
    seniority_framing: seniority,
    sections,
    recommendation: { type: recType, summary: recSummary },
    generated_at: new Date().toISOString(),
  }
}

export async function generateExecutiveSummary(client, {
  role_profile,
  shell_family,
  roleTitle,
  candidateName,
  scoring_results,
  canonical_level,
  role_level,
} = {}) {
  if (!client || !scoring_results) return null
  const seniority = deriveSeniority({ role_profile, canonical_level, role_level })
  const snapshot = compactScoringSnapshot(scoring_results)
  const prompt = buildPrompt({
    role_profile,
    shell_family,
    roleTitle,
    candidateName,
    snapshot,
    seniority,
    canonical_level,
  })

  let stream
  try {
    stream = client.messages.stream({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }],
    })
  } catch (err) {
    console.error('[executive-summary] stream init failed', err?.message)
    return null
  }
  let final
  try {
    final = await stream.finalMessage()
  } catch (err) {
    console.error('[executive-summary] stream completion failed', err?.message)
    return null
  }
  const text = final?.content?.[0]?.text || ''
  const raw = parseJson(text)
  return normalise(raw, seniority)
}

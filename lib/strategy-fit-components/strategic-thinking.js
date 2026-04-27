// Strategic Thinking Evaluation generator.
//
// Called at assessment creation for Strategy-Fit (mode === 'advanced')
// assessments. Produces a single role-and-seniority-aware scenario
// with 2 to 3 evaluation questions the candidate types responses to
// before reaching the modular Workspace.
//
// Senior-tier framing (canonical level 3-4 / seniority_band manager+):
//   Office     market positioning, organisational change, board prep
//   Healthcare service redesign, governance pressure, regulator engagement
//   Education  curriculum strategy, OFSTED preparation, MAT-wide call
//
// Junior-mid framing (canonical level 1-2 / seniority_band junior or mid):
//   Office     growth opportunity in current role
//   Healthcare increased responsibility, acting up, training others
//   Education  more responsibility, mentoring a colleague, leading a
//              small project
//
// Returns the typed shape:
//   {
//     component_id: 'strategic-thinking',
//     title: string (8-12 words, role-specific),
//     scenario_text: string (3-6 sentences, role-and-seniority-aware),
//     evaluation_questions: [{ id, prompt }] (2-3 questions),
//     role_context_summary: string (one-line role context the report
//                                   will surface alongside the score)
//   }
// Returns null on any failure; the assessment still creates without
// the component and the candidate flow gracefully skips the screen.

import {
  deriveSeniority,
  shellComplianceLanguage,
  roleContextLine,
} from './_shared.js'

const MODEL = 'claude-haiku-4-5-20251001'
const MAX_TOKENS = 2500

function buildPrompt({ role_profile, shell_family, scenario_context, roleTitle, canonical_level, role_level }) {
  const seniority = deriveSeniority({ role_profile, canonical_level, role_level })
  const compliance = shellComplianceLanguage(shell_family)
  const context = roleContextLine({ role_profile, roleTitle })
  const spine = scenario_context?.spine ? `Existing scenario spine: ${scenario_context.spine}` : ''

  const seniorFraming = `Senior-tier framing. The candidate is being assessed for a leadership or management role. Generate a scenario that exercises strategic thinking at the level the role actually demands. ${
    shell_family === 'healthcare'
      ? 'Healthcare scenarios sit at service redesign, governance pressure, regulatory engagement, capacity planning, MDT coordination across teams, or board-level engagement with ICBs/CQC.'
      : shell_family === 'education'
        ? 'Education scenarios sit at curriculum strategy, OFSTED preparation, MAT-wide decisions, governance challenges, school improvement planning, or stakeholder management with the local authority and parents.'
        : 'Office scenarios sit at market positioning, organisational change, board preparation, regulatory or investor engagement, or competing strategic trade-offs.'
  } Frame as a real situation a senior practitioner would recognise: a board paper landing tomorrow, a regulator visit announced, a competitor move, a capacity decision under pressure.`

  const juniorFraming = `Junior-to-mid framing. The candidate is being assessed for an individual contributor or experienced delivery role, NOT a leadership role. Do not write a senior strategy scenario. Frame the component as decision-making capacity and growth potential. ${
    shell_family === 'healthcare'
      ? 'Healthcare scenarios test how the candidate would handle increased responsibility within scope: acting as the senior on shift, training a new colleague, being asked to step up during a busy period, supporting a less experienced peer through a difficult shift.'
      : shell_family === 'education'
        ? 'Education scenarios test how the candidate would take on more responsibility: mentoring a new colleague, leading a small project, supporting a struggling pupil group, taking the lead on a parent meeting they would normally observe.'
        : 'Office scenarios test how the candidate would respond to a clear growth opportunity in their current role: a chance to lead a project, take on a stretch piece of work, or own a piece of cross-team coordination they would normally observe.'
  }`

  const framing = seniority === 'senior' ? seniorFraming : juniorFraming

  const questionGuidance = seniority === 'senior'
    ? `Generate 3 evaluation questions. Each tests a different facet of strategic thinking: (a) what the candidate sees as the dominant pattern, (b) what trade-off they would accept and why, (c) how they would communicate the decision to the relevant stakeholder group.`
    : `Generate 2 evaluation questions. Each tests a different facet of growth thinking: (a) how they would weigh the opportunity against their current commitments, (b) what they would do to set themselves up for success in the new responsibility.`

  return `You are generating a Strategic Thinking Evaluation component for a Strategy-Fit assessment. Output JSON only. UK English. No emoji. No em dashes.

Role context for this generation:
${context}
${spine}

${framing}

${questionGuidance}

${compliance}

Output schema:
{
  "component_id": "strategic-thinking",
  "title": "string (8-12 words, role-specific, names the situation, e.g. 'Year 11 results published, governing body Friday' or 'Q3 board paper, regulator query landed Friday')",
  "scenario_text": "string (3-6 sentences in the candidate's voice or in third person describing the situation. Concrete: name the time, the people involved by role, the constraint, the deadline. Anonymised: no real organisations, no real schools, no real patient names. ${shell_family === 'healthcare' ? 'Use placeholder language for clinical references (the planned anti-infective, current medication regime).' : shell_family === 'education' ? 'Use anonymised pupil references (Pupil A, Year 4 group) and never name a real school.' : ''})",
  "evaluation_questions": [
    {
      "id": "q1",
      "prompt": "string (one sentence, asks the candidate to write what they would do or what they see, focused on the facet named in the question guidance above)"
    }
  ],
  "role_context_summary": "string (one short sentence to surface alongside the score on the report, naming the seniority framing that was used: '${seniority === 'senior' ? 'Senior strategic thinking scenario' : 'Growth and decision-making scenario at IC level'}')"
}`
}

function parseJson(text) {
  if (!text || typeof text !== 'string') return null
  const cleaned = text.replace(/[—–]/g, ', ')
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (!match) return null
  try { return JSON.parse(match[0]) } catch { return null }
}

function normalise(raw, seniorityFraming) {
  if (!raw || typeof raw !== 'object') return null
  const safeStr = (v) => typeof v === 'string' ? v.trim() : ''
  const title = safeStr(raw.title)
  const scenario_text = safeStr(raw.scenario_text)
  if (!scenario_text || scenario_text.length < 80) return null
  const questions = Array.isArray(raw.evaluation_questions) ? raw.evaluation_questions : []
  const evaluation_questions = questions.slice(0, 3).map((q, i) => ({
    id: typeof q?.id === 'string' && q.id ? q.id : `q${i + 1}`,
    prompt: safeStr(q?.prompt),
  })).filter(q => q.prompt)
  if (evaluation_questions.length < 2) return null
  return {
    component_id: 'strategic-thinking',
    title: title || 'Strategic Thinking Evaluation',
    scenario_text,
    evaluation_questions,
    role_context_summary: safeStr(raw.role_context_summary)
      || (seniorityFraming === 'senior'
        ? 'Senior strategic thinking scenario'
        : 'Growth and decision-making scenario at IC level'),
    seniority_framing: seniorityFraming,
    generated_at: new Date().toISOString(),
  }
}

export async function generateStrategicThinking(client, {
  role_profile,
  shell_family,
  scenario_context,
  roleTitle,
  canonical_level,
  role_level,
} = {}) {
  if (!client) return null
  const seniority = deriveSeniority({ role_profile, canonical_level, role_level })
  const prompt = buildPrompt({
    role_profile,
    shell_family,
    scenario_context,
    roleTitle,
    canonical_level,
    role_level,
  })

  let stream
  try {
    stream = client.messages.stream({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }],
    })
  } catch (err) {
    console.error('[strategic-thinking] stream init failed', err?.message)
    return null
  }
  let final
  try {
    final = await stream.finalMessage()
  } catch (err) {
    console.error('[strategic-thinking] stream completion failed', err?.message)
    return null
  }
  const text = final?.content?.[0]?.text || ''
  const raw = parseJson(text)
  return normalise(raw, seniority)
}

import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase-server'

// Supabase migrations required:
// ALTER TABLE results ADD COLUMN IF NOT EXISTS integrity JSONB;
// ALTER TABLE results ADD COLUMN IF NOT EXISTS pressure_fit_score INTEGER;
// ALTER TABLE results ADD COLUMN IF NOT EXISTS pressure_fit JSONB;

export async function scoreCandidate(candidateId) {
  console.log('[score] Starting scoring for candidate:', candidateId)
  const adminClient = createServiceClient()

  // Get candidate with assessment
  console.log('[score] Fetching candidate...')
  const { data: candidate, error: candError } = await adminClient
    .from('candidates')
    .select('*, assessments(role_title, job_description, scenarios, skill_weights)')
    .eq('id', candidateId)
    .single()

  if (candError || !candidate) {
    console.error('[score] Candidate fetch failed:', candError?.message)
    throw new Error('Candidate not found')
  }
  console.log('[score] Candidate found:', candidate.name, '| Role:', candidate.assessments?.role_title)

  // Guard against double-scoring
  const { data: existingResult } = await adminClient
    .from('results')
    .select('id')
    .eq('candidate_id', candidateId)
    .maybeSingle()

  if (existingResult) {
    console.log('[score] Already scored, skipping.')
    return { alreadyScored: true }
  }

  // Get responses (including time_taken_seconds)
  console.log('[score] Fetching responses...')
  const { data: responses, error: respError } = await adminClient
    .from('responses')
    .select('*')
    .eq('candidate_id', candidateId)
    .order('scenario_index', { ascending: true })

  if (respError || !responses || responses.length === 0) {
    console.error('[score] Responses fetch failed:', respError?.message, '| count:', responses?.length)
    throw new Error('No responses found for candidate')
  }
  console.log('[score] Responses fetched:', responses.length)

  const assessment = candidate.assessments
  const scenarios = assessment.scenarios || []

  // ── Timing helpers ──────────────────────────────────────────────────────────

  function fmtSecs(s) {
    if (!s) return 'not recorded'
    const m = Math.floor(s / 60)
    const sec = s % 60
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`
  }
  function timeFlag(s) {
    if (!s) return ' [timing not recorded]'
    if (s < 90)   return ' [⚠ RUSHED — under 90 seconds]'
    if (s < 180)  return ' [FAST — under 3 minutes]'
    if (s > 1200) return ' [EXTENDED — over 20 minutes]'
    return ' [Normal]'
  }

  // ── Build scenario blocks with timing ───────────────────────────────────────

  const scenarioSections = scenarios.map((sc, i) => {
    const resp = responses.find(r => r.scenario_index === i)
    const secs = resp?.time_taken_seconds ?? null
    return `SCENARIO ${i + 1}: ${sc.title}
Time spent: ${fmtSecs(secs)}${timeFlag(secs)}
Context: ${sc.context}
Task: ${sc.task}
Candidate's response:
${resp ? resp.response_text : '[No response provided]'}`
  }).join('\n\n---\n\n')

  // ── Timing summary line for context ─────────────────────────────────────────

  const timingSummary = scenarios.map((sc, i) => {
    const resp = responses.find(r => r.scenario_index === i)
    const secs = resp?.time_taken_seconds ?? null
    return `Scenario ${i + 1}: ${fmtSecs(secs)}${timeFlag(secs)}`
  }).join(' | ')

  const skillWeights = assessment.skill_weights || {
    Communication: 25, 'Problem solving': 25, Prioritisation: 25, Leadership: 25
  }
  const skillNames = Object.keys(skillWeights)

  // ── Determine role emphasis from JD ─────────────────────────────────────────

  const jdLower = (assessment.job_description || '').toLowerCase()
  const isClientFacing = /client|customer|stakeholder|relationship|account|partner/.test(jdLower)
  const isDataHeavy = /data|analys|report|metric|kpi|insight|excel|sql|dashboard/.test(jdLower)
  const isLeadershipRole = /manag|lead|director|head of|team lead|supervise/.test(jdLower)

  const roleEmphasis = [
    isClientFacing  && 'This is a client-facing role — weight communication and relationship management more heavily in your qualitative assessment.',
    isDataHeavy     && 'This role requires strong analytical skills — weight problem solving and precision of thought more heavily.',
    isLeadershipRole && 'This is a leadership role — weight prioritisation and people management signals more heavily.',
  ].filter(Boolean).join(' ') || 'Apply balanced weighting across all skills as indicated by the skill weights.'

  // ── Seniority detection ──────────────────────────────────────────────────────

  const seniorityTier = (() => {
    if (/\b(director|head of|vp|vice president|chief|cto|cfo|coo|ceo)\b/.test(jdLower)) return 'director'
    if (/\b(junior|associate|assistant|entry.?level|graduate|trainee|intern|apprentice)\b/.test(jdLower)) return 'junior'
    if (/\b(senior|sr\.|principal|staff engineer|lead)\b/.test(jdLower)) return 'senior'
    return 'mid'
  })()

  const seniorityContext = {
    director: `This is a Director or Head-of-level role. Expect strategic thinking, not just tactical execution. Strong candidates at this level consider organisational implications, not just individual tasks. They delegate rather than doing everything themselves. They demonstrate awareness of commercial and political context. Penalise responses that are overly task-focused or that describe executing work a Director would delegate. Set the bar for Decision Speed, Commercial Awareness, and strategic framing higher than you would for a mid-level role.`,
    senior:   `This is a Senior-level role. Expect autonomous decision-making, the ability to navigate ambiguity, and ownership without needing permission. Candidates should balance quality and speed pragmatically and show they can lead their own work stream. The bar for Ownership, Prioritisation, and Problem Solving should reflect meaningful professional experience.`,
    junior:   `This is a Junior or entry-level role. Do not penalise for lack of strategic depth or delegation instincts — that is not expected. Assess whether the candidate shows willingness to learn, appropriate escalation behaviour (knowing when to ask for help), attention to process, and a positive attitude toward challenge. Reward honest acknowledgement of uncertainty and correct use of escalation. The bar for raw knowledge is lower; the bar for work ethic, curiosity, and attitude is higher.`,
    mid:      `This is a mid-level role. Expect a candidate who can independently own their workload, communicate clearly, and handle everyday challenges without escalation. They should show initiative without overstepping. Calibrate to a professional with 2–5 years of relevant experience.`,
  }[seniorityTier]

  // ── Shared context block (used in both API calls) ───────────────────────────

  const context = `ROLE: ${assessment.role_title}
SENIORITY: ${seniorityContext}
ROLE EMPHASIS: ${roleEmphasis}
TIMING OVERVIEW: ${timingSummary}

EQUALITY ACT 2010: Never penalise spelling, grammar, or writing style. Score decisions, actions, and reasoning only.

CANDIDATE RESPONSES:
${scenarioSections}`

  const apiKey = process.env.ANTHROPIC_API_KEY
  console.log('[score] Calling Anthropic API... key present:', !!apiKey, '| key prefix:', apiKey?.slice(0, 16))
  const anthropic = new Anthropic({ apiKey })

  // ── CALL 1: Scores only — tiny JSON, numbers and enums only ─────────────────

  const scoresPrompt = `You are a talent assessment specialist. A candidate has completed 4 work simulation scenarios for the role of ${assessment.role_title}.

${context}

Score the candidate on each skill 0–100. Most candidates score 55–80. Do not inflate.
Skill weights: ${JSON.stringify(skillWeights)}
Overall score = weighted average of skill scores.

Also score these 4 pressure dimensions 0–100:
- decision_speed_quality: Did they make clear committed decisions or hedge?
- composure_under_conflict: Did they stay calm and professional in difficult conversations?
- prioritisation_under_load: Did they use a clear framework when demands competed?
- ownership_accountability: Did they use "I will" language and own outcomes?

pressure_fit_score = average of the 4 dimension scores (rounded).

Return ONLY this exact JSON. No markdown. No explanation. No extra fields. Numbers only in numeric fields.

{
  "overall_score": 72,
  "scores": { ${skillNames.map(s => `"${s}": 70`).join(', ')} },
  "risk_level": "Low",
  "percentile": "Top 30%",
  "response_quality": "Genuine",
  "consistency_rating": "High",
  "pressure_fit_score": 74,
  "pf_decision_speed_quality": 75,
  "pf_decision_speed_quality_verdict": "Adequate",
  "pf_composure_under_conflict": 65,
  "pf_composure_under_conflict_verdict": "Adequate",
  "pf_prioritisation_under_load": 70,
  "pf_prioritisation_under_load_verdict": "Adequate",
  "pf_ownership_accountability": 78,
  "pf_ownership_accountability_verdict": "Strength"
}`

  console.log('[score] Call 1: scores JSON...')
  let scoresMsg
  try {
    scoresMsg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      messages: [{ role: 'user', content: scoresPrompt }],
    })
  } catch (apiErr) {
    console.error('[score] Call 1 API error:', apiErr?.message, apiErr?.status)
    throw apiErr
  }

  const scoresRaw = scoresMsg.content[0].text.trim()
  console.log('[score] Call 1 raw:', scoresRaw.slice(0, 300))

  let scores
  try {
    const s = scoresRaw.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim()
    const first = s.indexOf('{'), last = s.lastIndexOf('}')
    scores = JSON.parse(first !== -1 ? s.slice(first, last + 1) : s)
    console.log('[score] Call 1 parsed. Score:', scores.overall_score)
  } catch (e) {
    console.error('[score] Call 1 parse failed:', e?.message, '| raw:', scoresRaw)
    throw new Error('Scores JSON parse failed: ' + e.message)
  }

  // ── CALL 2: Narratives as plain text — no JSON at all ───────────────────────

  const narrativesPrompt = `You are a senior talent assessment specialist writing a professional hiring report.

${context}

The candidate scored ${scores.overall_score}/100 overall. Skill scores: ${Object.entries(scores.scores).map(([k,v]) => `${k}: ${v}`).join(', ')}.
Risk level: ${scores.risk_level}. Response quality: ${scores.response_quality}.

Write the following sections. Use the exact headers shown. Plain text only — no JSON, no bullet symbols, no markdown formatting.

## AI SUMMARY
Write exactly 4 paragraphs separated by blank lines (minimum 80 words each). UK English, no HR jargon.
Paragraph 1: Overall profile and standout qualities with specific evidence.
Paragraph 2: Key scenarios that reveal who this candidate is and their likely first-90-days behaviour.
Paragraph 3: Honest concerns and gaps. Seniority fit.
Paragraph 4: Hiring recommendation — use exactly one of: Strong hire / Hire with structured onboarding / Proceed with caution — specific risks identified / Not recommended at this stage.

## RISK REASON
One sentence explaining the risk level.

## SCORE NARRATIVES
Write one entry per skill. Use the format:
SKILL: [skill name]
[2-3 sentences including a direct quote from the candidate]

## STRENGTHS
Write 2-4 strengths. Use the format:
STRENGTH: [specific demonstrated capability]
EVIDENCE: [verbatim quote or direct reference]

## WATCH-OUTS
Write 1-4 watch-outs where genuine evidence exists. Use the format:
WATCHOUT: [specific concern]
EVIDENCE: [verbatim quote or reference]
SEVERITY: [High / Medium / Low]
ACTION: [specific practical step for weeks 1-4]

## ONBOARDING PLAN
Write 5-7 week-specific actions tied to this candidate's gaps. One per line, starting with the week label.

## INTERVIEW QUESTIONS
Write exactly 4 questions probing specific gaps. One per line, numbered. Include follow-up probe in brackets.

## PRESSURE FIT NARRATIVES
Write one entry per dimension. Use the format:
DIMENSION: [dimension key]
[One paragraph quoting specific phrases and explaining what they reveal under pressure]

Dimension keys: decision_speed_quality, composure_under_conflict, prioritisation_under_load, ownership_accountability

## QUALITY NOTES
One to two sentences about response authenticity with specific evidence.

## TIME ANALYSIS
One sentence per scenario: Scenario 1 (Xm Ys): Normal/Rushed/Fast/Extended. Reason.

## CONSISTENCY NOTES
One sentence about consistency across responses.`

  console.log('[score] Call 2: narratives plain text...')
  let narrativesMsg
  try {
    narrativesMsg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: narrativesPrompt }],
    })
  } catch (apiErr) {
    console.error('[score] Call 2 API error:', apiErr?.message)
    // Non-fatal — we still have scores, save with empty narratives
    narrativesMsg = null
  }

  // ── Parse plain text sections ────────────────────────────────────────────────

  function getSection(text, header) {
    const re = new RegExp(`##\\s+${header}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`, 'i')
    const m = text.match(re)
    return m ? m[1].trim() : ''
  }

  const narrativesText = narrativesMsg?.content[0]?.text || ''
  console.log('[score] Call 2 length:', narrativesText.length)

  const aiSummary = getSection(narrativesText, 'AI SUMMARY')
  const riskReason = getSection(narrativesText, 'RISK REASON')
  const qualityNotes = getSection(narrativesText, 'QUALITY NOTES')
  const timeAnalysis = getSection(narrativesText, 'TIME ANALYSIS')
  const consistencyNotes = getSection(narrativesText, 'CONSISTENCY NOTES')

  // Score narratives: SKILL: name\ntext
  // Prepend \n so the first SKILL: entry is also caught by the split
  const scoreNarratives = {}
  const scoreNarrativesRaw = getSection(narrativesText, 'SCORE NARRATIVES')
  const skillBlocks = ('\n' + scoreNarrativesRaw).split(/\nSKILL:\s+/i)
  for (const block of skillBlocks) {
    const lines = block.split('\n')
    const skillName = lines[0]?.trim()
    // Case-insensitive match against known skill names
    const matchedSkill = skillNames.find(s => s.toLowerCase() === skillName?.toLowerCase())
    if (matchedSkill) {
      scoreNarratives[matchedSkill] = lines.slice(1).join('\n').trim()
    }
  }

  // Strengths: STRENGTH: title\nEVIDENCE: text
  const strengths = []
  const strengthsRaw = getSection(narrativesText, 'STRENGTHS')
  const strengthBlocks = strengthsRaw.split(/\nSTRENGTH:\s+/i).filter(Boolean)
  for (const block of strengthBlocks) {
    const lines = block.split('\n')
    const text = lines[0]?.trim()
    const evidenceLine = lines.find(l => /^EVIDENCE:/i.test(l))
    const evidence = evidenceLine?.replace(/^EVIDENCE:\s*/i, '').trim() || ''
    if (text) strengths.push({ text, evidence })
  }

  // Watch-outs: WATCHOUT / EVIDENCE / SEVERITY / ACTION
  const watchouts = []
  const watchoutsRaw = getSection(narrativesText, 'WATCH-OUTS')
  const watchoutBlocks = watchoutsRaw.split(/\nWATCHOUT:\s+/i).filter(Boolean)
  for (const block of watchoutBlocks) {
    const lines = block.split('\n')
    const text = lines[0]?.trim()
    const evidenceLine = lines.find(l => /^EVIDENCE:/i.test(l))
    const severityLine = lines.find(l => /^SEVERITY:/i.test(l))
    const actionLine = lines.find(l => /^ACTION:/i.test(l))
    if (text) watchouts.push({
      text,
      evidence: evidenceLine?.replace(/^EVIDENCE:\s*/i, '').trim() || '',
      severity: severityLine?.replace(/^SEVERITY:\s*/i, '').trim() || 'Medium',
      action: actionLine?.replace(/^ACTION:\s*/i, '').trim() || '',
    })
  }

  // Onboarding plan: one item per line
  const onboardingPlan = getSection(narrativesText, 'ONBOARDING PLAN')
    .split('\n').map(l => l.trim()).filter(Boolean)

  // Interview questions: numbered lines
  const interviewQuestions = getSection(narrativesText, 'INTERVIEW QUESTIONS')
    .split('\n').map(l => l.replace(/^\d+\.\s*/, '').trim()).filter(Boolean)

  // Pressure fit narratives: DIMENSION: key\ntext
  const pfNarratives = {}
  const pfNarrativesRaw = getSection(narrativesText, 'PRESSURE FIT NARRATIVES')
  const pfBlocks = pfNarrativesRaw.split(/\nDIMENSION:\s+/i).filter(Boolean)
  for (const block of pfBlocks) {
    const lines = block.split('\n')
    const key = lines[0]?.trim()
    if (key) pfNarratives[key] = lines.slice(1).join('\n').trim()
  }

  // ── Assemble result ──────────────────────────────────────────────────────────

  const PF_KEYS = ['decision_speed_quality', 'composure_under_conflict', 'prioritisation_under_load', 'ownership_accountability']
  const pressureFit = {}
  for (const key of PF_KEYS) {
    pressureFit[key] = {
      score:    scores[`pf_${key}`] ?? null,
      verdict:  scores[`pf_${key}_verdict`] ?? null,
      narrative: pfNarratives[key] || null,
    }
  }

  const result = {
    overall_score:      scores.overall_score,
    scores:             scores.scores,
    score_narratives:   scoreNarratives,
    strengths,
    watchouts,
    ai_summary:         aiSummary,
    risk_level:         scores.risk_level,
    risk_reason:        riskReason,
    onboarding_plan:    onboardingPlan,
    interview_questions: interviewQuestions,
    percentile:         scores.percentile,
    pressure_fit_score: scores.pressure_fit_score ?? null,
    pressure_fit:       pressureFit,
    response_quality:   scores.response_quality,
    quality_notes:      qualityNotes,
    time_analysis:      timeAnalysis,
    red_flags:          [],
    consistency_rating: scores.consistency_rating,
    consistency_notes:  consistencyNotes,
  }

  console.log('[score] Result assembled. Score:', result.overall_score, '| Risk:', result.risk_level)

  // ── Insert core result ───────────────────────────────────────────────────────
  console.log('[score] Saving results to database...')
  const { error: insertError } = await adminClient.from('results').insert({
    candidate_id: candidateId,
    overall_score: result.overall_score,
    scores: result.scores,
    score_narratives: result.score_narratives,
    strengths: result.strengths,
    watchouts: result.watchouts,
    ai_summary: result.ai_summary,
    risk_level: result.risk_level,
    risk_reason: result.risk_reason,
    onboarding_plan: result.onboarding_plan,
    interview_questions: result.interview_questions,
    percentile: result.percentile,
  })

  if (insertError) {
    console.error('[score] Insert results failed:', insertError?.message, insertError)
    throw insertError
  }
  console.log('[score] Results saved successfully.')

  // Notification: scoring finished
  try {
    await adminClient.from('notifications').insert({
      user_id: candidate.user_id,
      type: 'scoring_finished',
      title: `${candidate.name}'s results are ready`,
      body: `Overall score: ${result.overall_score}/100. Risk: ${result.risk_level}.`,
      candidate_id: candidateId,
      assessment_id: candidate.assessment_id,
    })
  } catch {}

  // ── Store integrity data (requires migration: ALTER TABLE results ADD COLUMN IF NOT EXISTS integrity JSONB) ──

  try {
    await adminClient.from('results').update({
      integrity: {
        response_quality:  result.response_quality  || null,
        quality_notes:     result.quality_notes     || null,
        time_analysis:     result.time_analysis     || null,
        red_flags:         result.red_flags         || [],
        consistency_rating: result.consistency_rating || null,
        consistency_notes:  result.consistency_notes  || null,
      }
    }).eq('candidate_id', candidateId)
  } catch {
    // integrity column not yet added — run: ALTER TABLE results ADD COLUMN IF NOT EXISTS integrity JSONB;
  }

  // ── Store pressure-fit data (requires migration: see add_pressure_fit.sql) ──

  try {
    await adminClient.from('results').update({
      pressure_fit_score: result.pressure_fit_score ?? null,
      pressure_fit:       result.pressure_fit       ?? null,
    }).eq('candidate_id', candidateId)
  } catch {
    // columns not yet added — run migrations in add_pressure_fit.sql
  }

  console.log('[score] Scoring complete for candidate:', candidateId, '| Score:', result.overall_score)
  return { success: true, overall_score: result.overall_score }
}

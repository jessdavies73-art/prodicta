import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase-server'

// Supabase migrations required:
// ALTER TABLE results ADD COLUMN IF NOT EXISTS integrity JSONB;
// ALTER TABLE results ADD COLUMN IF NOT EXISTS pressure_fit_score INTEGER;
// ALTER TABLE results ADD COLUMN IF NOT EXISTS pressure_fit JSONB;
// ALTER TABLE results ADD COLUMN IF NOT EXISTS confidence_level TEXT;
// ALTER TABLE results ADD COLUMN IF NOT EXISTS seniority_fit_score INTEGER;
// ALTER TABLE results ADD COLUMN IF NOT EXISTS pass_probability INTEGER;

export async function scoreCandidate(candidateId) {
  console.log('[score] Starting scoring for candidate:', candidateId)
  const adminClient = createServiceClient()

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

  // ── Markdown stripper ────────────────────────────────────────────────────────

  function stripMd(text) {
    if (!text) return text
    return text
      .replace(/\*\*\*(.+?)\*\*\*/gs, '$1')
      .replace(/\*\*(.+?)\*\*/gs, '$1')
      .replace(/\*(.+?)\*/gs, '$1')
      .replace(/_{2}(.+?)_{2}/gs, '$1')
      .replace(/_(.+?)_/gs, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/`(.+?)`/gs, '$1')
      .trim()
  }

  // ── Timing helpers ───────────────────────────────────────────────────────────

  function fmtSecs(s) {
    if (!s) return 'not recorded'
    const m = Math.floor(s / 60)
    const sec = s % 60
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`
  }
  function timeFlag(s) {
    if (!s) return ' [timing not recorded]'
    if (s < 90)   return ' [⚠ RUSHED , under 90 seconds]'
    if (s < 180)  return ' [FAST , under 3 minutes]'
    if (s > 1200) return ' [EXTENDED , over 20 minutes]'
    return ' [Normal]'
  }

  // ── All-rushed detection ─────────────────────────────────────────────────────

  const timedSecs = scenarios.map((sc, i) => responses.find(r => r.scenario_index === i)?.time_taken_seconds ?? null)
  const allHaveTiming = timedSecs.every(t => t !== null)
  const allRushed = allHaveTiming && timedSecs.every(t => t < 90)
  if (allRushed) console.log('[score] ⚠ ALL SCENARIOS RUSHED , penalty will be applied')

  // ── Per-scenario depth analysis ──────────────────────────────────────────────

  const scenarioDepth = scenarios.map((sc, i) => {
    const resp = responses.find(r => r.scenario_index === i)
    const wc = resp?.response_text?.trim().split(/\s+/).filter(Boolean).length ?? 0
    const cap = wc < 50 ? 40 : wc < 100 ? 60 : null
    const note = wc < 50
      ? `${wc} words [⚠ UNDER 50 WORDS , MAXIMUM SCORE FOR THIS SCENARIO IS 40. Do not award higher regardless of content quality.]`
      : wc < 100
      ? `${wc} words [LIMITED DEPTH , MAXIMUM SCORE FOR THIS SCENARIO IS 60. Insufficient depth to demonstrate full competency.]`
      : wc < 200
      ? `${wc} words [ADEQUATE DEPTH , full scoring range available]`
      : `${wc} words [THOROUGH , full range available, award bonus up to +5 if content is substantive and role-specific, not padding]`
    return { index: i + 1, wc, cap, note }
  })
  const wordCounts = scenarioDepth.map(s => `Scenario ${s.index}: ${s.note}`).join('\n')

  // ── Timing summary ───────────────────────────────────────────────────────────

  const timingSummary = scenarios.map((sc, i) => {
    const resp = responses.find(r => r.scenario_index === i)
    const secs = resp?.time_taken_seconds ?? null
    return `Scenario ${i + 1}: ${fmtSecs(secs)}${timeFlag(secs)}`
  }).join(' | ')

  // ── Build scenario blocks ────────────────────────────────────────────────────

  const scenarioSections = scenarios.map((sc, i) => {
    const resp = responses.find(r => r.scenario_index === i)
    const secs = resp?.time_taken_seconds ?? null
    return `SCENARIO ${i + 1}: ${sc.title}
Time spent: ${fmtSecs(secs)}${timeFlag(secs)}
Word count: ${scenarioDepth[i].note}
Context: ${sc.context}
Task: ${sc.task}
Candidate's response:
${resp ? resp.response_text : '[No response provided]'}`
  }).join('\n\n---\n\n')

  // ── Adaptive JD keyword weighting ───────────────────────────────────────────

  const jdLower = (assessment.job_description || '').toLowerCase()
  const jdWords = jdLower.split(/\W+/).filter(Boolean)

  function countKw(words, patterns) {
    return patterns.reduce((n, p) => n + words.filter(w => w.includes(p)).length, 0)
  }

  const jdSignals = {
    communication:   countKw(jdWords, ['client', 'customer', 'stakeholder', 'relationship', 'account', 'partner', 'communicat', 'present', 'report', 'liaise', 'negotiat']),
    'problem solving': countKw(jdWords, ['analys', 'problem', 'solv', 'data', 'metric', 'kpi', 'insight', 'excel', 'sql', 'dashboard', 'research', 'investigat', 'strateg']),
    leadership:      countKw(jdWords, ['manag', 'lead', 'direct', 'head', 'supervis', 'mentor', 'coach', 'team', 'delegat', 'empower', 'develop', 'people']),
    prioritisation:  countKw(jdWords, ['priorit', 'deadline', 'deliver', 'project', 'organis', 'plan', 'schedul', 'workload', 'deadline', 'time']),
  }

  const totalSignals = Object.values(jdSignals).reduce((a, b) => a + b, 0) || 1
  const adaptiveWeightNote = Object.entries(jdSignals)
    .filter(([, n]) => n > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([dim, n]) => `${dim}: ${n} mentions (${Math.round(n / totalSignals * 100)}% of JD signals)`)
    .join(', ')

  const jdEmphasisLine = adaptiveWeightNote
    ? `JD KEYWORD ANALYSIS (use to weight qualitative interpretation): ${adaptiveWeightNote}. Skills with more JD mentions should receive proportionally higher weight when responses are ambiguous or borderline.`
    : 'JD KEYWORD ANALYSIS: No strong signals. Apply balanced skill weighting.'

  // ── Seniority detection ──────────────────────────────────────────────────────

  const seniorityTier = (() => {
    if (/\b(director|head of|vp|vice president|chief|cto|cfo|coo|ceo)\b/.test(jdLower)) return 'director'
    if (/\b(junior|associate|assistant|entry.?level|graduate|trainee|intern|apprentice)\b/.test(jdLower)) return 'junior'
    if (/\b(senior|sr\.|principal|staff engineer|lead)\b/.test(jdLower)) return 'senior'
    return 'mid'
  })()

  const seniorityContext = {
    director: `DIRECTOR/VP LEVEL , apply the strictest possible bar. Expect: vision and business impact thinking, not task execution. Risk assessment and mitigation language. Team empowerment and delegation , they should never describe doing work a direct report would do. Stakeholder and board-level communication. Commercial awareness and P&L thinking. Responses that focus on personal execution rather than organisational direction are a MAJOR RED FLAG and should score below 40 for seniority fit. If this candidate gives mid-level responses to Director-level scenarios, flag it prominently.`,
    senior:   `SENIOR/LEAD LEVEL , expect autonomous decision-making, comfort with ambiguity, and full ownership without needing permission. They should lead their own workstream, balance quality vs speed pragmatically, and show awareness of commercial and team-level impact. Penalise responses that over-escalate, ask for too much guidance, or show no awareness of the wider business context. The bar for independent thinking and strategic framing is significantly higher than mid-level.`,
    junior:   `JUNIOR/GRADUATE LEVEL , do NOT penalise for lack of strategic depth. Score generously for: willingness to learn, appropriate escalation (knowing when to ask for help rather than guessing), attention to process, positive attitude toward challenge, and intellectual curiosity. Reward honest acknowledgement of uncertainty. The bar for raw knowledge and experience is low , the bar for growth mindset, attitude, and following process correctly is high. A junior who escalates appropriately is doing exactly the right thing.`,
    mid:      `MID-LEVEL , expect independent problem solving, clear communication, and handling everyday challenges without escalation. They should show initiative without overstepping, own their workload, and communicate clearly with colleagues and stakeholders. Calibrate to a professional with 2,5 years of relevant experience who can work unsupervised on defined tasks.`,
  }[seniorityTier]

  const skillWeights = assessment.skill_weights || {
    Communication: 25, 'Problem solving': 25, Prioritisation: 25, Leadership: 25
  }
  const skillNames = Object.keys(skillWeights)

  // ── Shared context block ─────────────────────────────────────────────────────

  const context = `ROLE: ${assessment.role_title}
SENIORITY TIER: ${seniorityTier.toUpperCase()} , ${seniorityContext}
${jdEmphasisLine}
TIMING OVERVIEW: ${timingSummary}
RESPONSE DEPTH:
${wordCounts}

EQUALITY ACT 2010: Never penalise spelling, grammar, or writing style. Score decisions, actions, and reasoning only.

CANDIDATE RESPONSES:
${scenarioSections}`

  const apiKey = process.env.ANTHROPIC_API_KEY
  console.log('[score] Calling Anthropic API... key present:', !!apiKey, '| key prefix:', apiKey?.slice(0, 16))
  const anthropic = new Anthropic({ apiKey })

  // ── CALL 1: Scores only , tight JSON, numbers and enums ─────────────────────

  const scoresPrompt = `You are a senior talent assessment specialist scoring a candidate for the role of ${assessment.role_title}.

${context}

═══════════════════════════════════════════
SCORING PHILOSOPHY , READ EVERY LINE
═══════════════════════════════════════════

CALIBRATION , use the FULL 0,100 range. These thresholds are absolute:
- 0,29:  Completely unsuitable. Did not engage meaningfully. Responses show no understanding of the role.
- 30,49: Significant concerns. Generic, vague, or passive responses. Not recommended without major reservations.
- 50,64: Below average. Some effort, but gaps are significant. Proceed with caution, structured support needed.
- 65,74: Average. Competent but unremarkable. Would need guidance and monitoring.
- 75,84: Good. Clear role-specific thinking, structured approach, genuine engagement. Hire with confidence.
- 85,94: Excellent. Stands out clearly. Strong hire.
- 95,100: Exceptional. Rare. Would impress a senior hiring panel.

DO NOT cluster scores in the 60,75 band. If you are uncertain whether a candidate is average or good, the RESPONSE DEPTH and SPECIFICITY rules below should resolve it.

═══════════════════════════════════════════
SCORING RULES
═══════════════════════════════════════════

RULE 1 , RESPONSE DEPTH CAPS (non-negotiable):
Each scenario has a word count noted above. Apply these caps per-scenario before averaging:
- Under 50 words: maximum 40 for that scenario's contribution. Insufficient engagement.
- 50,99 words: maximum 60. Too brief to demonstrate real competency.
- 100,199 words: full range available.
- 200+ words: full range available. Award up to +5 bonus if content is substantive and role-specific , penalise if it is padding or repetition.

RULE 2 , SPECIFICITY SCORING:
Reward candidates who use specific names, numbers, timescales, tools, or scenario details.
- "I would call the client by 3pm to discuss the invoice discrepancy" scores HIGHER than "I would contact the client"
- "I would use an impact/urgency matrix, placing X in the top-right quadrant" scores HIGHER than "I would prioritise by urgency"
- "I would escalate to my line manager within 24 hours" scores HIGHER than "I would let someone know"
A candidate who references specific scenario details shows they read carefully and think concretely. Reward this.

RULE 3 , ACTIONABLE vs PASSIVE LANGUAGE:
Actively scan every response for ownership signals. Score ownership_accountability accordingly:
- HIGH OWNERSHIP: "I will", "My first step is", "I would immediately", "I take responsibility for", "I own this"
- LOW OWNERSHIP: "Someone should", "It might be worth", "Perhaps we could", "The team needs to", "Management should consider"
If every response uses passive or diffuse language, ownership_accountability must score below 50.

RULE 4 , SENIORITY MISMATCH PENALTY:
Compare every response against the seniority context above. If a Director-level candidate gives junior-level answers (task execution focus, no delegation, no strategic thinking), seniority_fit_score must be below 30 and this must be noted in the risk_level. If a junior gives senior-level answers, reward it but note the positive signal.

RULE 5 , GENUINE INSIGHT DETECTION:
Reward candidates who demonstrate they understand the realities of this specific role:
- Correct use of industry-specific terminology
- Awareness of real challenges in this type of role
- Solutions that reflect practical experience rather than textbook answers
- Reference to relevant processes, tools, or frameworks
A candidate who shows they know what the job actually involves day-to-day should score higher than one who gives technically correct but obviously inexperienced answers.

RULE 6 , CROSS-SCENARIO PATTERNS:
You must assess patterns across ALL responses, not each scenario in isolation:
- Does the candidate always escalate rather than solve? Flag as "over-reliance on escalation"
- Do they always focus on people but ignore commercial impact? Flag as "commercial awareness gap"
- Do they always jump to action without asking clarifying questions? Flag as "acts without due diligence"
- Do they always hedge and never commit to a decision? Flag as "decision avoidance"
Return the single most significant pattern you detected (or "No dominant pattern detected") in the cross_scenario_pattern field.

RULE 7 , TRAJECTORY:
Assess whether quality improves, stays stable, or declines across scenarios 1 to ${scenarios.length}.
- "Improving": noticeably better in later scenarios , candidate grew into the assessment
- "Stable": consistent quality throughout
- "Declining": quality drops in later scenarios , potential fatigue or disengagement

═══════════════════════════════════════════
SCORING STEPS
═══════════════════════════════════════════

STEP 1: Score each skill 0,100, applying depth caps and specificity rules above.
Skill weights (for composite calculation): ${JSON.stringify(skillWeights)}

STEP 2: Score each pressure-fit dimension 0,100 using the full range:
- decision_speed_quality: Clear, committed decisions vs endless hedging and caveats
- composure_under_conflict: Calm and constructive under pressure vs emotional or avoidant
- prioritisation_under_load: Structured framework vs reactive ad-hoc responses
- ownership_accountability: "I will" decisive language vs passive diffuse language (see RULE 3)

STEP 3: seniority_fit_score 0,100. Strict comparison against seniority tier above.

STEP 4: response_quality assessment:
- "Genuine": Specific, personal, scenario-referenced, varied in structure
- "Likely Genuine": Mostly specific with some generic phrasing
- "Possibly AI-Assisted": Overly structured, formal, no personal voice, suspiciously comprehensive
- "Suspicious": Identical structure across responses, no personal voice, reads like a template

STEP 5: Composite calculation:
skills_weighted_avg = weighted average using the weights above
integrity_score = 100 (Genuine) / 80 (Likely Genuine) / 50 (Possibly AI-Assisted) / 20 (Suspicious)
pressure_fit_score = average of the 4 pressure-fit dimensions
overall_score = round((skills_weighted_avg × 0.40) + (pressure_fit_score × 0.30) + (seniority_fit_score × 0.15) + (integrity_score × 0.15))

Return ONLY the JSON below. No markdown. No explanation. No extra fields.

{
  "overall_score": 62,
  "scores": { ${skillNames.map(s => `"${s}": 60`).join(', ')} },
  "seniority_fit_score": 65,
  "risk_level": "Medium",
  "percentile": "Top 50%",
  "response_quality": "Genuine",
  "consistency_rating": "Medium",
  "confidence_level": "High",
  "trajectory": "Stable",
  "cross_scenario_pattern": "No dominant pattern detected",
  "pressure_fit_score": 58,
  "pf_decision_speed_quality": 55,
  "pf_decision_speed_quality_verdict": "Developing",
  "pf_composure_under_conflict": 60,
  "pf_composure_under_conflict_verdict": "Adequate",
  "pf_prioritisation_under_load": 58,
  "pf_prioritisation_under_load_verdict": "Developing",
  "pf_ownership_accountability": 60,
  "pf_ownership_accountability_verdict": "Adequate"
}

confidence_level: "High" if responses are long/specific enough to assess reliably. "Medium" if some are short or vague. "Low" if any are under 50 words.
consistency_rating: "High" = consistent quality. "Medium" = one scenario notably weaker. "Low" = significant quality drop in later scenarios.
risk_level: "Very Low" (85+), "Low" (70,84), "Medium" (55,69), "High" (40,54), "Very High" (below 40).
percentile: "Top 10%", "Top 20%", "Top 30%", "Top 40%", "Top 50%", "Bottom 50%".
trajectory: "Improving", "Stable", or "Declining".
cross_scenario_pattern: single sentence describing the dominant cross-scenario pattern, or "No dominant pattern detected".`

  console.log('[score] Call 1: scores JSON...')
  let scoresMsg
  try {
    scoresMsg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 700,
      messages: [{ role: 'user', content: scoresPrompt }],
    })
  } catch (apiErr) {
    console.error('[score] Call 1 API error:', apiErr?.message, apiErr?.status)
    throw apiErr
  }

  const scoresRaw = scoresMsg.content[0].text.trim()
  console.log('[score] Call 1 raw:', scoresRaw.slice(0, 400))

  let scores
  try {
    const s = scoresRaw.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim()
    const first = s.indexOf('{'), last = s.lastIndexOf('}')
    scores = JSON.parse(first !== -1 ? s.slice(first, last + 1) : s)
    console.log('[score] Call 1 parsed. Score:', scores.overall_score, '| Trajectory:', scores.trajectory)
  } catch (e) {
    console.error('[score] Call 1 parse failed:', e?.message, '| raw:', scoresRaw)
    throw new Error('Scores JSON parse failed: ' + e.message)
  }

  // ── Compute pass_probability ─────────────────────────────────────────────────

  const consistencyFactor = scores.consistency_rating === 'High' ? 100 : scores.consistency_rating === 'Medium' ? 65 : 35
  const responseQualityFactor = scores.response_quality === 'Genuine' ? 100 : scores.response_quality === 'Likely Genuine' ? 80 : scores.response_quality === 'Possibly AI-Assisted' ? 50 : 20
  const passProbabilityRaw = Math.round(
    (scores.overall_score * 0.4) +
    ((scores.pressure_fit_score ?? 50) * 0.3) +
    (consistencyFactor * 0.15) +
    (responseQualityFactor * 0.15)
  )

  // All-rushed penalty: -10 to overall, cap pass_probability at 60
  const rushedPenalty = allRushed ? 10 : 0
  const finalOverallScore = Math.max(0, scores.overall_score - rushedPenalty)
  const finalPassProbability = allRushed ? Math.min(passProbabilityRaw, 60) : passProbabilityRaw
  const rushedFlag = allRushed
    ? 'All scenarios completed under 90 seconds , responses are likely too brief to be reliable. Score reduced by 10 points.'
    : null

  console.log('[score] pass_probability:', finalPassProbability, '| allRushed:', allRushed, '| trajectory:', scores.trajectory, '| pattern:', scores.cross_scenario_pattern)

  // ── CALL 2: Narratives , plain text only ─────────────────────────────────────

  const trajectoryLine = scores.trajectory === 'Improving'
    ? 'TRAJECTORY: The candidate improved across scenarios , note this as a positive signal ("grew into the assessment") in the AI summary.'
    : scores.trajectory === 'Declining'
    ? 'TRAJECTORY: The candidate\'s quality declined across scenarios , this must appear as a watch-out explicitly labelled as a performance trajectory concern, with the specific drop noted.'
    : 'TRAJECTORY: Consistent quality across all scenarios.'

  const patternLine = scores.cross_scenario_pattern && scores.cross_scenario_pattern !== 'No dominant pattern detected'
    ? `CROSS-SCENARIO PATTERN DETECTED: ${scores.cross_scenario_pattern}. This pattern must be explicitly named and analysed in paragraph 3 of the AI summary.`
    : 'CROSS-SCENARIO PATTERN: No single dominant pattern detected.'

  const narrativesPrompt = `You are a senior talent assessment specialist writing a detailed professional hiring report for the role of ${assessment.role_title}. Hiring managers rely on this to make real, consequential decisions.

${context}

The candidate scored ${finalOverallScore}/100 overall. Skill scores: ${Object.entries(scores.scores).map(([k, v]) => `${k}: ${v}`).join(', ')}.
Risk level: ${scores.risk_level}. Response quality: ${scores.response_quality}. Seniority tier assessed: ${seniorityTier.toUpperCase()}.
${trajectoryLine}
${patternLine}

CRITICAL FORMATTING RULE: Do not use any markdown formatting whatsoever. No **bold**, no *italic*, no ### headers, no bullet symbols, no backticks. Plain prose only. The system renders formatting , markdown appears as raw characters to the reader. Never use em dashes (the -- character) in any output. Use commas or full stops instead.

Write the sections below using the exact ## HEADER markers shown. Every section must quote or directly reference specific things this candidate actually wrote.

## AI SUMMARY
Write exactly 5 paragraphs separated by blank lines. Each must be at least 80 words. UK English. No HR jargon. Be direct , name scenarios by number, quote actual phrases, describe observable behaviours.

Paragraph 1: The candidate's overall professional profile. What kind of professional are they? What are their standout qualities or defining characteristics? Give 2-3 specific examples drawn directly from their responses, quoting phrases.

Paragraph 2: What these responses reveal about how this person will actually behave in the first 90 days. Reference at least 2 specific scenarios by number and quote phrases they used. Be concrete about what you expect to see.

Paragraph 3: Honest assessment of gaps, blind spots, or underdeveloped areas. Name the cross-scenario pattern if one was detected. Where did their thinking fall short? Be candid , avoid softening language that obscures real concerns. A hiring manager needs to know what they are walking into.

Paragraph 4: Seniority fit. Does this candidate operate at the ${seniorityTier} level this role demands? Compare what they showed against what the role requires. If there is a mismatch , in either direction , explain it in concrete terms, not generalities.

Paragraph 5: Hiring recommendation , start with exactly one of: Strong hire / Hire with structured onboarding / Proceed with caution , specific risks identified / Not recommended at this stage. Then explain the recommendation in 3-4 sentences, referencing the evidence that led to it.

## RISK REASON
Write a full paragraph (minimum 60 words) explaining why this specific risk level was assigned. Reference the actual responses and behaviours that drove the assessment. Do not write a single sentence. Explain the full reasoning as if justifying it to a sceptical colleague.

## SCORE NARRATIVES
Write one entry per skill. Format:
SKILL: [skill name]
[3-4 sentences. Open with what the score reflects. Include at least one direct quote. End with what this means for performance in this role.]

## STRENGTHS
Write exactly 3-5 strengths. Each must be a genuine standout backed by direct evidence , not generic praise. Format:
STRENGTH: [specific demonstrated capability , precise, not generic]
EXPLANATION: [40-60 words. Exactly what the candidate did or said. Name the scenario. Be specific.]
EVIDENCE: [A direct verbatim quote from their response]

## WATCH-OUTS
Write exactly 2-4 watch-outs. Only genuine concerns with direct evidence. If trajectory is declining, include it here. Format:
WATCHOUT: [specific concern , name the behaviour or gap precisely]
EXPLANATION: [40-60 words. What they did or failed to do, which scenario, why it matters for this role.]
EVIDENCE: [Direct verbatim quote or specific reference]
SEVERITY: [High / Medium / Low]
ACTION: [Specific, practical step for the employer in the first 4 weeks. Reference the gap directly. Not generic advice.]

## ONBOARDING PLAN
Write exactly 6 structured week entries. Stop at Week 6. Do not write Week 7 or beyond. Each entry must use the EXACT format below. This must read like HR documentation a line manager can follow from day one. Every activity must be tied to THIS candidate's specific assessed gaps , no generic filler.

WEEK: [1,6]
TITLE: [Short descriptive title for this week, e.g. "Safety Orientation and Shadow Work"]
OBJECTIVE: [One clear sentence stating what this candidate must achieve by the end of this week, directly addressing their assessed gaps.]
ACTIVITY: [First specific activity , name the task, who runs it, and what aspect of their assessed gap it addresses.]
ACTIVITY: [Second specific activity , different from the first, targeting a different identified gap or the next step in the same one.]
ACTIVITY: [Third specific activity , preferred for all weeks. If only two are needed, still write a third that consolidates learning.]
CHECKPOINT: [One measurable, observable outcome the manager can verify. Must be specific , not "understands X" but "can demonstrate X without prompting" or "has completed Y with no errors".]
INVOLVES: [Comma-separated list of who is responsible or present: e.g. Line manager, HR business partner, Assigned mentor, Team lead, Probation officer]
NOTES: [One sentence referencing relevant UK best practice , CIPD probation guidance, ERA 2025 day-one rights, statutory probation review requirements, or "N/A" if not applicable to this week.]

## INTERVIEW QUESTIONS
Generate exactly 4 interview questions. Rules:
- Each question is 2-3 sentences maximum. Write as a real hiring manager speaking in conversation, not an essay.
- Focus on the JOB ROLE, not the assessment scenarios. Ask about budgets, clients, pipelines, code, teams , whatever is relevant to this specific role.
- Reference gaps found in the assessment but frame them as practical role-based questions. Do NOT quote from the assessment responses in the questions.
- Each follow-up probe is exactly 1 sentence.
- Do NOT write essay-length questions. If a question is longer than 3 sentences, it is too long.

Format:
[number]. [Question , 2-3 sentences, practical, role-specific]
(Follow-up probe: [1 sentence])

## PRESSURE FIT NARRATIVES
All 4 dimensions are REQUIRED. Every narrative must be written regardless of data quality. Minimum 80 words per narrative. Format:
DIMENSION: [dimension key]
[Full paragraph]

Rules for every narrative:
- Quote at least one specific phrase the candidate actually wrote (in quotation marks)
- Explain what the score means practically for their day-to-day behaviour in this role
- End with exactly this structure: "In their first 90 days, this suggests they will likely [concrete behavioural prediction]."

Dimension-specific focus:
DECISION_SPEED_QUALITY: Did they commit to decisions or hedge? Look for clear next steps with timelines vs vague qualifiers ("I would probably", "I think I'd"). Did they name what they would do first and why, or stay in analysis mode?
COMPOSURE_UNDER_CONFLICT: How did they handle the difficult person in the scenario? Did they acknowledge feelings before problem-solving? Did they stay firm or cave under pressure? Did they propose a specific resolution or defer?
PRIORITISATION_UNDER_LOAD: What framework did they use? Did they explain WHY they ordered things that way, or just list them? Did they identify dependencies? Did they consider delegating anything, or try to own everything themselves?
OWNERSHIP_ACCOUNTABILITY: Count the language patterns. "I will" and "I would" vs "someone should" and "the team needs to". Did they commit to specific actions with deadlines, or describe what ought to happen in the abstract?

Dimension keys: decision_speed_quality, composure_under_conflict, prioritisation_under_load, ownership_accountability

## QUALITY NOTES
Two to three sentences on response authenticity. Reference specific signals , length, structure, specificity, tone, any patterns that suggest or contradict AI assistance.

## TIME ANALYSIS
One sentence per scenario: Scenario [N] ([time]): [Normal/Rushed/Fast/Extended] , [what this means for interpreting the response quality].

## CONSISTENCY NOTES
Two sentences. First: describe the quality pattern across scenarios. Second: what this suggests about the candidate under varying conditions or sustained effort.

## CLIENT EXPLAINER
Write exactly 4 paragraphs. This is a cover note for a recruitment agency to share with their client alongside this report. Write it as if you are the recruiter introducing the candidate to a hiring manager who has never heard of Prodicta.

Paragraph 1: One sentence only. Explain what Prodicta is. Example structure: "This report is generated by Prodicta, a work simulation platform that assesses candidates through realistic job scenarios rather than CVs or interviews."

Paragraph 2: Explain what this candidate's overall score and hiring recommendation mean in plain language. Be specific to this candidate. Name the score, name the recommendation, and explain what it means for someone hiring for this specific role. Do not write generic score definitions.

Paragraph 3: Explain the Pressure-Fit score specifically for this candidate. What did it reveal about how this person performs under real workplace pressure? What does that mean practically for a manager hiring them into this role?

Paragraph 4: State the key finding, whether a strength or a concern, and give the plain-language hiring recommendation. End with one sentence that tells the client what to do next.

Write in plain UK English. No jargon. No bullet points. No bold text. Write as a recruiter would speak to a client, not as a system generating a report.`

  console.log('[score] Call 2: narratives plain text...')
  let narrativesMsg
  try {
    narrativesMsg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      messages: [{ role: 'user', content: narrativesPrompt }],
    })
  } catch (apiErr) {
    console.error('[score] Call 2 API error:', apiErr?.message)
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
  console.log('[score] Call 2 RAW (first 2000 chars):\n', narrativesText.slice(0, 2000))

  const aiSummary      = stripMd(getSection(narrativesText, 'AI SUMMARY'))
  const riskReason     = stripMd(getSection(narrativesText, 'RISK REASON'))
  const qualityNotes   = stripMd(getSection(narrativesText, 'QUALITY NOTES'))
  const timeAnalysis   = stripMd(getSection(narrativesText, 'TIME ANALYSIS'))
  const consistencyNotes = stripMd(getSection(narrativesText, 'CONSISTENCY NOTES'))

  // Score narratives
  const scoreNarratives = {}
  const scoreNarrativesRaw = getSection(narrativesText, 'SCORE NARRATIVES')
  console.log('[score] SCORE NARRATIVES section raw:\n', scoreNarrativesRaw)
  const skillBlocks = ('\n' + scoreNarrativesRaw).split(/\nSKILL:\s+/i)
  console.log('[score] Skill blocks count:', skillBlocks.length)
  for (const block of skillBlocks) {
    const lines = block.split('\n')
    const skillName = lines[0]?.trim()
    const matchedSkill = skillNames.find(s => s.toLowerCase() === skillName?.toLowerCase())
    if (matchedSkill) {
      scoreNarratives[matchedSkill] = stripMd(lines.slice(1).join('\n').trim())
    }
  }
  console.log('[score] scoreNarratives keys:', Object.keys(scoreNarratives))

  // Strengths
  const strengths = []
  const strengthsRaw = getSection(narrativesText, 'STRENGTHS')
  const strengthBlocks = ('\n' + strengthsRaw).split(/\nSTRENGTH:\s+/i).filter(Boolean)
  for (const block of strengthBlocks) {
    const lines = block.split('\n')
    const text = stripMd(lines[0]?.trim().replace(/^STRENGTH:\s*/i, ''))
    const explanationLine = lines.find(l => /^EXPLANATION:/i.test(l))
    const explanation = stripMd(explanationLine?.replace(/^EXPLANATION:\s*/i, '').trim() || '')
    const evidenceLine = lines.find(l => /^EVIDENCE:/i.test(l))
    const evidence = stripMd(evidenceLine?.replace(/^EVIDENCE:\s*/i, '').trim() || '')
    if (text) strengths.push({ text, explanation, evidence })
  }

  // Watch-outs
  const watchouts = []
  const watchoutsRaw = getSection(narrativesText, 'WATCH-OUTS')
  const watchoutBlocks = ('\n' + watchoutsRaw).split(/\nWATCHOUT:\s+/i).filter(Boolean)
  for (const block of watchoutBlocks) {
    const lines = block.split('\n')
    const text = stripMd(lines[0]?.trim().replace(/^WATCHOUT:\s*/i, ''))
    const explanationLine = lines.find(l => /^EXPLANATION:/i.test(l))
    const explanation = stripMd(explanationLine?.replace(/^EXPLANATION:\s*/i, '').trim() || '')
    const evidenceLine = lines.find(l => /^EVIDENCE:/i.test(l))
    const severityLine = lines.find(l => /^SEVERITY:/i.test(l))
    const actionLine = lines.find(l => /^ACTION:/i.test(l))
    if (text) watchouts.push({
      text,
      explanation,
      evidence: stripMd(evidenceLine?.replace(/^EVIDENCE:\s*/i, '').trim() || ''),
      severity: severityLine?.replace(/^SEVERITY:\s*/i, '').trim() || 'Medium',
      action: stripMd(actionLine?.replace(/^ACTION:\s*/i, '').trim() || ''),
    })
  }

  // Onboarding plan , structured per-week objects
  const onboardingPlan = []
  const onboardingRaw = getSection(narrativesText, 'ONBOARDING PLAN')
  const weekBlocks = ('\n' + onboardingRaw).split(/\nWEEK:\s*/i).filter(Boolean)
  for (const block of weekBlocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean)
    const weekNum = parseInt(lines[0])
    if (!weekNum || weekNum < 1 || weekNum > 6) continue
    const getField = key => {
      const line = lines.find(l => new RegExp(`^${key}:`, 'i').test(l))
      return stripMd(line ? line.replace(new RegExp(`^${key}:\\s*`, 'i'), '').trim() : '')
    }
    const getAllFields = key => lines
      .filter(l => new RegExp(`^${key}:`, 'i').test(l))
      .map(l => stripMd(l.replace(new RegExp(`^${key}:\\s*`, 'i'), '').trim()))
      .filter(Boolean)
    const title      = getField('TITLE')
    const objective  = getField('OBJECTIVE')
    const activities = getAllFields('ACTIVITY')
    const checkpoint = getField('CHECKPOINT')
    const involvesRaw = getField('INVOLVES')
    const involves   = involvesRaw ? involvesRaw.split(/[,;]/).map(s => s.trim()).filter(Boolean) : []
    const notes      = getField('NOTES') !== 'N/A' ? getField('NOTES') : ''
    if (title || objective) onboardingPlan.push({ week: weekNum, title, objective, activities, checkpoint, involves, notes })
  }

  // Interview questions
  const interviewQuestions = getSection(narrativesText, 'INTERVIEW QUESTIONS')
    .split('\n').map(l => stripMd(l.replace(/^\d+\.\s*/, '').trim())).filter(Boolean)

  // Client explainer
  const clientExplainer = stripMd(getSection(narrativesText, 'CLIENT EXPLAINER'))

  // Pressure-fit narratives
  const pfNarratives = {}
  const pfNarrativesRaw = getSection(narrativesText, 'PRESSURE FIT NARRATIVES')
  const pfBlocks = pfNarrativesRaw.split(/\nDIMENSION:\s+/i).filter(Boolean)
  for (const block of pfBlocks) {
    const lines = block.split('\n')
    const key = lines[0]?.trim()
    if (key) pfNarratives[key] = stripMd(lines.slice(1).join('\n').trim())
  }

  // ── Assemble result ──────────────────────────────────────────────────────────

  const PF_KEYS = ['decision_speed_quality', 'composure_under_conflict', 'prioritisation_under_load', 'ownership_accountability']
  const pressureFit = {}
  for (const key of PF_KEYS) {
    pressureFit[key] = {
      score:     scores[`pf_${key}`] ?? null,
      verdict:   scores[`pf_${key}_verdict`] ?? null,
      narrative: pfNarratives[key] || null,
    }
  }

  const result = {
    overall_score:       finalOverallScore,
    scores:              scores.scores,
    score_narratives:    scoreNarratives,
    strengths,
    watchouts,
    ai_summary:          aiSummary,
    risk_level:          scores.risk_level,
    risk_reason:         riskReason,
    onboarding_plan:     onboardingPlan,
    interview_questions: interviewQuestions,
    percentile:          scores.percentile,
    pressure_fit_score:  scores.pressure_fit_score ?? null,
    pressure_fit:        pressureFit,
    response_quality:    scores.response_quality,
    quality_notes:       qualityNotes,
    time_analysis:       timeAnalysis,
    red_flags:           rushedFlag ? [rushedFlag] : [],
    consistency_rating:  scores.consistency_rating,
    consistency_notes:   consistencyNotes,
    confidence_level:    scores.confidence_level ?? null,
    seniority_fit_score: scores.seniority_fit_score ?? null,
    pass_probability:    finalPassProbability,
    trajectory:          scores.trajectory ?? null,
    cross_scenario_pattern: scores.cross_scenario_pattern ?? null,
    client_explainer:       clientExplainer || null,
  }

  console.log('[score] Result assembled. Score:', result.overall_score, '| Risk:', result.risk_level, '| PassProb:', result.pass_probability, '| Trajectory:', result.trajectory, '| RedFlags:', result.red_flags.length)

  // ── Insert core result ───────────────────────────────────────────────────────
  console.log('[score] Saving results to database...')
  const { error: insertError } = await adminClient.from('results').insert({
    candidate_id:        candidateId,
    overall_score:       result.overall_score,
    scores:              result.scores,
    score_narratives:    result.score_narratives,
    strengths:           result.strengths,
    watchouts:           result.watchouts,
    ai_summary:          result.ai_summary,
    risk_level:          result.risk_level,
    risk_reason:         result.risk_reason,
    onboarding_plan:     result.onboarding_plan,
    interview_questions: result.interview_questions,
    percentile:          result.percentile,
    confidence_level:    result.confidence_level,
    seniority_fit_score: result.seniority_fit_score,
    pass_probability:    result.pass_probability,
  })

  if (insertError) {
    console.error('[score] Insert results failed:', insertError?.message, insertError)
    throw insertError
  }
  console.log('[score] Results saved successfully.')

  // Notification
  try {
    await adminClient.from('notifications').insert({
      user_id:       candidate.user_id,
      type:          'scoring_finished',
      title:         `${candidate.name}'s results are ready`,
      body:          `Overall score: ${result.overall_score}/100. Risk: ${result.risk_level}.`,
      candidate_id:  candidateId,
      assessment_id: candidate.assessment_id,
    })
  } catch {}

  // ── Store integrity data ─────────────────────────────────────────────────────
  try {
    await adminClient.from('results').update({
      integrity: {
        response_quality:       result.response_quality    || null,
        quality_notes:          result.quality_notes       || null,
        time_analysis:          result.time_analysis       || null,
        red_flags:              result.red_flags           || [],
        consistency_rating:     result.consistency_rating  || null,
        consistency_notes:      result.consistency_notes   || null,
        trajectory:             result.trajectory          || null,
        cross_scenario_pattern: result.cross_scenario_pattern || null,
      }
    }).eq('candidate_id', candidateId)
  } catch {
    // integrity column not yet added , ALTER TABLE results ADD COLUMN IF NOT EXISTS integrity JSONB;
  }

  // ── Store pressure-fit data ──────────────────────────────────────────────────
  try {
    await adminClient.from('results').update({
      pressure_fit_score: result.pressure_fit_score ?? null,
      pressure_fit:       result.pressure_fit       ?? null,
    }).eq('candidate_id', candidateId)
  } catch {
    // columns not yet added , run migrations
  }

  console.log('[score] Scoring complete for candidate:', candidateId, '| Score:', result.overall_score)
  return { success: true, overall_score: result.overall_score }
}

import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase-server'
import { sendRedFlagAlert } from '@/lib/send-red-flag-alert'

// Supabase migrations required:
// ALTER TABLE results ADD COLUMN IF NOT EXISTS integrity JSONB;
// ALTER TABLE results ADD COLUMN IF NOT EXISTS pressure_fit_score INTEGER;
// ALTER TABLE results ADD COLUMN IF NOT EXISTS pressure_fit JSONB;
// ALTER TABLE results ADD COLUMN IF NOT EXISTS confidence_level TEXT;
// ALTER TABLE results ADD COLUMN IF NOT EXISTS seniority_fit_score INTEGER;
// ALTER TABLE results ADD COLUMN IF NOT EXISTS pass_probability INTEGER;
// ALTER TABLE results ADD COLUMN IF NOT EXISTS candidate_type TEXT;
// ALTER TABLE results ADD COLUMN IF NOT EXISTS predictions JSONB;
// ALTER TABLE results ADD COLUMN IF NOT EXISTS reality_timeline JSONB;
// ALTER TABLE results ADD COLUMN IF NOT EXISTS decision_alerts JSONB;
// ALTER TABLE results ADD COLUMN IF NOT EXISTS cv_comparison JSONB;
// ALTER TABLE results ADD COLUMN IF NOT EXISTS hiring_confidence JSONB;
// ALTER TABLE results ADD COLUMN IF NOT EXISTS coaching_plan JSONB;
// ALTER TABLE results ADD COLUMN IF NOT EXISTS tuesday_reality TEXT;
// ALTER TABLE users ADD COLUMN IF NOT EXISTS alert_threshold INTEGER DEFAULT 50;
// ALTER TABLE assessments ADD COLUMN IF NOT EXISTS context_answers JSONB;

export async function scoreCandidate(candidateId) {
  console.log('[score] Starting scoring for candidate:', candidateId)
  const adminClient = createServiceClient()

  console.log('[score] Fetching candidate...')
  const { data: candidate, error: candError } = await adminClient
    .from('candidates')
    .select('*, assessments(role_title, job_description, scenarios, skill_weights, context_answers, assessment_mode, role_level)')
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
      // Strip em dashes and en dashes (safety net in case the model ignores the prompt rule)
      .replace(/\s*[\u2014\u2013]\s*/g, ', ')
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
  // Always check the role title first. Only fall back to JD body if the title
  // gives no clear signal. This prevents "reports to the Finance Director"
  // or "supporting the CFO" in the JD body from overriding a clearly junior title.

  const titleLower = (assessment.role_title || '').toLowerCase()

  const seniorityTier = (() => {
    // Title takes priority
    if (/\b(junior|associate|assistant|entry.?level|graduate|trainee|intern|apprentice)\b/.test(titleLower)) return 'junior'
    if (/\b(director|head of|vp|vice president|chief|cto|cfo|coo|ceo)\b/.test(titleLower)) return 'director'
    if (/\b(senior|sr\.|principal|lead)\b/.test(titleLower)) return 'senior'
    // Fall back to JD body only if title is ambiguous
    if (/\b(director|head of|vp|vice president|chief|cto|cfo|coo|ceo)\b/.test(jdLower)) return 'director'
    if (/\b(junior|associate|assistant|entry.?level|graduate|trainee|intern|apprentice)\b/.test(jdLower)) return 'junior'
    if (/\b(senior|sr\.|principal|staff engineer|lead)\b/.test(jdLower)) return 'senior'
    return 'mid'
  })()

  console.log('[score] Seniority detected:', seniorityTier, '| Role title:', assessment.role_title)

  // ── Assessment mode detection ────────────────────────────────────────────────
  // Use the stored assessment_mode if present; otherwise infer from scenario count.
  const rawMode = (assessment.assessment_mode || '').toLowerCase()
  const assessmentMode = rawMode === 'quick' || rawMode === 'standard' || rawMode === 'advanced'
    ? rawMode
    : (scenarios.length <= 2 ? 'quick' : scenarios.length === 3 ? 'standard' : 'advanced')
  const modeLabel = assessmentMode === 'quick' ? 'Speed-Fit Assessment' : assessmentMode === 'standard' ? 'Depth-Fit Assessment' : 'Strategy-Fit Assessment'
  console.log('[score] Assessment mode:', assessmentMode, '| scenarios:', scenarios.length)

  const modeCalibration = ({
    quick: `═══════════════════════════════════════════
ASSESSMENT MODE: QUICK (${scenarios.length} scenarios, ~15 minutes total)
═══════════════════════════════════════════
This is a Speed-Fit Assessment, used for junior or urgent roles. Calibrate scoring as follows:

- BE MORE FORGIVING ON DEPTH AND DETAIL. Candidates only had around 15 minutes total. Do not punish them for short or undeveloped responses, as long as the basics are correct.
- FOCUS THE SCORE on three things only: can they do the basic task correctly, do they follow instructions, and do they communicate clearly. Score these well and the overall_score should reflect that.
- DO NOT PENALISE for lack of strategic thinking, complex analysis, or commercial nuance. These are not senior roles. Marking down for missing strategy is a calibration error in Speed-Fit mode.
- INTEGRITY CHECKS STILL APPLY FULLY. Even in 15 minutes, a genuine human response looks different from an AI-generated one. Look for personal voice, scenario-specific references, and natural variation in structure. Flag AI-assisted, copy-paste, or templated responses regardless of mode.
- TIMING EXPECTATIONS for Speed-Fit mode: each scenario should take 5 to 7 minutes. Under 2 minutes per scenario is suspicious. Over 10 minutes means the candidate took it seriously and should be viewed positively.`,

    standard: `═══════════════════════════════════════════
ASSESSMENT MODE: STANDARD (${scenarios.length} scenarios, ~25 to 30 minutes total)
═══════════════════════════════════════════
This is a Depth-Fit Assessment, used for most roles. Calibrate scoring as follows:

- BALANCED SCORING. Expect competent responses with some specificity. Reward role-specific reasoning, do not require deep strategic framing.
- WEIGHT EXECUTION RELIABILITY AND COMMUNICATION HIGHER than leadership when the role does not explicitly require people management.
- INTEGRITY CHECKS FULLY ACTIVE. With 3 scenarios you have enough data to detect patterns. Consistent quality across all 3 suggests genuine effort. A sharp drop in quality on the final scenario suggests fatigue or rushing and must be noted.
- TIMING EXPECTATIONS for Depth-Fit mode: 7 to 9 minutes per scenario. Under 3 minutes on any scenario is suspicious. If all 3 scenarios are completed in under 4 minutes each, flag this as an integrity concern.`,

    advanced: `═══════════════════════════════════════════
ASSESSMENT MODE: ADVANCED (${scenarios.length} scenarios, ~45 minutes total)
═══════════════════════════════════════════
This is a Strategy-Fit Assessment, used for senior roles. Calibrate scoring as follows:

- STRICTEST SCORING. Expect strategic thinking, nuanced stakeholder management, and commercial awareness. Generic competent answers should not score in the strong band. Reserve 75+ for candidates who genuinely demonstrate seniority.
- ALL SKILL DIMENSIONS WEIGHTED EQUALLY. Leadership and problem solving should be demonstrated, not just baseline competence. A senior candidate who only shows execution is underperforming.
- INTEGRITY CHECKS FULLY ACTIVE WITH EXTRA SCRUTINY. With 4 scenarios and around 45 minutes you have the most data. Look specifically for: declining quality across scenarios (separate genuine fatigue from corner-cutting), consistency of language and reasoning style across all 4 (sudden shifts in vocabulary or structure are a flag), and whether the candidate maintains depth in scenario 4 or rushes to finish.
- TIMING EXPECTATIONS for Strategy-Fit mode: 8 to 12 minutes per scenario. Under 3 minutes on any scenario is a red flag. Consistent 2-minute responses across all 4 scenarios is almost certainly AI-assisted.`,
  })[assessmentMode]

  // ── Sector-specific scoring calibration ─────────────────────────────────────
  const sectorKey = (assessment.detected_role_type || '').toLowerCase()
  const SECTOR_SCORING = {
    healthcare: `SECTOR CALIBRATION , HEALTHCARE / NHS:
- Patient safety and safeguarding are the highest-weighted dimensions. A response that overlooks a patient safety risk or safeguarding signal must be scored down hard regardless of how confident or articulate it is.
- Reward appropriate escalation to senior clinicians and accurate handover language. Penalise lone heroics, overconfidence, or improvising outside scope of practice.
- Do NOT penalise for missing commercial awareness, sales thinking, or P&L language. These dimensions are irrelevant to clinical roles. Treat "commercial awareness" as not applicable for this candidate.
- Reward calm, factual, structured communication under pressure. Penalise emotional or accusatory language toward patients, families or colleagues.`,

    social_care: `SECTOR CALIBRATION , SOCIAL CARE:
- Dignity, respect, safeguarding, and lone working judgment are the highest-weighted dimensions. Score these above task efficiency.
- Reward correct boundary setting with service users and families, and correct reporting of concerns. Penalise blurring of professional boundaries or failure to escalate safeguarding signals.
- Do NOT penalise for missing commercial awareness, KPIs, or sales language. These are irrelevant.
- Watch for clinical overreach, scoring this down. Care workers should follow process, not improvise clinical decisions.`,

    education: `SECTOR CALIBRATION , EDUCATION:
- Safeguarding children and behaviour management are the highest-weighted dimensions. A response that misses a safeguarding signal or escalates incorrectly should be scored down hard.
- Reward calm, professional communication with parents and colleagues. Reward sensible, age-appropriate behaviour management.
- Do NOT penalise for missing commercial language, P&L, or sales metrics. They are irrelevant.`,

    public_sector: `SECTOR CALIBRATION , PUBLIC SECTOR:
- Following policy and procedure, statutory deadlines and data protection are the highest-weighted dimensions. Score these above creative problem solving.
- Reward politically aware, neutral communication. Penalise off-policy improvisation.
- Do NOT penalise for missing private-sector commercial framing.`,

    trades: `SECTOR CALIBRATION , TRADES AND TECHNICAL:
- Health and safety judgment is the highest-weighted dimension. A response that compromises safety to save time must be scored down hard.
- Reward clear customer communication, sensible prioritisation across jobs, and correct fault reporting. Penalise corner cutting and unrealistic time estimates.
- Do NOT penalise for missing strategy decks or board-level framing.`,

    hospitality_retail: `SECTOR CALIBRATION , HOSPITALITY AND RETAIL:
- Customer service judgment, team management under pressure, and basic floor-level health and safety are the highest-weighted dimensions.
- Reward calm handling of complaints, sensible delegation during busy periods, and accurate cash and stock decisions. Penalise blame, defensiveness or rule-breaking under pressure.
- Do NOT penalise for missing strategic or board-level framing.`,

    technology: `SECTOR CALIBRATION , TECHNOLOGY:
- Problem solving and clear communication are the highest-weighted dimensions. Reward calm, structured debugging, sensible prioritisation of bug fixes versus feature work, and clear explanations to non-technical stakeholders.
- Reward honest estimates and proactive flagging of risk. Penalise hand-waving, vague timelines, or blaming other teams.
- Do NOT penalise for missing P&L thinking unless the role explicitly requires it.`,

    finance: `SECTOR CALIBRATION , FINANCE AND ACCOUNTING:
- Accuracy, regulatory compliance and deadline reliability are the highest-weighted dimensions. Reward careful reconciliation, clear audit trails, and willingness to flag irregularities.
- Penalise shortcuts that risk accuracy, vague handling of variances, or any sign of corner cutting under deadline pressure.
- Commercial framing matters here, but compliance and accuracy come first.`,

    marketing: `SECTOR CALIBRATION , MARKETING AND CREATIVE:
- Communication, prioritisation, and the ability to balance creative judgment with data are the highest-weighted dimensions. Reward responses that handle stakeholder feedback constructively and stay measured under deadline pressure.
- Penalise defensiveness about creative work or inability to make budget trade-offs.`,

    sales: `SECTOR CALIBRATION , SALES AND BUSINESS DEVELOPMENT:
- Communication, ownership and resilience under rejection are the highest-weighted dimensions. Reward structured pipeline thinking, honest forecasting, and calm handling of difficult clients.
- Penalise blame of marketing or product, dishonest forecasting, or unrealistic over-promising.`,

    hr: `SECTOR CALIBRATION , HR AND PEOPLE:
- Confidentiality, policy adherence, and calm handling of sensitive conversations are the highest-weighted dimensions. Reward correct process, careful documentation, and sensible escalation.
- Penalise informal shortcuts, breaches of confidentiality, or letting a line manager push the process off course.`,

    operations: `SECTOR CALIBRATION , OPERATIONS AND LOGISTICS:
- Health and safety judgment, prioritisation under disruption, and calm handling of supplier and shift issues are the highest-weighted dimensions. Reward clear contingency thinking and accurate communication to stakeholders.
- Penalise corner cutting on safety or quality to hit a deadline.`,

    charity: `SECTOR CALIBRATION , CHARITY AND NON-PROFIT:
- Safeguarding, stewardship of restricted funds, and beneficiary-centred decision making are the highest-weighted dimensions. Reward calm handling of funder pressure without compromising mission.
- Do NOT penalise for missing aggressive commercial language. Treat mission-aligned trade-offs as strengths.`,

    property_construction: `SECTOR CALIBRATION , PROPERTY AND CONSTRUCTION:
- Health and safety on site is non-negotiable and must be the highest-weighted dimension. Reward proactive risk management, clear client communication on delays, and accurate cost reporting.
- Penalise responses that compromise safety or hide budget problems from the client.`,

    admin_reception: `SECTOR CALIBRATION , ADMINISTRATION AND RECEPTION:
- Multitasking, communication clarity and reliability are the highest-weighted dimensions. Reward calm handling of simultaneous demands, accurate message taking, sensible prioritisation of small competing tasks, and consistent professionalism with visitors and callers.
- Do NOT penalise for missing leadership, strategic thinking, commercial awareness or board-level framing. These are not relevant for entry-level admin and reception roles. Treat "commercial awareness" as not applicable.
- Penalise rude, impatient or panicked language toward visitors, and any breach of basic confidentiality.`,

    legal: `SECTOR CALIBRATION , LEGAL:
- Client confidentiality, compliance, and accurate handling of deadlines are the highest-weighted dimensions.
- Reward precise, careful language and risk-aware decision making. Penalise loose language, missed deadlines, or shortcuts that could create risk.`,
  }
  const sectorCalibration = SECTOR_SCORING[sectorKey] || ''

  const universalIntegrityRules = `
UNIVERSAL INTEGRITY RULES (apply in every mode):
- Always check for AI-assisted responses regardless of mode.
- Always flag if response word count is impossibly high for the time taken (for example, 500 words in 90 seconds is not humanly plausible and must be flagged).
- Always check for generic answers that could apply to any role versus specific answers that reference scenario details.
- When you write the integrity-related narrative, name the assessment mode and adjust the language to match. For example: "For a ${modeLabel}, response times were appropriate" if timing is fine, or "For a ${modeLabel}, the consistently short response times raise concerns" if timing is suspicious.`

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

  const contextAnswersBlock = (() => {
    const ca = assessment.context_answers
    if (!ca || typeof ca !== 'object') return ''
    const lines = Object.values(ca).map(v => (typeof v === 'string' ? v.trim() : '')).filter(Boolean)
    if (lines.length === 0) return ''
    return `\nROLE CONTEXT PROVIDED BY HIRING MANAGER:\n${lines.map(l => `- ${l}`).join('\n')}\nApply this context when interpreting candidate responses. Use it to calibrate expectations for environment fit, failure modes, and success criteria.\n`
  })()

  const context = `ROLE: ${assessment.role_title}
SENIORITY TIER: ${seniorityTier.toUpperCase()} , ${seniorityContext}
${jdEmphasisLine}${contextAnswersBlock}
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

${modeCalibration}
${sectorCalibration ? '\n' + sectorCalibration + '\n' : ''}
${universalIntegrityRules}

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

STEP 2: Score each pressure-fit dimension 0,100 using the full range.

Scenario weighting for pressure-fit dimensions:
- Scenario 2 (Pressure Test) feeds ALL FOUR dimensions and must carry the most weight in your pressure-fit assessment. This is the primary pressure signal.
- Scenario 3 (Judgment Call) feeds composure_under_conflict and ownership_accountability most heavily.
- Scenario 4 (Staying Power) also feeds ALL FOUR dimensions. Crucially, disengagement, passive language, or avoidance in Scenario 4 is your strongest signal for churn_risk in PREDICTED OUTCOMES.
- Scenario 1 (Core Task) feeds decision_speed_quality and prioritisation_under_load as secondary signals only.

Dimension scoring:
- decision_speed_quality: Clear, committed decisions vs endless hedging and caveats
- composure_under_conflict: Calm and constructive under pressure vs emotional or avoidant
- prioritisation_under_load: Structured framework vs reactive ad-hoc responses
- ownership_accountability: "I will" decisive language vs passive diffuse language (see RULE 3)

STEP 3: seniority_fit_score 0,100. Strict comparison against seniority tier above.

STEP 3b: execution_reliability 0,100. Measures whether the candidate followed instructions reliably across the assessment. Score on:
- Did they follow every instruction in each task brief?
- Did they complete every part of the task or leave sections unfinished?
- Did they overcomplicate simple tasks or add scope that was not asked for?
- Were they consistent across all scenarios in the level of effort applied?
A score of 90+ means precise, complete, faithful to the brief on every scenario. 60-79 means generally reliable with one or two missed instructions. Below 50 means significant skipped sections, scope creep, or wandering off the task.

STEP 3c: training_potential 0,100. Measures developability. Score on:
- Did the candidate improve across scenarios as the assessment progressed?
- Did they show adaptability when the scenario type changed?
- Did they show willingness to learn, ask questions, or acknowledge they needed input?
- Did they show self-awareness about their own gaps?
This is a separate signal from raw capability. A junior candidate scoring 60 on capability but 85 on training_potential is a strong development hire. A senior candidate scoring 80 on capability but 40 on training_potential is a fixed performer who may not grow.

Also write a one sentence narrative for training_potential, drawn from direct evidence in the responses. Format exactly as: training_potential_narrative: "[one sentence]"

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

Return ONLY the JSON below. No markdown. No explanation. No extra fields. Never use em dash (—) or en dash (–) characters in any string value. Use commas, full stops, or rewrite the sentence instead.

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
  "pf_ownership_accountability_verdict": "Adequate",
  "execution_reliability": 65,
  "training_potential": 60,
  "training_potential_narrative": "One sentence drawn from direct evidence in their responses."
}

confidence_level: "High" if responses are long/specific enough to assess reliably. "Medium" if some are short or vague. "Low" if any are under 50 words.
consistency_rating: "High" = consistent quality. "Medium" = one scenario notably weaker. "Low" = significant quality drop in later scenarios.
risk_level: You MUST use exactly one of these four values: "Very Low" (85+), "Low" (70-84), "Medium" (55-69), "High" (below 55). No other values are permitted.
percentile: "Top 10%", "Top 20%", "Top 30%", "Top 40%", "Top 50%", "Bottom 50%".
trajectory: "Improving", "Stable", or "Declining".
cross_scenario_pattern: single sentence describing the dominant cross-scenario pattern, or "No dominant pattern detected".`

  const t0 = Date.now()
  console.log('[score] Call 1: scores JSON...')
  let scoresMsg
  try {
    scoresMsg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 700,
      messages: [{ role: 'user', content: scoresPrompt }],
    })
  } catch (apiErr) {
    console.error('[score] Call 1 API error:', apiErr?.message, apiErr?.status)
    throw apiErr
  }
  console.log('[score] Call 1 completed in', Date.now() - t0, 'ms')

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

  // ── Recalculate pressure_fit_score as average of the 4 sub-scores ────────────
  // Do not rely on Claude's self-reported average as it can differ from the
  // individual dimension scores shown in the UI.

  const pfSubKeys = [
    'pf_decision_speed_quality',
    'pf_composure_under_conflict',
    'pf_prioritisation_under_load',
    'pf_ownership_accountability',
  ]
  const pfSubScores = pfSubKeys.map(k => scores[k]).filter(v => typeof v === 'number' && !isNaN(v))
  if (pfSubScores.length === 4) {
    const pfAvg = Math.round(pfSubScores.reduce((a, b) => a + b, 0) / 4)
    console.log('[score] pressure_fit_score recalculated from sub-scores:', pfSubScores, '->', pfAvg, '(was:', scores.pressure_fit_score, ')')
    scores.pressure_fit_score = pfAvg
  } else {
    console.log('[score] pressure_fit_score: could not recalculate, only', pfSubScores.length, 'sub-scores found')
  }

  // ── Clamp execution_reliability and training_potential ──────────────────────
  const clamp01100 = v => (typeof v === 'number' && !isNaN(v)) ? Math.max(0, Math.min(100, Math.round(v))) : null
  scores.execution_reliability = clamp01100(scores.execution_reliability)
  scores.training_potential    = clamp01100(scores.training_potential)
  if (typeof scores.training_potential_narrative !== 'string') scores.training_potential_narrative = null

  // For junior and mid roles, fold execution_reliability into the overall score with weight greater than Leadership.
  // Leadership weight in the existing skills weighted average is typically 25%. We add a 15% bump from execution_reliability when seniority is junior/mid.
  const seniorityRoleText = `${assessment.role_title || ''}`.toLowerCase()
  const isSeniorRole = /\b(director|head of|vp|vice president|chief|cxo|ceo|cto|cfo|coo|senior|principal|lead|staff)\b/.test(seniorityRoleText)
  if (!isSeniorRole && typeof scores.execution_reliability === 'number') {
    const blended = Math.round((scores.overall_score * 0.85) + (scores.execution_reliability * 0.15))
    console.log('[score] execution_reliability blend (junior/mid): overall', scores.overall_score, '+ exec', scores.execution_reliability, '=>', blended)
    scores.overall_score = blended
  }

  // ── Normalise risk_level to DB-allowed values ────────────────────────────────

  const ALLOWED_RISK_LEVELS = ['Very Low', 'Low', 'Medium', 'High']
  if (!ALLOWED_RISK_LEVELS.includes(scores.risk_level)) {
    const original = scores.risk_level
    const raw = (original || '').toLowerCase()
    if (raw.includes('very low') || raw.includes('minimal') || raw.includes('negligible')) {
      scores.risk_level = 'Very Low'
    } else if (raw.includes('very high') || raw.includes('critical') || raw.includes('severe')) {
      scores.risk_level = 'High'
    } else if (raw.includes('low')) {
      scores.risk_level = 'Low'
    } else if (raw.includes('high')) {
      scores.risk_level = 'High'
    } else if (raw.includes('moderate') || raw.includes('medium') || raw.includes('mid')) {
      scores.risk_level = 'Medium'
    } else {
      scores.risk_level = 'Medium'
    }
    console.log('[score] risk_level normalised from', JSON.stringify(original), '->', scores.risk_level)
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

  // ── Compute hiring_confidence server-side ────────────────────────────────────

  const trajBonus = scores.trajectory === 'Improving' ? 5 : scores.trajectory === 'Declining' ? -8 : 0
  const hiringConfidenceScore = Math.min(100, Math.max(0, Math.round(
    (finalOverallScore * 0.40) +
    ((scores.pressure_fit_score ?? 50) * 0.25) +
    (responseQualityFactor * 0.15) +
    ((scores.seniority_fit_score ?? 50) * 0.10) +
    (consistencyFactor * 0.10) +
    trajBonus
  )))
  const hiringConfidenceExplanation = hiringConfidenceScore >= 85
    ? 'Strong evidence across all dimensions. Recommend proceeding with confidence.'
    : hiringConfidenceScore >= 70
    ? 'Clear strengths with minor addressable gaps. Hire with structured onboarding.'
    : hiringConfidenceScore >= 55
    ? 'Mixed signals or one significant concern. Caution advised and clear probation criteria needed.'
    : hiringConfidenceScore >= 40
    ? 'Notable gaps or integrity issues. Additional interviews strongly recommended.'
    : 'Significant concerns across multiple dimensions. Not recommended at this stage.'
  const hiringConfidence = { score: hiringConfidenceScore, explanation: hiringConfidenceExplanation }
  console.log('[score] hiring_confidence (server-computed):', hiringConfidence)

  // ── CALL 2a + 2b: Narratives split into parallel calls ──────────────────────

  const trajectoryLine = scores.trajectory === 'Improving'
    ? 'TRAJECTORY: The candidate improved across scenarios , note this as a positive signal ("grew into the assessment") in the AI summary.'
    : scores.trajectory === 'Declining'
    ? 'TRAJECTORY: The candidate\'s quality declined across scenarios , this must appear as a watch-out explicitly labelled as a performance trajectory concern, with the specific drop noted.'
    : 'TRAJECTORY: Consistent quality across all scenarios.'

  const patternLine = scores.cross_scenario_pattern && scores.cross_scenario_pattern !== 'No dominant pattern detected'
    ? `CROSS-SCENARIO PATTERN DETECTED: ${scores.cross_scenario_pattern}. This pattern must be explicitly named and analysed in paragraph 3 of the AI summary.`
    : 'CROSS-SCENARIO PATTERN: No single dominant pattern detected.'

  const sharedPreamble = `You are a senior talent assessment specialist writing a detailed professional hiring report for the role of ${assessment.role_title}. Hiring managers rely on this to make real, consequential decisions.

${context}

The candidate scored ${finalOverallScore}/100 overall. Skill scores: ${Object.entries(scores.scores).map(([k, v]) => `${k}: ${v}`).join(', ')}.
Risk level: ${scores.risk_level}. Response quality: ${scores.response_quality}. Seniority tier assessed: ${seniorityTier.toUpperCase()}.
Assessment mode: ${modeLabel} (${scenarios.length} scenarios). When you write any integrity-related narrative or quality-of-response commentary, you must name the assessment mode and calibrate the language accordingly. For a Speed-Fit Assessment, brief responses are not by themselves a concern; for a Strategy-Fit Assessment, consistently short responses must be treated as a serious flag.
${trajectoryLine}
${patternLine}

CRITICAL FORMATTING RULE: Do not use any markdown formatting whatsoever. No **bold**, no *italic*, no ### headers, no bullet symbols, no backticks. Plain prose only. The system renders formatting , markdown appears as raw characters to the reader. Never use em dash (—) or en dash (–) characters anywhere in the output. Use commas, full stops, or rewrite the sentence instead.

Write the sections below using the exact ## HEADER markers shown. Every section must quote or directly reference specific things this candidate actually wrote.`

  // Call 2a: analysis sections
  // IMPORTANT: CANDIDATE TYPE and PREDICTED OUTCOMES come first so they are
  // always generated before the longer narrative sections can exhaust the token budget.
  const narratives2aPrompt = `${sharedPreamble}

## CANDIDATE TYPE
Describe this candidate the way a hiring manager would describe them to a colleague in plain spoken English. No jargon. No assessment language. Write as if explaining to someone over coffee who is about to interview this person.

Format exactly as one line:
CANDIDATE_TYPE: [label]|[explanation]

The label is a short plain-English description, maximum 8 words, using everyday language.
The explanation is one sentence of practical context for the hiring manager, maximum 20 words.

Label rules:
- Use words people actually say: "struggles", "loses focus", "needs prompting", "takes ownership", "avoids conflict", "misses detail".
- Do NOT use: "fades", "executor", "analytical", "tactical", "composure", "quantitative", "follow-through", or any hyphenated compound noun.
- Connect the two parts with "with", "who", or "but". Maximum 8 words.
- Good labels: "Strong Communicator who Struggles Under Pressure", "Reliable and Thorough but Slow to Decide", "Confident Self-Starter with a Tendency to Overcommit", "Hard Worker who Avoids Difficult Conversations".
- Bad labels: "Analytical Executor with Moderate Composure", "Process-Follower with Incomplete Follow-Through", "Tactical Operator with Deferred Accountability".

Explanation rules:
- One sentence only. Plain English. Practical. Tells the hiring manager what to watch for or do.
- Good: "Handles stakeholders well but quality drops when deadlines pile up."
- Good: "Will do the work diligently but may need a push to raise concerns early."

## PREDICTED OUTCOMES
Based on this candidate's score of ${finalOverallScore}/100, their pressure-fit rating, integrity signals, and response patterns, generate four probability percentages. Calibrate to the ${seniorityTier} seniority level.

CRITICAL RULE: If pass_probation is above 70, then churn_risk MUST be below 20 and underperformance_risk MUST be below 25. If pass_probation is below 50, then churn_risk MUST be above 40 and underperformance_risk MUST be above 45. Return numbers that obey these rules. Do not violate them.

Churn risk calibration: Scenario 4 (Staying Power) is your primary input for churn_risk. If the candidate showed disengagement, passive ownership language, frustration with routine work, or avoidance of the mundane task in that scenario, churn_risk must be elevated (60 or above). If they demonstrated genuine motivation, took full ownership, and found value in the less glamorous work even under pressure, churn_risk must be low (below 35). Do not average this away into a moderate score. Make a directional call based on the evidence.

Format exactly as one line with no spaces around the equals signs or pipe characters:
PREDICTIONS: pass_probation=[X]|top_performer=[X]|churn_risk=[X]|underperformance_risk=[X]
Where X is an integer from 0 to 100.

## AI SUMMARY
Write exactly 3-4 sentences total. No paragraphs, no line breaks. UK English. No HR jargon. Cover: overall profile, one specific behavioural observation from the scenarios (quote a phrase), the key gap or concern, and the hiring recommendation (start with exactly one of: Strong hire / Hire with structured onboarding / Proceed with caution , specific risks identified / Not recommended at this stage). Be direct and concise.

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
Write exactly 2-4 watch-outs. Only genuine concerns with direct evidence. If trajectory is declining, include it here. Each WATCHOUT line must be reframed as "what will get tolerated" rather than an abstract concern. Format:
WATCHOUT: What will get tolerated: [plain English, 2 to 3 sentences in a single line. Cover (a) what the behaviour looks like day to day in this role, (b) what happens if it goes ignored, (c) when the manager will first notice it. No jargon, no scores, UK English, no em dashes, no emoji.]
EXPLANATION: [40-60 words. What they did or failed to do, which scenario, why it matters for this role.]
EVIDENCE: [Direct verbatim quote or specific reference]
SEVERITY: [High / Medium / Low]
ACTION: [Specific, practical step for the employer in the first 4 weeks. Reference the gap directly. Not generic advice.]
IF_IGNORED: [Specific likely outcome within 60 days if this watch-out goes unaddressed. Be concrete and role-specific. 1-2 sentences only.]

## PRESSURE FIT NARRATIVES
All 4 dimensions are REQUIRED. Each narrative must be exactly 2-3 sentences. No more. Format:
DIMENSION: [dimension key]
[2-3 sentences only]

Rules for every narrative:
- Quote at least one specific phrase the candidate actually wrote (in quotation marks)
- State what the score means practically for their day-to-day behaviour in this role
- End with one sentence on what to expect in their first 90 days

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

## REALITY TIMELINE
Write a three-phase narrative prediction of this candidate's first 90 days. Reference what they actually wrote. Name specific behaviours from their responses. If they avoided ownership language, say so explicitly. If they excelled at stakeholder communication, say so explicitly. No generalities.

Use Scenario 4 (Staying Power) as your primary input for Month 3. If their response to the mundane or routine work scenario showed frustration, low ownership, or disengagement, this must appear as a retention or motivation risk in the Month 2-3 phase. If they responded well, this must appear as a resilience signal.

Format exactly as three labelled lines:
REALITY_TIMELINE_WEEK1: [2-3 sentences. Week 1-2 onboarding behaviours based on their response patterns. What will they do first? How will they present to the team and manager?]
REALITY_TIMELINE_MONTH1: [2-3 sentences. Month 1 settling-in patterns. What will go well? Where will early friction appear?]
REALITY_TIMELINE_MONTH3: [2-3 sentences. Month 2-3. Where do risks surface and where do strengths consolidate by day 90? Draw directly from Scenario 4 signals for any motivation or retention commentary.]

## CV COMPARISON
Generate 3-4 short phrases representing what a typical CV for a ${assessment.role_title} candidate at ${seniorityTier} level would claim. These must be generic, plausible-sounding CV phrases for this role type, not specific to this candidate's responses. Write as if reading a typical candidate's CV for this role.
Format exactly as one line:
CV_COMPARISON: [phrase 1]|[phrase 2]|[phrase 3]|[phrase 4]
Rules: Each phrase is 5-12 words only. No full stops at the end. Use realistic CV language. Do not reference the assessment scenarios or this candidate's specific answers.`

  // Call 2c: secondary analysis (expectation alignment, simple view, leave analysis)
  // Runs in parallel with 2a and 2b. If it fails, the report still renders, the
  // new sections just appear empty.
  const narratives2cPrompt = `${sharedPreamble}

## EXPECTATION ALIGNMENT
Read the candidate's responses for evidence that their expectations of the role do not match the role reality described in the job description. Look specifically for assumptions about: team size, resource availability, level of autonomy, pace of work, seniority of tasks they will own, type of stakeholder they will deal with, or how decisions get made. Only flag a mismatch if there is direct evidence in the candidate's own words.

Generate 0 to 3 mismatch flags. If there are none, write exactly: EXPECTATION_NONE
Otherwise, format each mismatch exactly as below, separated by a blank line:

MISMATCH:
EXPECTS: [What the candidate seems to expect, in one sentence, drawing on their own words.]
REALITY: [What the role actually offers, in one sentence, drawn from the JD.]
WHY_IT_MATTERS: [Why this gap is likely to cause friction or early disengagement, in one sentence.]

## SIMPLE VIEW
Rewrite the key findings of this report in plain English a busy line manager would actually use, with no jargon, no buzzwords, no PRODICTA-specific terms. Aim for the language of a friendly colleague explaining a candidate over coffee. Replace phrases like "composure under conflict scored 85" with "handles difficult conversations well". Replace "reduced delegation under sustained pressure" with "may struggle to share workload when busy". Format exactly as below, one item per line, no markdown, no bullets:

SIMPLE_SUMMARY: [3 to 4 sentences. The whole report in plain English. What kind of person are they, what are they good at, what should the manager watch for, what is the recommendation.]
SIMPLE_TYPE: [One short plain-English label for the candidate type, 5 to 9 words, no jargon.]
SIMPLE_STRENGTH: [One sentence in plain English describing their biggest strength.]
SIMPLE_STRENGTH: [One sentence in plain English describing their second strength.]
SIMPLE_WATCHOUT: [One sentence in plain English describing the most important watch-out.]
SIMPLE_WATCHOUT: [One sentence in plain English describing the second watch-out, only if there is one.]

## LEAVE ANALYSIS
Write a single specific narrative prediction of what would cause this candidate to leave within 6 months, based on direct evidence from their responses and the role context. This must be a specific story, not a generic risk. The shape is: "This candidate will likely disengage because [specific evidence from their responses] conflicts with [specific aspect of the role]." Then name 1 or 2 trigger points that would accelerate this, and one suggested action a line manager could take in the first 30 days to prevent it. Write 4 to 6 sentences in plain UK English, no bullet points, no markdown. If there is no plausible leave risk for this candidate, write exactly: LEAVE_NONE

Format exactly as:
LEAVE_ANALYSIS: [narrative paragraph]

## COUNTER OFFER RESILIENCE
Analyse the candidate's responses for signs of genuine motivation to move versus simply testing the market. Look for: specific frustrations with their current role, pull factors towards this new role, salary-driven language versus role-driven language, and the strength of commitment in how they describe their interest. A candidate who names concrete pull factors, describes specific frustrations with their current situation, and uses role-driven language is high resilience. A candidate whose motivation reads as exploratory, vague, or salary-driven is low resilience.

Output exactly two lines:
COUNTER_OFFER_SCORE: [integer 0 to 100]
COUNTER_OFFER_NARRATIVE: [one sentence in plain UK English explaining the score, drawn from direct evidence in the responses]

## CULTURE FIT
Analyse the candidate's natural working style across these 5 dimensions: structured vs flexible, independent vs collaborative, fast-paced vs methodical, direct vs diplomatic, process-driven vs creative. Compare their style to the working environment described in the job description and any role context. Generate a culture fit percentage 0 to 100 and 1 to 3 specific alignment or friction points. Each point must be one sentence, must name the dimension, and must be backed by direct evidence in the candidate's responses or the JD.

Output exactly:
CULTURE_FIT_SCORE: [integer 0 to 100]
CULTURE_FIT_POINT: [ALIGNMENT or FRICTION] | [one sentence]
CULTURE_FIT_POINT: [ALIGNMENT or FRICTION] | [one sentence]
CULTURE_FIT_POINT: [ALIGNMENT or FRICTION] | [one sentence, optional]`

  // Call 2b: document sections (onboarding plan, interview questions, client explainer)
  const roleLevel = assessment.role_level || 'MID_LEVEL'
  const onboardingGuidance = roleLevel === 'OPERATIONAL'
    ? `This is a Day One Management Guide for an operational/entry-level role. Write it as a practical daily management guide using plain, simple language. Focus on: reliability, punctuality, safety awareness, and process adherence. Include shift reminder suggestions if relevant to the role. Cover first-week task checklists and who to report to. Activities should be concrete and immediate, not strategic. Think "shadowing the team lead on Monday morning" not "developing a stakeholder map".`
    : roleLevel === 'LEADERSHIP'
    ? `This is a Strategic Onboarding Brief for a leadership/director-level role. Write it as a strategic partnership brief using executive-level language. Focus on: political intelligence, stakeholder landscape navigation, and long-term impact. Cover board and senior stakeholder relationships, an early listening tour in weeks 1-2, and first 90-day strategic priorities. Activities should be high-level and relationship-focused, not task-level. Think "one-to-one with each direct report to assess team dynamics" not "complete onboarding checklist".`
    : `This is a 90-Day Success Plan for a mid-level role. Focus on: resourcefulness, team relationships, and early wins. Include suggested 30/60/90 day milestones. Cover stakeholder introductions and quick credibility-building actions. Use professional but practical language. Think "deliver first visible quick-win project by week 3" not generic orientations.`

  const narratives2bPrompt = `${sharedPreamble}

## ONBOARDING PLAN
Write exactly 6 structured week entries. Stop at Week 6. Do not write Week 7 or beyond. Each entry must use the EXACT format below. Every activity must be tied to THIS candidate's specific assessed gaps, no generic filler.

${onboardingGuidance}

WEEK: [1,6]
TITLE: [Short descriptive title for this week, e.g. "Safety Orientation and Shadow Work"]
OBJECTIVE: [One clear sentence stating what this candidate must achieve by the end of this week, directly addressing their assessed gaps.]
ACTIVITY: [First specific activity, name the task, who runs it, and what aspect of their assessed gap it addresses.]
ACTIVITY: [Second specific activity, different from the first, targeting a different identified gap or the next step in the same one.]
ACTIVITY: [Third specific activity, preferred for all weeks. If only two are needed, still write a third that consolidates learning.]
CHECKPOINT: [One measurable, observable outcome the manager can verify. Must be specific, not "understands X" but "can demonstrate X without prompting" or "has completed Y with no errors".]
INVOLVES: [Comma-separated list of who is responsible or present: e.g. Line manager, HR business partner, Assigned mentor, Team lead, Probation officer]
NOTES: [One sentence referencing relevant UK best practice, CIPD probation guidance, ERA 2025 day-one rights, statutory probation review requirements, or "N/A" if not applicable to this week.]

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

## CLIENT EXPLAINER
Write exactly 3 paragraphs. This is a cover note for a recruitment agency to share with their client. Write as a recruiter introducing the candidate to a hiring manager who has never heard of PRODICTA.

Paragraph 1: One sentence only. Explain what PRODICTA is.

Paragraph 2: Explain this candidate's overall score, hiring recommendation, and Pressure-Fit result in plain language. Be specific to this candidate, name the score and recommendation, and explain what they mean for this specific role. 60-80 words.

Paragraph 3: State the key finding and the plain-language hiring recommendation. End with one sentence telling the client what to do next. 40-60 words.

Write in plain UK English. No jargon. No bullet points. No bold text.`

  // ── Run Call 2a, 2b and 2c in parallel ─────────────────────────────────────

  const t2start = Date.now()
  console.log('[score] Call 2a (analysis) + Call 2b (documents) + Call 2c (secondary) starting in parallel...')

  // Build spoken delivery prompt if any audio responses exist
  const audioResponses = responses.filter(r => r.audio_url || r.input_mode === 'record')
  const narratives2dPrompt = audioResponses.length > 0 ? `This candidate chose to record voice responses for ${audioResponses.length} of their scenarios. Analyse their transcribed voice responses for spoken delivery quality.

Role: ${assessment.role_title}
${audioResponses.map(r => `Scenario ${r.scenario_index + 1} (voice response): "${r.response_text}"`).join('\n')}

Analyse for: communication quality, confidence signals, clarity of thought, professionalism, and presence. Consider that this was spoken aloud under time pressure.

Return in this exact format:
## SPOKEN_DELIVERY
spoken_delivery_score: [0-100 integer]
spoken_delivery_narrative: [2-3 sentences about their spoken delivery quality]
tone_signals: [comma-separated list e.g. confident, measured, clear]
response_pace: [fast|measured|slow]` : null

  // Build inbox overload prompt if inbox responses exist
  // -- ALTER TABLE results ADD COLUMN overload_score INTEGER;
  // -- ALTER TABLE results ADD COLUMN overload_narrative TEXT;
  // -- ALTER TABLE results ADD COLUMN triage_signals JSONB;
  const inboxResponses = responses.filter(r => r.inbox_responses && r.inbox_responses.length > 0)
  const narratives2ePrompt = inboxResponses.length > 0 ? `This candidate faced inbox overload during their assessment. Analyse their triage decisions.

Role: ${assessment.role_title}
${inboxResponses.map(r => `Scenario ${r.scenario_index + 1}:
  Inbox items: ${(r.inbox_responses || []).map(ir => `${ir.item}: ${ir.action}`).join(', ')}
  Interruption response: ${r.interruption_response || 'none'}
  ${r.interruption_reply ? `Interruption reply: "${r.interruption_reply}"` : ''}
  ${r.inbox_note ? `Candidate's reasoning: "${r.inbox_note}"` : ''}`).join('\n')}

Analyse: triage quality (did they identify the most urgent item?), prioritisation logic (sound deferral reasoning?), interruption handling (appropriate for the situation?), focus maintenance.

Return JSON only. UK English. No emoji. No em dashes.
{
  "overload_score": 0-100,
  "overload_narrative": "2-3 sentences",
  "triage_signals": ["string", "string"]
}` : null

  const [narratives2aMsg, narratives2bMsg, narratives2cMsg, narratives2dMsg, narratives2eMsg] = await Promise.all([
    anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4500,
      messages: [{ role: 'user', content: narratives2aPrompt }],
    }).catch(err => { console.error('[score] Call 2a error:', err?.message); return null }),
    anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2200,
      messages: [{ role: 'user', content: narratives2bPrompt }],
    }).catch(err => { console.error('[score] Call 2b error:', err?.message); return null }),
    anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: narratives2cPrompt }],
    }).catch(err => { console.error('[score] Call 2c error:', err?.message); return null }),
    narratives2dPrompt ? anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      messages: [{ role: 'user', content: narratives2dPrompt }],
    }).catch(err => { console.error('[score] Call 2d (spoken delivery) error:', err?.message); return null }) : Promise.resolve(null),
    narratives2ePrompt ? anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: narratives2ePrompt }],
    }).catch(err => { console.error('[score] Call 2e (inbox overload) error:', err?.message); return null }) : Promise.resolve(null),
  ])

  console.log('[score] Call 2a+2b+2c completed in', Date.now() - t2start, 'ms | total elapsed:', Date.now() - t0, 'ms')

  // ── Parse plain text sections ────────────────────────────────────────────────

  function getSection(text, header) {
    const re = new RegExp(`##\\s+${header}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`, 'i')
    const m = text.match(re)
    return m ? m[1].trim() : ''
  }

  const text2a = narratives2aMsg?.content[0]?.text || ''
  const text2b = narratives2bMsg?.content[0]?.text || ''
  const text2c = narratives2cMsg?.content[0]?.text || ''
  const text2d = narratives2dMsg?.content[0]?.text || ''

  // Parse spoken delivery from Call 2d
  let spokenDeliveryScore = null
  let spokenDeliveryNarrative = null
  let audioRecordingUrls = null
  if (text2d) {
    const sdSection = getSection(text2d, 'SPOKEN_DELIVERY') || text2d
    const scoreMatch = sdSection.match(/spoken_delivery_score:\s*(\d+)/)
    const narrativeMatch = sdSection.match(/spoken_delivery_narrative:\s*(.+?)(?:\n|$)/)
    spokenDeliveryScore = scoreMatch ? parseInt(scoreMatch[1]) : null
    spokenDeliveryNarrative = narrativeMatch ? narrativeMatch[1].replace(/^["']|["']$/g, '').trim() : null
  }
  if (audioResponses.length > 0) {
    audioRecordingUrls = audioResponses.reduce((acc, r) => { acc[`scenario_${r.scenario_index}`] = r.audio_url; return acc }, {})
  }
  // Parse inbox overload from Call 2e
  let overloadScore = null
  let overloadNarrative = null
  let triageSignals = null
  const text2e = narratives2eMsg?.content[0]?.text || ''
  if (text2e) {
    try {
      const jsonMatch = text2e.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0].replace(/[\u2014\u2013]/g, ', '))
        overloadScore = parsed.overload_score ?? null
        overloadNarrative = parsed.overload_narrative ?? null
        triageSignals = parsed.triage_signals ?? null
      }
    } catch {}
  }

  console.log('[score] Call 2a length:', text2a.length, '| Call 2b length:', text2b.length, '| Call 2c length:', text2c.length)

  // Parse from Call 2a
  const aiSummary        = stripMd(getSection(text2a, 'AI SUMMARY'))
  const riskReason       = stripMd(getSection(text2a, 'RISK REASON'))
  const qualityNotes     = stripMd(getSection(text2a, 'QUALITY NOTES'))
  const timeAnalysis     = stripMd(getSection(text2a, 'TIME ANALYSIS'))
  const consistencyNotes = stripMd(getSection(text2a, 'CONSISTENCY NOTES'))

  // Score narratives (from 2a)
  const scoreNarratives = {}
  const scoreNarrativesRaw = getSection(text2a, 'SCORE NARRATIVES')
  const skillBlocks = ('\n' + scoreNarrativesRaw).split(/\nSKILL:\s+/i)
  for (const block of skillBlocks) {
    const lines = block.split('\n')
    const skillName = lines[0]?.trim()
    const matchedSkill = skillNames.find(s => s.toLowerCase() === skillName?.toLowerCase())
    if (matchedSkill) scoreNarratives[matchedSkill] = stripMd(lines.slice(1).join('\n').trim())
  }
  console.log('[score] scoreNarratives keys:', Object.keys(scoreNarratives))

  // Strengths (from 2a)
  const strengths = []
  const strengthBlocks = ('\n' + getSection(text2a, 'STRENGTHS')).split(/\nSTRENGTH:\s+/i).filter(Boolean)
  for (const block of strengthBlocks) {
    const lines = block.split('\n')
    const text = stripMd(lines[0]?.trim().replace(/^STRENGTH:\s*/i, ''))
    const explanationLine = lines.find(l => /^EXPLANATION:/i.test(l))
    const evidenceLine    = lines.find(l => /^EVIDENCE:/i.test(l))
    if (text) strengths.push({
      text,
      explanation: stripMd(explanationLine?.replace(/^EXPLANATION:\s*/i, '').trim() || ''),
      evidence:    stripMd(evidenceLine?.replace(/^EVIDENCE:\s*/i, '').trim() || ''),
    })
  }

  // Watch-outs (from 2a)
  const watchouts = []
  const watchoutBlocks = ('\n' + getSection(text2a, 'WATCH-OUTS')).split(/\nWATCHOUT:\s+/i).filter(Boolean)
  for (const block of watchoutBlocks) {
    const lines = block.split('\n')
    const text = stripMd(lines[0]?.trim().replace(/^WATCHOUT:\s*/i, ''))
    const explanationLine = lines.find(l => /^EXPLANATION:/i.test(l))
    const evidenceLine    = lines.find(l => /^EVIDENCE:/i.test(l))
    const severityLine    = lines.find(l => /^SEVERITY:/i.test(l))
    const actionLine      = lines.find(l => /^ACTION:/i.test(l))
    const ifIgnoredLine   = lines.find(l => /^IF_IGNORED:/i.test(l))
    if (text) watchouts.push({
      text,
      explanation: stripMd(explanationLine?.replace(/^EXPLANATION:\s*/i, '').trim() || ''),
      evidence:    stripMd(evidenceLine?.replace(/^EVIDENCE:\s*/i, '').trim() || ''),
      severity:    severityLine?.replace(/^SEVERITY:\s*/i, '').trim() || 'Medium',
      action:      stripMd(actionLine?.replace(/^ACTION:\s*/i, '').trim() || ''),
      if_ignored:  stripMd(ifIgnoredLine?.replace(/^IF_IGNORED:\s*/i, '').trim() || '') || null,
    })
  }

  // Pressure-fit narratives (from 2a)
  const pfNarratives = {}
  const pfNarrativesRaw = getSection(text2a, 'PRESSURE FIT NARRATIVES')
  console.log('[score] PRESSURE FIT NARRATIVES raw length:', pfNarrativesRaw.length)
  const pfBlocks = pfNarrativesRaw.split(/\n?DIMENSION:\s+/i).filter(Boolean)
  console.log('[score] PF blocks count:', pfBlocks.length)
  for (const block of pfBlocks) {
    const lines = block.split('\n')
    const key = lines[0]?.trim()
    if (key) pfNarratives[key] = stripMd(lines.slice(1).join('\n').trim())
  }
  console.log('[score] pfNarratives keys:', Object.keys(pfNarratives))

  // Candidate type (from 2a)
  const candidateTypeRaw = getSection(text2a, 'CANDIDATE TYPE')
  console.log('[score] CANDIDATE TYPE section raw:', JSON.stringify(candidateTypeRaw.slice(0, 400)))
  // Trim each line before matching so leading whitespace does not break the regex
  const candidateTypeLine = candidateTypeRaw.split('\n').find(l => /^CANDIDATE_TYPE:/i.test(l.trim()))
  let candidateType = null
  if (candidateTypeLine) {
    const candidateTypeRawValue = candidateTypeLine.replace(/^CANDIDATE_TYPE:\s*/i, '').trim()
    // Preserve the | separator between label and explanation; only normalise each part individually
    const candidateTypeParts = candidateTypeRawValue.split('|')
    candidateType = candidateTypeParts.length >= 1
      ? candidateTypeParts.map(p =>
          (stripMd(p.trim()) || '')
            .replace(/_/g, ' ')
            .replace(/-with-/gi, ' with ')
            .replace(/\s+/g, ' ')
            .trim()
        ).filter(Boolean).join('|') || null
      : null
  } else {
    // Fallback: if Claude omitted the prefix, take the first non-empty non-heading line
    const fallbackLine = candidateTypeRaw.split('\n').find(l => l.trim() && !l.trim().startsWith('#'))
    if (fallbackLine) {
      const parts = fallbackLine.split('|').map(p => stripMd(p.trim())).filter(Boolean)
      if (parts.length >= 1) candidateType = parts.join('|')
    }
    console.log('[score] CANDIDATE_TYPE: prefix not found - fallback result:', candidateType)
  }
  console.log('[score] candidate_type:', candidateType)

  // Predicted outcomes (from 2a)
  let predictions = null
  const predictionsRaw = getSection(text2a, 'PREDICTED OUTCOMES')
  console.log('[score] PREDICTED OUTCOMES raw:', JSON.stringify(predictionsRaw.slice(0, 400)))
  // Trim each line before testing so leading whitespace from Claude does not break the match
  const predictionsLine = predictionsRaw.split('\n').find(l => /^PREDICTIONS:/i.test(l.trim()))
  console.log('[score] predictionsLine found:', predictionsLine != null, '| value:', predictionsLine)
  if (!predictionsLine) {
    console.log('[score] WARNING: No PREDICTIONS line found. All lines in section:', JSON.stringify(predictionsRaw.split('\n')))
  }
  if (predictionsLine) {
    const predsObj = {}
    predictionsLine.trim().replace(/^PREDICTIONS:\s*/i, '').trim().split(/\s*\|\s*/).forEach(part => {
      const eqIdx = part.indexOf('=')
      if (eqIdx > 0) {
        const k = part.slice(0, eqIdx).trim()
        const v = part.slice(eqIdx + 1).trim()
        const n = parseInt(v)
        console.log('[score] preds parse part:', JSON.stringify(part), '-> key:', k, 'val:', n)
        if (k && !isNaN(n)) predsObj[k] = n
      }
    })
    console.log('[score] predsObj full:', JSON.stringify(predsObj), '| key count:', Object.keys(predsObj).length)
    if (Object.keys(predsObj).length >= 3) predictions = predsObj
    else console.log('[score] WARNING: Not enough prediction keys parsed - predictions will be null')
  }

  // Server-side coherence correction: enforce the same rules given to Claude
  if (predictions) {
    const pp = predictions.pass_probation
    const cr = predictions.churn_risk
    const ur = predictions.underperformance_risk
    console.log('[score] COHERENCE CHECK - raw values from Claude: pass_probation=' + pp + ' churn_risk=' + cr + ' underperformance_risk=' + ur + ' top_performer=' + predictions.top_performer)
    console.log('[score] COHERENCE CHECK - all keys in predictions object:', JSON.stringify(Object.keys(predictions)))
    let adjusted = false
    if (pp != null && pp > 70 && cr != null && cr > 19) {
      predictions.churn_risk = Math.min(cr, 19)
      console.log('[score] COHERENCE APPLIED: pass_probation ' + pp + ' > 70, churn_risk ' + cr + ' -> ' + predictions.churn_risk)
      adjusted = true
    }
    if (pp != null && pp <= 50 && cr != null && cr < 40) {
      predictions.churn_risk = Math.max(cr, 40)
      console.log('[score] COHERENCE APPLIED: pass_probation ' + pp + ' <= 50, churn_risk ' + cr + ' -> ' + predictions.churn_risk)
      adjusted = true
    }
    if (pp != null && pp > 70 && ur != null && ur > 30) {
      predictions.underperformance_risk = Math.min(ur, 30)
      console.log('[score] COHERENCE APPLIED: pass_probation ' + pp + ' > 70, underperformance_risk ' + ur + ' -> ' + predictions.underperformance_risk)
      adjusted = true
    }
    if (pp != null && pp <= 50 && ur != null && ur < 45) {
      predictions.underperformance_risk = Math.max(ur, 45)
      console.log('[score] COHERENCE APPLIED: pass_probation ' + pp + ' <= 50, underperformance_risk ' + ur + ' -> ' + predictions.underperformance_risk)
      adjusted = true
    }
    if (!adjusted) console.log('[score] COHERENCE CHECK - no adjustments needed')
    console.log('[score] COHERENCE FINAL predictions:', JSON.stringify(predictions))
  } else {
    console.log('[score] COHERENCE CHECK SKIPPED - predictions is null (no PREDICTIONS line was parsed)')
  }

  // Hardcoded coherence override: belt-and-suspenders pass that runs unconditionally after all other processing
  if (predictions && predictions.pass_probation > 70) {
    predictions.churn_risk = Math.min(predictions.churn_risk ?? 0, 19)
    predictions.underperformance_risk = Math.min(predictions.underperformance_risk ?? 0, 25)
  }
  if (predictions && predictions.pass_probation <= 50) {
    predictions.churn_risk = Math.max(predictions.churn_risk ?? 100, 40)
    predictions.underperformance_risk = Math.max(predictions.underperformance_risk ?? 100, 45)
  }
  if (predictions) {
    console.log('COHERENCE HARDCODED: pass=' + predictions.pass_probation + ' churn=' + predictions.churn_risk + ' underperf=' + predictions.underperformance_risk)
  }

  // Reality timeline (from 2a)
  const rtRaw   = getSection(text2a, 'REALITY TIMELINE').split('\n')
  const rtWeek1Line  = rtRaw.find(l => /^REALITY_TIMELINE_WEEK1:/i.test(l))
  const rtMonth1Line = rtRaw.find(l => /^REALITY_TIMELINE_MONTH1:/i.test(l))
  const rtMonth3Line = rtRaw.find(l => /^REALITY_TIMELINE_MONTH3:/i.test(l))
  const realityTimeline = (rtWeek1Line || rtMonth1Line || rtMonth3Line) ? {
    week1:  stripMd(rtWeek1Line?.replace(/^REALITY_TIMELINE_WEEK1:\s*/i, '').trim()  || '') || null,
    month1: stripMd(rtMonth1Line?.replace(/^REALITY_TIMELINE_MONTH1:\s*/i, '').trim() || '') || null,
    month3: stripMd(rtMonth3Line?.replace(/^REALITY_TIMELINE_MONTH3:\s*/i, '').trim() || '') || null,
  } : null

  // CV comparison (from 2a)
  const cvComparisonLine = getSection(text2a, 'CV COMPARISON').split('\n').find(l => /^CV_COMPARISON:/i.test(l))
  const cvComparison = cvComparisonLine
    ? cvComparisonLine.replace(/^CV_COMPARISON:\s*/i, '').trim().split('|').map(s => stripMd(s.trim())).filter(Boolean)
    : null
  console.log('[score] cv_comparison count:', cvComparison?.length)

  // Expectation alignment (from 2c)
  const expectationRaw = getSection(text2c, 'EXPECTATION ALIGNMENT')
  let expectationMismatches = null
  if (expectationRaw && !/EXPECTATION_NONE/i.test(expectationRaw)) {
    const blocks = ('\n' + expectationRaw).split(/\nMISMATCH:\s*/i).filter(b => b.trim())
    const parsed = []
    for (const block of blocks) {
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean)
      const get = (key) => {
        const line = lines.find(l => new RegExp(`^${key}:`, 'i').test(l))
        return stripMd(line ? line.replace(new RegExp(`^${key}:\\s*`, 'i'), '').trim() : '')
      }
      const expects = get('EXPECTS')
      const reality = get('REALITY')
      const why = get('WHY_IT_MATTERS')
      if (expects && reality) parsed.push({ expects, reality, why_it_matters: why })
    }
    if (parsed.length > 0) expectationMismatches = parsed.slice(0, 3)
  }
  console.log('[score] expectation_mismatches count:', expectationMismatches?.length || 0)

  // Leave analysis (from 2c)
  const leaveRaw = getSection(text2c, 'LEAVE ANALYSIS')
  const leaveLine = leaveRaw.split('\n').find(l => /^LEAVE_ANALYSIS:/i.test(l))
  let leaveAnalysis = leaveLine ? stripMd(leaveLine.replace(/^LEAVE_ANALYSIS:\s*/i, '').trim()) : ''
  if (!leaveAnalysis || /^LEAVE_NONE$/i.test(leaveAnalysis)) leaveAnalysis = null
  console.log('[score] leave_analysis present:', !!leaveAnalysis)

  // Simple view (from 2c)
  const simpleRaw = getSection(text2c, 'SIMPLE VIEW')
  let simpleView = null
  if (simpleRaw) {
    const lines = simpleRaw.split('\n').map(l => l.trim()).filter(Boolean)
    const get1 = (key) => {
      const line = lines.find(l => new RegExp(`^${key}:`, 'i').test(l))
      return stripMd(line ? line.replace(new RegExp(`^${key}:\\s*`, 'i'), '').trim() : '')
    }
    const getMany = (key) => lines
      .filter(l => new RegExp(`^${key}:`, 'i').test(l))
      .map(l => stripMd(l.replace(new RegExp(`^${key}:\\s*`, 'i'), '').trim()))
      .filter(Boolean)
    const summary = get1('SIMPLE_SUMMARY')
    const type    = get1('SIMPLE_TYPE')
    const ss      = getMany('SIMPLE_STRENGTH')
    const ww      = getMany('SIMPLE_WATCHOUT')
    if (summary || type || ss.length || ww.length) {
      simpleView = {
        summary: summary || null,
        candidate_type: type || null,
        strengths: ss,
        watchouts: ww,
      }
    }
  }
  console.log('[score] simple_view present:', !!simpleView)

  // Counter-offer resilience (from 2c)
  const counterRaw = getSection(text2c, 'COUNTER OFFER RESILIENCE')
  let counterOfferResilience = null
  let counterOfferNarrative = null
  if (counterRaw) {
    const cLines = counterRaw.split('\n').map(l => l.trim()).filter(Boolean)
    const scoreLine = cLines.find(l => /^COUNTER_OFFER_SCORE:/i.test(l))
    const narrLine  = cLines.find(l => /^COUNTER_OFFER_NARRATIVE:/i.test(l))
    if (scoreLine) {
      const n = parseInt(scoreLine.replace(/^COUNTER_OFFER_SCORE:\s*/i, '').trim())
      if (!isNaN(n)) counterOfferResilience = Math.max(0, Math.min(100, n))
    }
    if (narrLine) {
      counterOfferNarrative = stripMd(narrLine.replace(/^COUNTER_OFFER_NARRATIVE:\s*/i, '').trim()) || null
    }
  }
  console.log('[score] counter_offer_resilience:', counterOfferResilience)

  // Culture fit (from 2c)
  const cultureRaw = getSection(text2c, 'CULTURE FIT')
  let cultureFit = null
  if (cultureRaw) {
    const fLines = cultureRaw.split('\n').map(l => l.trim()).filter(Boolean)
    const scoreLine = fLines.find(l => /^CULTURE_FIT_SCORE:/i.test(l))
    let cfScore = null
    if (scoreLine) {
      const n = parseInt(scoreLine.replace(/^CULTURE_FIT_SCORE:\s*/i, '').trim())
      if (!isNaN(n)) cfScore = Math.max(0, Math.min(100, n))
    }
    const points = fLines
      .filter(l => /^CULTURE_FIT_POINT:/i.test(l))
      .map(l => {
        const raw = l.replace(/^CULTURE_FIT_POINT:\s*/i, '').trim()
        const parts = raw.split('|').map(s => s.trim())
        if (parts.length >= 2) {
          const type = /friction/i.test(parts[0]) ? 'friction' : 'alignment'
          return { type, text: stripMd(parts.slice(1).join('|').trim()) }
        }
        return null
      })
      .filter(Boolean)
      .slice(0, 3)
    if (cfScore != null || points.length > 0) {
      cultureFit = { score: cfScore, points }
    }
  }
  console.log('[score] culture_fit:', cultureFit ? `${cultureFit.score}% (${cultureFit.points.length} points)` : null)

  // Parse from Call 2b
  const onboardingPlan = []
  const weekBlocks = ('\n' + getSection(text2b, 'ONBOARDING PLAN')).split(/\nWEEK:\s*/i).filter(Boolean)
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
    const title     = getField('TITLE')
    const objective = getField('OBJECTIVE')
    const involves  = (getField('INVOLVES') || '').split(/[,;]/).map(s => s.trim()).filter(Boolean)
    const notes     = getField('NOTES') !== 'N/A' ? getField('NOTES') : ''
    if (title || objective) onboardingPlan.push({
      week: weekNum, title, objective,
      activities: getAllFields('ACTIVITY'),
      checkpoint: getField('CHECKPOINT'),
      involves, notes,
    })
  }

  const interviewQuestions = getSection(text2b, 'INTERVIEW QUESTIONS')
    .split('\n').map(l => stripMd(l.replace(/^\d+\.\s*/, '').trim())).filter(Boolean)

  const clientExplainer = stripMd(getSection(text2b, 'CLIENT EXPLAINER'))

  // hiring_confidence is computed server-side (see calculation above, after pass_probability)

  // Decision alerts (parallel array to watchouts, from if_ignored fields)
  const decisionAlerts = watchouts.map(w => w.if_ignored || null)
  const hasAlerts = decisionAlerts.some(Boolean)

  // ── Monday Morning Reality narrative ────────────────────────────────────────
  // A plain English, day to day narrative of what the manager will actually
  // experience if they hire this candidate. Runs sequentially after main
  // scoring because it depends on parsed watchouts and pressure-fit narratives.
  let tuesdayReality = null
  try {
    const tReadyStart = Date.now()
    const cultureFitForTR = (() => {
      try {
        const cf = (text2c && getSection(text2c, 'CULTURE FIT')) || ''
        return cf.slice(0, 900)
      } catch { return '' }
    })()
    const scenarioResponsesBrief = responses
      .slice(0, 4)
      .map((r, i) => `Scenario ${i + 1}: ${String(r.response_text || '').slice(0, 500)}`)
      .join('\n\n')
    const watchoutsBrief = (watchouts || [])
      .map(w => `- [${w.severity || 'Medium'}] ${w.text || ''}`)
      .join('\n')
      .slice(0, 1400)
    const pfBrief = Object.entries(pfNarratives || {})
      .map(([k, v]) => `${k}: ${String(v || '').slice(0, 260)}`)
      .join('\n')
      .slice(0, 1200)
    const tuesdayPrompt = `You are writing for a UK hiring manager. Produce a "Monday Morning Reality" narrative for ${candidate.name} in the role of ${assessment.role_title}. This is a plain English, honest, practical account of what the manager will actually experience day to day if they hire this person. Write 3 to 6 short paragraphs of flowing prose. No bullet lists. No headings. No scores. No jargon. No emoji. No em dashes, no en dashes, use commas or full stops instead. UK English spelling. Write PRODICTA in all caps if you mention it, but you do not need to mention it. Be direct and specific. Avoid generic language. Ground every claim in the evidence below. Describe concrete moments: what the manager will see on a normal Monday morning when everything lands at once, which meetings or tasks will go well, where friction will show up, and what the first few weeks will feel like.

Candidate name: ${candidate.name}
Role: ${assessment.role_title}

Watch-outs:
${watchoutsBrief}

Pressure-fit narratives:
${pfBrief}

Culture fit signals:
${cultureFitForTR}

Scenario responses (excerpts):
${scenarioResponsesBrief}

Write the narrative now. Return prose only.`
    const tuesdayMsg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1400,
      messages: [{ role: 'user', content: tuesdayPrompt }],
    }).catch(err => { console.error('[score] Monday Morning Reality error:', err?.message); return null })
    const tuesdayRaw = tuesdayMsg?.content?.[0]?.text || ''
    tuesdayReality = stripMd(tuesdayRaw) || null
    console.log('[score] Monday Morning Reality generated in', Date.now() - tReadyStart, 'ms | length:', (tuesdayReality || '').length)
  } catch (trErr) {
    console.error('[score] Monday Morning Reality failed (non-fatal):', trErr?.message)
  }

  console.log('[score] Total elapsed:', Date.now() - t0, 'ms')

  // ── Assemble result ──────────────────────────────────────────────────────────

  const PF_KEYS = ['decision_speed_quality', 'composure_under_conflict', 'prioritisation_under_load', 'ownership_accountability']

  // Normalise pfNarratives keys: Claude may output uppercase or variant casing
  // Find the canonical PF_KEY that matches each parsed key case-insensitively
  const pfNarrativesNormalised = {}
  for (const [rawKey, narrative] of Object.entries(pfNarratives)) {
    const canonical = PF_KEYS.find(k => k.toLowerCase() === rawKey.toLowerCase().replace(/\s+/g, '_'))
    if (canonical) pfNarrativesNormalised[canonical] = narrative
    else console.log('[score] PF key not matched to canonical:', rawKey)
  }
  console.log('[score] pfNarrativesNormalised keys:', Object.keys(pfNarrativesNormalised))

  const pressureFit = {}
  for (const key of PF_KEYS) {
    pressureFit[key] = {
      score:     scores[`pf_${key}`] ?? null,
      verdict:   scores[`pf_${key}_verdict`] ?? null,
      narrative: pfNarrativesNormalised[key] || null,
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
    candidate_type:         candidateType,
    predictions:            predictions,
    reality_timeline:       realityTimeline,
    decision_alerts:        hasAlerts ? decisionAlerts : null,
    cv_comparison:          cvComparison,
    hiring_confidence:      hiringConfidence,
    expectation_mismatches: expectationMismatches,
    leave_analysis:         leaveAnalysis,
    simple_view:            simpleView,
    execution_reliability:  scores.execution_reliability ?? null,
    training_potential:     scores.training_potential ?? null,
    training_potential_narrative: scores.training_potential_narrative ?? null,
    counter_offer_resilience: counterOfferResilience,
    counter_offer_narrative:  counterOfferNarrative,
    culture_fit:              cultureFit,
    tuesday_reality:          tuesdayReality,
    spoken_delivery_score:    spokenDeliveryScore,
    spoken_delivery_narrative: spokenDeliveryNarrative,
    audio_recording_urls:     audioRecordingUrls,
    overload_score:           overloadScore,
    overload_narrative:       overloadNarrative,
    triage_signals:           triageSignals,
  }

  console.log('[score] Result assembled. Score:', result.overall_score, '| Risk:', result.risk_level, '| PassProb:', result.pass_probability, '| Trajectory:', result.trajectory, '| RedFlags:', result.red_flags.length)

  // ── Final coherence enforcement immediately before DB write ─────────────────
  if (predictions) {
    console.log('[score] COHERENCE PRE:', JSON.stringify(predictions))
    if (predictions.pass_probation > 70) {
      predictions.churn_risk = Math.min(predictions.churn_risk || 0, 19)
      predictions.underperformance_risk = Math.min(predictions.underperformance_risk || 0, 25)
    }
    if (predictions.pass_probation <= 50) {
      predictions.churn_risk = Math.max(predictions.churn_risk || 0, 40)
      predictions.underperformance_risk = Math.max(predictions.underperformance_risk || 0, 45)
    }
    console.log('[score] COHERENCE POST:', JSON.stringify(predictions))
  }

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
    pressure_fit_score:  result.pressure_fit_score,
    pressure_fit:        result.pressure_fit,
    candidate_type:      result.candidate_type,
    predictions:         result.predictions,
    reality_timeline:    result.reality_timeline,
    decision_alerts:     result.decision_alerts,
    cv_comparison:          result.cv_comparison,
    hiring_confidence:      result.hiring_confidence,
    expectation_mismatches: result.expectation_mismatches,
    leave_analysis:         result.leave_analysis,
    execution_reliability:  result.execution_reliability,
    training_potential:     result.training_potential,
    training_potential_narrative: result.training_potential_narrative,
    simple_view:            result.simple_view,
    counter_offer_resilience: result.counter_offer_resilience,
    counter_offer_narrative:  result.counter_offer_narrative,
    culture_fit:              result.culture_fit,
    tuesday_reality:          result.tuesday_reality,
    spoken_delivery_score:    result.spoken_delivery_score,
    spoken_delivery_narrative: result.spoken_delivery_narrative,
    audio_recording_urls:     result.audio_recording_urls,
    overload_score:           result.overload_score,
    overload_narrative:       result.overload_narrative,
    triage_signals:           result.triage_signals,
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

  // ── Red flag alert email ─────────────────────────────────────────────────────
  try {
    const [
      { data: { user: ownerUser } },
      { data: ownerProfile },
    ] = await Promise.all([
      adminClient.auth.admin.getUserById(candidate.user_id),
      adminClient.from('users').select('alert_threshold').eq('id', candidate.user_id).maybeSingle(),
    ])
    const threshold = ownerProfile?.alert_threshold ?? 50
    const hasHighWatchout = (result.watchouts || []).some(w => typeof w === 'object' && w.severity === 'High')
    const integrityCheck = result.response_quality
    const integrityConcern = integrityCheck && ['Possibly AI-Assisted', 'Suspicious'].includes(integrityCheck)
    if (result.overall_score < threshold || hasHighWatchout || integrityConcern) {
      await sendRedFlagAlert({
        candidate,
        assessment: candidate.assessments,
        result,
        userEmail: ownerUser?.email,
        threshold,
      })
      console.log('[score] Red flag alert sent to:', ownerUser?.email)
    }
  } catch (alertErr) {
    console.error('[score] Red flag alert failed (non-fatal):', alertErr?.message)
  }

  // ── Plagiarism / shared-template detection ──────────────────────────────────
  // Hash 5-word shingles from each response, compare against existing patterns
  // for the same assessment, store this candidate's hashes for future checks.
  let patternMatch = null
  try {
    const crypto = await import('crypto')
    function shingleHashes(text) {
      const clean = String(text || '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      const words = clean.split(' ').filter(Boolean)
      if (words.length < 5) return []
      const set = new Set()
      for (let i = 0; i <= words.length - 5; i++) {
        const shingle = words.slice(i, i + 5).join(' ')
        set.add(crypto.createHash('sha1').update(shingle).digest('hex').slice(0, 16))
      }
      return Array.from(set)
    }
    function jaccard(a, b) {
      if (!a.length || !b.length) return 0
      const setA = new Set(a)
      let inter = 0
      for (const h of b) if (setA.has(h)) inter++
      const union = setA.size + b.length - inter
      return union === 0 ? 0 : inter / union
    }

    const candidatePatterns = scenarios.map((sc, i) => {
      const resp = responses.find(r => r.scenario_index === i)
      return { scenario_index: i, hashes: shingleHashes(resp?.response_text) }
    })

    // Pull existing patterns for this assessment (other candidates only)
    const { data: existing } = await adminClient
      .from('response_patterns')
      .select('candidate_id, scenario_index, phrase_hash')
      .eq('assessment_id', candidate.assessment_id)
      .neq('candidate_id', candidateId)
      .limit(2000)

    let bestSim = 0
    let bestScenario = null
    if (Array.isArray(existing) && existing.length > 0) {
      for (const row of existing) {
        let theirHashes = []
        try { theirHashes = JSON.parse(row.phrase_hash) } catch { theirHashes = [] }
        if (!Array.isArray(theirHashes) || theirHashes.length === 0) continue
        const ours = candidatePatterns.find(p => p.scenario_index === row.scenario_index)
        if (!ours || ours.hashes.length === 0) continue
        const sim = jaccard(ours.hashes, theirHashes)
        if (sim > bestSim) { bestSim = sim; bestScenario = row.scenario_index }
      }
    }
    if (bestSim >= 0.7) {
      patternMatch = {
        similarity: Math.round(bestSim * 100),
        scenario_index: bestScenario,
        message: 'This response shares significant similarities with a previously submitted assessment for this role. This may indicate shared answers or a common AI template.',
      }
      console.log('[score] Plagiarism flag: similarity', patternMatch.similarity, '% on scenario', bestScenario)
    }

    // Store this candidate's hashes
    const inserts = candidatePatterns
      .filter(p => p.hashes.length > 0)
      .map(p => ({
        assessment_id: candidate.assessment_id,
        candidate_id:  candidateId,
        scenario_index: p.scenario_index,
        phrase_hash:    JSON.stringify(p.hashes),
      }))
    if (inserts.length > 0) {
      await adminClient.from('response_patterns').insert(inserts)
    }
  } catch (e) {
    console.error('[score] Plagiarism check failed (non-fatal):', e?.message)
  }

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
        pattern_match:          patternMatch,
      }
    }).eq('candidate_id', candidateId)
  } catch {
    // integrity column not yet added , ALTER TABLE results ADD COLUMN IF NOT EXISTS integrity JSONB;
  }

  // ── Coaching Plan generation (PRODICTA x Alchemy Training UK) ───────────────
  try {
    console.log('[score] Generating 90-day coaching plan...')
    const coachingPrompt = `You are Liz Harris, Founder of Alchemy Training UK, working in partnership with PRODICTA. Produce a 90-Day Hiring Manager Coaching Plan for a new hire, based on their actual assessment data.

CANDIDATE: ${candidate.name}
ROLE: ${assessment.role_title}
JOB DESCRIPTION: ${String(assessment.job_description || '').slice(0, 1500)}

ASSESSMENT OUTPUTS:
Strengths: ${JSON.stringify(result.strengths || []).slice(0, 1200)}
Watch-outs: ${JSON.stringify(result.watchouts || []).slice(0, 1400)}
Predicted Outcomes: ${JSON.stringify(result.predictions || {})}
Reality Timeline: ${JSON.stringify(result.reality_timeline || {})}
Execution Reliability: ${JSON.stringify(result.execution_reliability || {})}
Training Potential: ${JSON.stringify(result.training_potential || {})}

First, analyse the JD and assessment results to identify 3 to 5 key stakeholder relationships for this role. For each stakeholder, describe: who they are (role title, not a personal name), what the new hire needs from them, what they need from the new hire, where the pressure point is in that relationship, and what the manager should watch for based on the PRODICTA assessment findings. The stakeholders must be specific to this role and sector. A care worker gets service users, families, and a safeguarding lead. A sales executive gets clients, a sales director, and a marketing team. A management accountant gets a finance director, sales team, and external auditors. Adapt to whatever the JD describes.

Then create a coaching plan for the HIRING MANAGER to run across three phases. Tie every SMART objective, watch-out guide and prediction check back to the specific assessment data above, using the candidate's actual name.

WORKSHOP SELECTION LOGIC (pick the most relevant Alchemy workshop per phase):
1) "From Technical Expert to People Leader", for technically strong hires moving into leadership or stakeholder-heavy work.
2) "Bullet-proofing Your Probation Process", when watch-outs, churn risk or underperformance risk are elevated, or execution reliability is low.
3) "Mastering Hiring Interviews", when the hiring manager themselves will be running interviews or needs to sharpen judgement and questioning.

Phase 1 usually targets the biggest early risk. Phase 2 builds depth where potential is high. Phase 3 focuses on embedding and legally defensible decisions.

Liz contact for every Alchemy check-in CTA: liz@alchemytraininguk.com and alchemytraininguk.com.

Return ONLY strict JSON, no preamble, no markdown, with EXACTLY this shape:
{
  "key_stakeholders": [
    {
      "role": "e.g. Finance Director",
      "what_hire_needs_from_them": "",
      "what_they_need_from_hire": "",
      "pressure_point": "",
      "watch_for": ""
    }
  ],
  "phase1": {
    "title": "Phase 1, Foundations",
    "days": "Days 1 to 30",
    "smart_objectives": [{"objective":"","measure":"","deadline":"","linked_to":""}],
    "weekly_checkin_structure": "",
    "watch_out_guides": [{"watch_out":"","what_to_look_for":"","when_likely":"","what_to_do":""}],
    "recommended_training": {"workshop":"","why":"","contents":""},
    "alchemy_checkin": ""
  },
  "phase2": {
    "title": "Phase 2, Momentum",
    "days": "Days 31 to 60",
    "key_reviews": "",
    "prediction_checks": [{"prediction":"","question":""}],
    "sbi_feedback_prompts": [""],
    "warning_signs": [""],
    "recommended_training": {"workshop":"","why":"","contents":""},
    "alchemy_checkin": ""
  },
  "phase3": {
    "title": "Phase 3, Decision",
    "days": "Days 61 to 90",
    "key_reviews": "",
    "decision_framework": "",
    "legal_defensibility_checklist": [""],
    "managers_declaration": "",
    "era_2025_note": "",
    "recommended_training": {"workshop":"","why":"","contents":""},
    "alchemy_checkin": ""
  }
}

RULES:
- UK English spelling (behaviour, organisation, prioritise, recognise).
- No emoji anywhere.
- No em dashes or en dashes. Use commas and full stops.
- PRODICTA always in all caps.
- Use ${candidate.name} by name in the content, not "the candidate".
- Base every item on the actual assessment data provided above.
- Keep each string concise but specific.`

    const coachingMsg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: coachingPrompt }],
    })
    let coachingText = coachingMsg.content[0].text.trim()
    coachingText = coachingText.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim()
    coachingText = coachingText.replace(/[\u2014\u2013]/g, ', ')
    const coachingPlan = JSON.parse(coachingText)
    await adminClient.from('results').update({ coaching_plan: coachingPlan }).eq('candidate_id', candidateId)
    console.log('[score] Coaching plan saved.')
  } catch (coachErr) {
    console.error('[score] Coaching plan generation failed (non-fatal):', coachErr?.message)
  }

  console.log('[score] Scoring complete for candidate:', candidateId, '| Score:', result.overall_score)
  return { success: true, overall_score: result.overall_score }
}

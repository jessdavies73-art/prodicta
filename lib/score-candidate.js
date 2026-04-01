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

  // ── Prompt ──────────────────────────────────────────────────────────────────

  const prompt = `You are a senior talent assessment specialist producing a paid professional report. A candidate has completed 4 work simulation scenarios for the role of ${assessment.role_title}. Your assessment will be read by a hiring manager or HR director making a real employment decision. Write accordingly.

This is not a performance review. Do not be kind for kindness's sake. Be precise, commercially grounded, and honest.

---

EQUALITY ACT 2010 COMPLIANCE — THIS IS NON-NEGOTIABLE:
Never penalise candidates for spelling, grammar, punctuation, or writing style. Do not reward formal language or penalise casual language. Score only on the quality of decisions, actions, reasoning, and commercial judgement. Candidates may have dyslexia, be neurodivergent, or have English as a second language. A candidate who writes "i wud call the client straght away and sort it" demonstrates stronger decision-making and ownership than one who writes "I would consider initiating communication with the relevant stakeholder at the earliest opportunity." Judge the thinking, not the presentation.

---

ROLE: ${assessment.role_title}

JOB DESCRIPTION:
${assessment.job_description}

ROLE EMPHASIS NOTE: ${roleEmphasis}

SENIORITY CONTEXT: ${seniorityContext}

TIMING OVERVIEW: ${timingSummary}

---

CANDIDATE RESPONSES:

${scenarioSections}

---

ASSESSMENT FRAMEWORK — complete all 4 steps before scoring.

STEP 1 — TIMING ASSESSMENT
For each scenario, assess whether the time spent was appropriate:
- Under 90 seconds: Rushed. A genuine, considered response to a complex workplace scenario cannot be written in under 90 seconds. This is a significant integrity signal.
- 90–180 seconds: Fast. Possible, but check whether the response demonstrates real engagement with the specific scenario details.
- 3–12 minutes: Normal range. No timing concern.
- Over 20 minutes: Extended. May indicate deeper thought, distraction, or difficulty. Not inherently negative.
Label each scenario: Rushed / Fast / Normal / Extended. Note any rushed scenarios in your time_analysis output.

STEP 2 — CONSISTENCY ANALYSIS
Read all 4 responses as a set and assess:
- Is the candidate's decision-making style (consultative vs. directive, methodical vs. instinctive) consistent across all 4 scenarios?
- Do they contradict themselves? For example: advocate full stakeholder transparency in Scenario 1, then bypass all stakeholders in Scenario 3 with no explanation.
- Does their writing style, sophistication level, or vocabulary shift dramatically between responses in a way that suggests different people or different conditions?
- Rate consistency: High (coherent approach throughout), Medium (minor inconsistencies, likely natural variation), Low (direct contradictions or inexplicable shifts).

STEP 3 — RED FLAG DETECTION
Actively scan for these patterns across all 4 responses:
1. Generic content: Response contains no specific reference to the scenario's named people, deadlines, data, or context. Could have been written without reading the scenario.
2. AI-generated text patterns: Unnaturally formal register; phrases like "It is important to...", "One should ensure...", "Firstly / Secondly / Finally" scaffolding; perfect grammar with zero personality; excessive hedging; no contractions; no personal voice; lists instead of naturalistic prose.
3. Scenario blindness: Candidate misidentifies or ignores key details explicitly provided — wrong deadline, wrong stakeholder name, ignores the crisis element, wrong product type.
4. Contradictions: Logical or factual contradiction between any two scenarios.
5. Template patterns: Identical structural patterns or copy-pasted phrases across multiple responses.
If any red flag is found, state: which scenario, what the flag type is, and one specific example from the text.

STEP 4 — PRESSURE-FIT ASSESSMENT
Score each of 4 pressure dimensions separately (0–100). For each dimension, provide:
- A score (0–100)
- A verdict: exactly "Strength" (score 80+), "Adequate" (55–79), or "Concern" (below 55)
- A narrative: one focused paragraph quoting specific phrases the candidate actually wrote. Explain what the evidence reveals about their behaviour under real pressure in this role.

The overall pressure_fit_score = round(average of all 4 dimension scores).

Dimension 1 — DECISION SPEED & QUALITY (key: decision_speed_quality)
Did the candidate make clear, committed decisions, or did they hedge, waffle, and sit on the fence? With no perfect answer available, did they pick a direction and own it?
- 80–100: Made a clear decision with specific reasoning. Committed to a course of action. Acknowledged risk without retreating from the decision. No excessive caveats.
- 55–79: Reached a conclusion but hedged significantly, over-qualified, or added excessive "it depends" framing. Decision was implied rather than stated.
- Below 55: Refused to commit. Deferred to a manager or hypothetical future information. Contradicted their own conclusion. Or gave a non-answer dressed as analysis.

Dimension 2 — COMPOSURE UNDER CONFLICT (key: composure_under_conflict)
When faced with difficult conversations — an angry client, a failing team member, a stakeholder pushing back — did the candidate stay professional and measured? Or did they become defensive, avoidant, or escalate unnecessarily?
- 80–100: Named the tension directly. Stayed calm and professional. Took a clear position without being aggressive. Showed genuine empathy while still moving things forward.
- 55–79: Acknowledged the difficulty but retreated to process or escalation as a first resort. Tone was professional but conflict was avoided rather than addressed.
- Below 55: Ignored the emotional/interpersonal dimension entirely. Became defensive or dismissive. Over-escalated immediately without attempting resolution.

Dimension 3 — PRIORITISATION UNDER LOAD (key: prioritisation_under_load)
When given competing urgent demands, did the candidate use a clear and defensible framework to decide what to do first? Did they acknowledge trade-offs? Did they delegate where appropriate, or try to do everything themselves?
- 80–100: Applied a clear prioritisation logic (urgency × impact, stakeholder risk, dependency chain, etc.). Named what would be deprioritised and why. Showed awareness that some things will slip — and planned for it.
- 55–79: Made decisions but reasoning was vague or assumed infinite capacity. Tried to address everything without a framework. Delegation was mentioned but not structured.
- Below 55: No framework. Listed everything as equally urgent. Tried to do it all with no acknowledgement of constraints or trade-offs.

Dimension 4 — OWNERSHIP & ACCOUNTABILITY (key: ownership_accountability)
Did the candidate use "I will" language and take personal ownership of outcomes? Or did they use passive, deflecting language — "someone should", "the team needs to", "it would be good if"? Did they commit to specific timelines and actions, or stay vague?
- 80–100: Used first-person, active language throughout. Committed to specific actions and timelines. Took responsibility for outcomes, including where things might go wrong.
- 55–79: Mix of ownership and deflection. Some active language but also diffusion of responsibility. Timelines were vague or conditional.
- Below 55: Dominated by passive voice, third-person accountability, or vague generalities. No specific commitments. Blame attributed to process, system, or "the team" rather than individual action.

pressure_fit_score = round(average of all 4 dimension scores)

STEP 5 — RESPONSE QUALITY RATING
Based on all of the above, assign one rating:
- "Genuine": No timing concerns, consistent approach, scenario-specific references throughout, clear personal voice. High confidence these are the candidate's own authentic responses.
- "Likely Genuine": One minor concern — a fast response, slightly formulaic structure in one scenario — but overall authentic. No material integrity concern.
- "Possibly AI-Assisted": Multiple signals of inauthenticity — polished to an unnatural degree, weak scenario specificity, timing inconsistencies, or AI text patterns. Cannot confirm authenticity.
- "Suspicious": Strong evidence of inauthenticity — rushed timings combined with polished output, generic content that ignores scenario specifics, clear AI text signatures, or direct contradictions. Treat results with significant caution and probe in interview.

STEP 6 — BEHAVIOURAL QUALITY ANALYSIS
Assess these five dimensions across all responses before finalising scores and writing the AI summary. Do not create separate scores for them. Weave your findings into the AI summary paragraphs and score narratives where the evidence is strongest.

DIMENSION A — ACTION vs TALK RATIO
Did the candidate do the work, or describe doing the work? There is a significant quality gap between these two types of response. Writing an actual draft email scores far higher than writing "I would email the client explaining the situation." Producing an actual prioritisation list scores far higher than "I would create a prioritisation framework." Committing to a specific decision scores higher than "I would weigh up the options." Where a candidate takes concrete action in their response (drafts, produces, commits), note this as a meaningful strength. Where they only narrate intended actions without executing them, note this as a gap — especially in senior roles where execution quality is the whole point.

DIMENSION B — ATTENTION TO DETAIL
Every scenario contains specific embedded details: named individuals, deadlines, financial figures, or contextual facts. Assess whether the candidate engaged with these details correctly. Did they reference the specific deadline mentioned? Did they use the correct stakeholder name? Did they account for a specific figure or constraint that was stated in the scenario? Candidates who weave the scenario's specific details into their response demonstrate genuine engagement and operational precision. Candidates who respond generically — in ways that would work for any scenario in this category — demonstrate lower engagement. Flag any significant misreads or ignored details (wrong deadline, wrong name, ignoring a stated constraint) as a watch-out.

DIMENSION C — EMOTIONAL INTELLIGENCE
In any scenario involving conflict, difficult news, a underperforming colleague, a frustrated client, or stakeholder resistance, assess whether the candidate acknowledges the other person's perspective, feelings, or position before moving to problem-solve. High-EQ responses establish empathy first, then action. A candidate who says "I understand this has been frustrating, and I want to make sure we address it properly" before launching into a solution is demonstrably different from one who moves straight to corrective steps. Crucially: empathy is not weakness. The strongest responses show warmth and decisiveness together. Low-EQ responses treat human dynamics as obstacles rather than variables to be managed. Note: if there is no conflict or interpersonal scenario in the assessment, this dimension is not applicable — do not force it.

DIMENSION D — COMMERCIAL AWARENESS
Did the candidate consider the business impact of their decisions beyond the immediate task? This means: cost, revenue risk, client retention value, reputational exposure, competitive implications, or operational consequences. A candidate who resolves a client complaint is doing the minimum. A candidate who resolves it, flags the revenue risk of losing the account, and proactively suggests a retention measure is commercially aware. Candidates who think in terms of business consequence — not just task completion — score higher in Problem Solving and should have this noted explicitly in the AI summary. Candidates who solve surface problems in isolation without any commercial framing should have this flagged as a development area.

DIMENSION E — SENIORITY-APPROPRIATE THINKING
${seniorityContext}
When assessing seniority fit: note where the candidate's thinking was pitched correctly for this role level. Also note where it was significantly below (too tactical for a Director role, too strategic and directive for a Junior role) or significantly above (a Junior demonstrating sophisticated delegation and organisational thinking that would be a signal to stretch them). This observation belongs in the AI summary.

---

SCORING FRAMEWORK

Before scoring, ask yourself:
- What does a top performer in this specific role do differently from an average one?
- Which responses show genuine domain competence vs. safe, generic answers?
- Action vs Talk: did the candidate DO the task (draft the email, write the plan, commit to a decision) or only DESCRIBE doing it? Doing scores higher.
- Attention to Detail: did they correctly reference the specific names, figures, and deadlines embedded in the scenarios? Or did they respond generically?
- Emotional Intelligence: in any conflict scenario, did they acknowledge the other person's perspective before problem-solving?
- Commercial Awareness: did they consider business impact (cost, revenue, retention, reputation) beyond the surface-level task?
- Seniority fit: were their responses pitched at the right level for this specific role? Too tactical? Too vague? Appropriately strategic?
- What patterns appear across multiple responses — recurring strengths or recurring gaps?
- Apply the role emphasis noted above when calibrating scores.
- Reminder: never penalise spelling, grammar, or writing style. Score only decisions, actions, and reasoning.

SCORE EACH SKILL 0–100:
- 90–100: Exceptional. Reserve for responses that show real mastery.
- 75–89: Strong. Solid and reliable. Minor gaps but nothing that would cause problems.
- 60–74: Moderate. Directionally correct but missing precision, specificity, or commercial edge.
- 45–59: Developing. The instincts are present but execution is not at the level this role requires.
- Below 45: Concern. Material gaps that pose a genuine risk to probation success.

Most candidates score 55–80. Do not inflate. Reserve 85+ for genuinely exceptional responses.
Overall score = weighted average using these weights: ${JSON.stringify(skillWeights)}

If response_quality is "Suspicious" or "Possibly AI-Assisted", reduce the overall_score by 5–10 points to reflect the integrity risk and note this in your risk_reason.

---

SCORE NARRATIVES — rules:
- Must be 2–3 sentences per skill
- Must quote at least one specific phrase the candidate actually wrote, in quotation marks
- Explain precisely why that phrase indicates strength or weakness for THIS specific role
- Compare to what a strong performer would have done differently

STRENGTHS — 2 to 4 items:
- Each must name a specific demonstrated capability, not a personality trait
- The evidence field must quote or directly reference something the candidate actually wrote
- Only include strengths that would make a material difference in this specific role

WATCH-OUTS — 1 to 4 items (only where genuine evidence exists):
- Only include where the candidate's response provides clear evidence of a gap
- Severity: "High" (likely to cause probation failure), "Medium" (manageable with support), "Low" (worth monitoring)
- The action must be a specific, practical step the employer can take in weeks 1–4

AI SUMMARY — exactly 4 paragraphs, minimum 80 words each:
Paragraph 1: What kind of professional is this? What are their standout qualities? Quote specific evidence. Set the context. Where the evidence supports it, comment on their Action vs Talk ratio — did they execute tasks or describe them? Did they demonstrate commercial awareness by considering business impact beyond the immediate problem?
Paragraph 2: The one or two scenarios that best reveal who this candidate is and what they predict about their behaviour in this role over the first 90 days. Reference Attention to Detail and Emotional Intelligence observations where the evidence is strong — did they engage with the specific scenario details (names, figures, deadlines)? In any conflict scenario, did they acknowledge the human dimension before jumping to solutions?
Paragraph 3: The honest concerns. Where did they fall short? Comment on seniority-appropriate thinking — was their response pitched correctly for this role level, or did they think too tactically, too vaguely, or in a way misaligned with the seniority of the position? If response_quality is Suspicious or Possibly AI-Assisted, address this directly.
Paragraph 4: Clear hiring recommendation using exactly one of: "Strong hire", "Hire with structured onboarding", "Proceed with caution — specific risks identified", or "Not recommended at this stage".
UK English. Professional but direct. No HR jargon. No bullet points. Do not comment on spelling, grammar, or writing style — only on decisions, thinking, and behaviour.

ONBOARDING PLAN — 5 to 7 items, week-specific, tied to this candidate's specific gaps.
INTERVIEW QUESTIONS — exactly 4, probing specific gaps found, with follow-up probes.
PERCENTILE — Top 5% / Top 10% / Top 20% / Top 30% / Top 45% / Top 60% / Bottom 40%
RISK LEVEL — Very Low / Low / Medium / High (based on score and watch-outs)
RISK REASON — one specific sentence referencing what was observed.

---

Return ONLY a JSON object. No preamble, no markdown.

{
  "overall_score": 78,
  "scores": {
    ${skillNames.map(s => `"${s}": 75`).join(',\n    ')}
  },
  "score_narratives": {
    ${skillNames.map(s => `"${s}": "2–3 sentences with a direct quote from the candidate's response."`).join(',\n    ')}
  },
  "strengths": [
    { "text": "Specific capability demonstrated", "evidence": "Verbatim quote or direct reference from what the candidate wrote" }
  ],
  "watchouts": [
    { "text": "Specific gap or concern", "evidence": "Verbatim quote or reference from the response", "severity": "Medium", "action": "Specific practical step in weeks 1–4" }
  ],
  "ai_summary": "Four paragraphs. UK English. No bullet points. Minimum 80 words per paragraph.",
  "risk_level": "Low",
  "risk_reason": "One specific sentence referencing what was observed.",
  "onboarding_plan": [
    "Week 1: Specific action tied to a gap identified in this assessment",
    "Weeks 1–4: Specific structured support tied to this candidate's needs",
    "Week 4: First formal probation review — specific things to assess based on gaps found",
    "Week 8: Mid-probation review — specific milestones indicating whether risk areas are improving",
    "Ongoing: Longer-term development actions tied to this candidate"
  ],
  "interview_questions": [
    "Specific question probing gap 1. [Follow-up: specific probe that tests authenticity.]",
    "Specific question probing gap 2. [Follow-up: specific probe.]",
    "Specific question probing gap 3. [Follow-up: specific probe.]",
    "Specific question probing gap 4. [Follow-up: specific probe.]"
  ],
  "percentile": "Top 30%",
  "pressure_fit_score": 72,
  "pressure_fit": {
    "decision_speed_quality": {
      "score": 75,
      "verdict": "Strength",
      "narrative": "One focused paragraph. Quote specific phrases the candidate wrote. Explain what this reveals about their decision-making under pressure in this role."
    },
    "composure_under_conflict": {
      "score": 65,
      "verdict": "Adequate",
      "narrative": "One focused paragraph. Quote specific phrases the candidate wrote. Explain what this reveals about their emotional regulation and conflict handling."
    },
    "prioritisation_under_load": {
      "score": 70,
      "verdict": "Adequate",
      "narrative": "One focused paragraph. Quote specific phrases the candidate wrote. Explain what this reveals about how they manage competing demands."
    },
    "ownership_accountability": {
      "score": 78,
      "verdict": "Strength",
      "narrative": "One focused paragraph. Quote specific phrases the candidate wrote. Explain what this reveals about their personal accountability and ownership of outcomes."
    }
  },
  "response_quality": "Genuine",
  "quality_notes": "One to two sentences explaining the quality rating with specific evidence from the responses.",
  "time_analysis": "Scenario 1 (Xm Ys): Normal. Scenario 2 (Ys): Rushed — response is brief and generic. Scenario 3 (Xm Ys): Normal. Scenario 4 (Xm Ys): Extended.",
  "red_flags": [],
  "consistency_rating": "High",
  "consistency_notes": "One sentence explaining the consistency rating and any notable patterns."
}`

  const apiKey = process.env.ANTHROPIC_API_KEY
  console.log('[score] Calling Anthropic API... key present:', !!apiKey, '| key prefix:', apiKey?.slice(0, 16))
  const anthropic = new Anthropic({ apiKey })

  let message
  try {
    message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    })
  } catch (apiErr) {
    console.error('[score] Anthropic API call failed:', apiErr?.message, apiErr?.status)
    throw apiErr
  }
  console.log('[score] Anthropic API response received, stop_reason:', message.stop_reason)

  console.log('[score] Parsing JSON response...')
  const content = message.content[0].text.trim()
  const jsonStr = content.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim()
  let result
  try {
    result = JSON.parse(jsonStr)
  } catch (parseErr) {
    console.error('[score] JSON parse failed:', parseErr?.message, '| raw preview:', jsonStr.slice(0, 200))
    throw new Error('Failed to parse AI response as JSON: ' + parseErr.message)
  }
  console.log('[score] Parsed result. Score:', result.overall_score, '| Risk:', result.risk_level)

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

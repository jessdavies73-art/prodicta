import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { SCORING_DIMENSIONS, SCORING_DIMENSION_NAMES } from '@/lib/dimensions'
import { PD_SCENARIO_VERSION } from '@/lib/constants'
import { detectRoleProfile } from '@/lib/role-profile-detector'
import { generateScenario } from '@/lib/scenario-generator'

// Scenario generation calls the Anthropic API which can take 30-60s for
// Strategy-Fit (4 scenarios). Allow up to 120s before Vercel kills the function.
export const maxDuration = 120

// Response headers signalling the client/intermediaries may hold the socket
// open for the full streaming duration.
const keepAliveHeaders = {
  'Connection': 'keep-alive',
  'Keep-Alive': 'timeout=120',
}

// Race a promise against a hard timeout so a single Claude call can never
// hang the whole function past its maxDuration.
function raceWithTimeout(promise, ms, label) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

// Map assessment mode to a sensible max output token budget. Short modes get
// small budgets so generation returns quickly; complex modes get more room.
// Scenario counts per mode:
//   rapid:    1 scenario      (quick signal, no full narrative report)
//   quick:    2 scenarios     (Speed-Fit, full scored report)
//   standard: 3 scenarios     (Depth-Fit, Core Task + Pressure Test + Judgment Call)
//   advanced: 4 scenarios     (Strategy-Fit, plus workspace simulation generated
//                              by /api/assessment/[id]/workspace-content)
const MAX_TOKENS_BY_MODE = {
  rapid:    600,
  quick:    2000,
  standard: 3000,
  advanced: 4096,
}

const JD_MAX_CHARS = 2000
const CONTEXT_ANSWER_MAX_CHARS = 200

// Required addition to every scenario JSON. Tells the model to design the
// scenario so a three-action ranked answer is the natural response, and to
// emit an `interruption` field that the candidate-side runtime can choose to
// fire (with ~30% probability) after the first ranked answer is submitted.
// Persisted as `responses.ranked_actions` and `responses.interruption_response`
// per the migration in supabase/migrations/add_ranked_actions.sql.
const RANKED_ACTIONS_AND_INTERRUPTION_BLOCK = `
═══════════════════════════════════════════
RANKED ACTIONS PLUS IN-SCENARIO INTERRUPTION
═══════════════════════════════════════════

Every scenario in this assessment is answered as THREE RANKED ACTIONS plus a written justification per action, not as a single block of free text. The candidate writes:
- Action 1, their first move, plus a 1 to 2 sentence justification
- Action 2, their second move, plus a 1 to 2 sentence justification
- Action 3, their third move, plus a 1 to 2 sentence justification

Design every scenario so that three discrete, sequenced actions form a natural answer. Avoid scenarios where the right answer is a single decision or a long meeting plan. The trade-off described in LAYER B must be reflected in the order: a candidate who picks a defensible ranking will sequence the higher-cost or higher-information action correctly.

Additionally, every scenario MUST carry an "interruption" field. The interruption is a short role-specific event (one or two sentences) that the platform may fire after the candidate has submitted their first action, asking them to reconsider their ranking. The interruption must be plausible for THIS scenario (not a generic "your manager calls"), and it should genuinely test whether the original ranking holds up.

Add this field to EVERY scenario object alongside the existing fields and the forced_choice slot:

"interruption": {
  "event": "One or two sentences describing what has just happened, role-specific to this scenario, written so it could plausibly land mid-task.",
  "question": "Does this change your ranking? If so, restate your new top three in order and explain why."
}

Do NOT include the candidate's three ranked actions in the scenario JSON. Those are the candidate's work. Your output describes the situation, the trade-off, and the possible interruption only.
`

// Pre-scenario pipeline. Pulls a structured Job Breakdown from the JD using
// claude-sonnet-4-5 so scenarios are built from the actual tasks, disruptions,
// decisions, and failure points specific to this role. Returns null on any
// failure so the caller can fall back to the inline Job DNA extraction baked
// into each scenario prompt.
async function extractJobBreakdown(client, role_title, job_description, context_answers) {
  const contextBlock = context_answers && Object.values(context_answers).some(v => v?.trim())
    ? `\n\nADDITIONAL CONTEXT FROM HIRING MANAGER:\n${Object.entries(context_answers)
        .map(([, v]) => v?.trim())
        .filter(Boolean)
        .map(v => `- ${v}`)
        .join('\n')}`
    : ''

  const prompt = `You are an expert role analyst. Read the job description below and produce a structured Job Breakdown that another AI will use as the source of truth when designing work simulation scenarios.

ROLE: ${role_title}

JOB DESCRIPTION:
${job_description}${contextBlock}

Extract four buckets. Be concrete, role-specific, and verb-led. Do NOT use generic filler. If the JD does not state something explicitly, infer the most realistic answer for this exact role and seniority.

1. TASKS: what this person actually does day to day. Concrete, verb-led, role-specific. (5 to 8 items)
2. DISRUPTIONS: what interrupts the work. Other people, deadlines, unexpected requests, system failures, conflicting priorities. (4 to 6 items)
3. DECISIONS: what the person must choose. Not "make decisions" generically, but specific decisions like "decide whether to release figures on deadline when discrepancy is unresolved." (4 to 6 items)
4. FAILURE_POINTS: what would cause them to fail. Specific mistakes, omissions, or wrong calls that would lose money, break trust, or create risk. (4 to 6 items)

Return JSON only, no prose, no code fences:
{
  "tasks": ["string", ...],
  "disruptions": ["string", ...],
  "decisions": ["string", ...],
  "failure_points": ["string", ...]
}

Write in UK English. No em dashes or en dashes. No emoji.`

  try {
    const msg = await raceWithTimeout(
      client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      }),
      30000,
      'job breakdown extraction'
    )
    const text = msg?.content?.[0]?.text || ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return null
    const parsed = JSON.parse(match[0])
    const arr = (v) => Array.isArray(v) ? v.map(String).map(s => s.trim()).filter(Boolean) : []
    const breakdown = {
      tasks: arr(parsed.tasks),
      disruptions: arr(parsed.disruptions),
      decisions: arr(parsed.decisions),
      failure_points: arr(parsed.failure_points),
    }
    if (!breakdown.tasks.length && !breakdown.disruptions.length && !breakdown.decisions.length && !breakdown.failure_points.length) {
      return null
    }
    return breakdown
  } catch (err) {
    console.error('[generate] job breakdown extraction failed', err?.message)
    return null
  }
}

function formatJobBreakdownBlock(breakdown) {
  if (!breakdown) return ''
  const fmt = (label, items) => items?.length
    ? `${label}:\n${items.map(x => `- ${x}`).join('\n')}`
    : null
  const sections = [
    fmt('TASKS', breakdown.tasks),
    fmt('DISRUPTIONS', breakdown.disruptions),
    fmt('DECISIONS', breakdown.decisions),
    fmt('FAILURE POINTS', breakdown.failure_points),
  ].filter(Boolean)
  if (!sections.length) return ''
  return `\nJOB BREAKDOWN (extracted in a pre-pass, treat as authoritative):\n${sections.join('\n\n')}\nUse these tasks, disruptions, decisions, and failure points as the source of truth when building scenarios. Every scenario must trace back to at least one item from each bucket where possible.\n`
}

// Dynamic Dimension Detection. Picks 5 to 7 scoring dimensions from the master
// list in lib/dimensions.js for this specific role, weights them to total 100,
// and records a reason per dimension. Reads the Job Breakdown plus JD plus
// hiring-manager context. Uses claude-sonnet-4-5, max_tokens 600, temperature
// 0.3 for consistency. Returns null on any failure so the caller falls back
// to legacy fixed-family scoring.
async function detectScoringDimensions(client, role_title, job_description, context_answers, jobBreakdown) {
  const breakdownBlock = formatJobBreakdownBlock(jobBreakdown)
  const contextBlock = context_answers && Object.values(context_answers).some(v => v?.trim())
    ? `\n\nADDITIONAL CONTEXT FROM HIRING MANAGER:\n${Object.entries(context_answers)
        .map(([, v]) => v?.trim())
        .filter(Boolean)
        .map(v => `- ${v}`)
        .join('\n')}`
    : ''

  const masterList = SCORING_DIMENSIONS
    .map(d => `- ${d.name}: ${d.definition}`)
    .join('\n')

  const prompt = `You are an expert role analyst. Pick the scoring dimensions PRODICTA should use to score candidates for this specific role.

ROLE: ${role_title}

JOB DESCRIPTION:
${job_description}${contextBlock}
${breakdownBlock}

MASTER LIST OF AVAILABLE DIMENSIONS (you MUST pick from this list, exact names only):
${masterList}

Your task:
1. Pick the 5 to 7 dimensions from the master list above that matter most for THIS role. Do not invent new dimensions and do not rename existing ones.
2. Assign a weight to each dimension. The weights MUST sum to exactly 100.
3. Give a one-sentence reason per dimension explaining why it was selected for THIS role, citing the JD or the Job Breakdown explicitly. The reason is the audit trail when a hiring decision is challenged.

Hard constraints:
- Pick between 5 and 7 dimensions. No fewer, no more.
- Weights must be integers and sum to exactly 100.
- Use the exact dimension names from the master list. Names are case-sensitive.
- Reasons must be concrete and reference the role. Do not write generic justifications like "important for any job".
- UK English. No em dashes. No emoji.

Return JSON only, no prose, no code fences:
{
  "dimensions": [
    {"name": "string from master list", "weight": 25, "reason": "one sentence tied to this role"},
    ...
  ]
}`

  try {
    const msg = await raceWithTimeout(
      client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 600,
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }],
      }),
      30000,
      'dimension detection'
    )
    const text = msg?.content?.[0]?.text || ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return null
    const parsed = JSON.parse(match[0])
    if (!Array.isArray(parsed?.dimensions)) return null

    const validNames = new Set(SCORING_DIMENSION_NAMES)
    const cleaned = parsed.dimensions
      .map(d => ({
        name: typeof d?.name === 'string' ? d.name.trim() : '',
        weight: Number.isFinite(d?.weight) ? Math.round(d.weight) : 0,
        reason: typeof d?.reason === 'string' ? d.reason.trim() : '',
      }))
      .filter(d => validNames.has(d.name) && d.weight > 0 && d.reason)

    if (cleaned.length < 5 || cleaned.length > 7) return null

    // Normalise weights to total exactly 100. The model usually gets this
    // right, but rounding drift can leave it at 99 or 101; correct on the
    // largest entry without nudging anything below 5.
    const total = cleaned.reduce((n, d) => n + d.weight, 0)
    if (total !== 100) {
      const drift = 100 - total
      cleaned.sort((a, b) => b.weight - a.weight)
      cleaned[0].weight = Math.max(5, cleaned[0].weight + drift)
    }

    return { dimensions: cleaned }
  } catch (err) {
    console.error('[generate] dimension detection failed', err?.message)
    return null
  }
}

// Generates High/Mid/Low scoring anchors for each detected dimension, tailored
// to the actual role. "Accuracy" for a nuclear engineer differs from "Accuracy"
// for a graphic designer; the anchors capture that. Stored on
// assessments.dimension_rubrics for audit and used by lib/score-candidate.js
// in the Call 1 scoring prompt.
async function generateScoringRubrics(client, role_title, job_description, jobBreakdown, detectedDimensions) {
  if (!detectedDimensions?.dimensions?.length) return null

  const breakdownBlock = formatJobBreakdownBlock(jobBreakdown)
  const dimList = detectedDimensions.dimensions
    .map(d => `- ${d.name} (definition: ${SCORING_DIMENSIONS.find(x => x.name === d.name)?.definition || ''})`)
    .join('\n')

  const prompt = `You are writing scoring anchors for a candidate assessment.

ROLE: ${role_title}

JOB DESCRIPTION:
${job_description}
${breakdownBlock}

DIMENSIONS TO ANCHOR (use these exact names, do not add or rename):
${dimList}

For each dimension, write three anchors that describe what HIGH (80 to 100), MID (50 to 79), and LOW (under 50) performance looks like SPECIFICALLY in this role. Anchors must be concrete and reference the actual work. "Accuracy" for a nuclear engineer must read differently from "Accuracy" for a graphic designer. Each anchor should be one or two short sentences and contain at least one role-specific signal (a tool, a deliverable, a stakeholder, a failure mode).

Hard constraints:
- One rubric per dimension, exactly the names listed above.
- High, mid, and low anchors are required for every dimension.
- UK English. No em dashes. No emoji.

Return JSON only:
{
  "rubrics": [
    {
      "dimension": "string",
      "high_anchor": "what 80+ looks like in this role",
      "mid_anchor": "what 50 to 79 looks like in this role",
      "low_anchor": "what under 50 looks like in this role"
    },
    ...
  ]
}`

  try {
    const msg = await raceWithTimeout(
      client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 1200,
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }],
      }),
      45000,
      'rubric generation'
    )
    const text = msg?.content?.[0]?.text || ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return null
    const parsed = JSON.parse(match[0])
    if (!Array.isArray(parsed?.rubrics)) return null

    const wantedNames = new Set(detectedDimensions.dimensions.map(d => d.name))
    const cleaned = parsed.rubrics
      .map(r => ({
        dimension: typeof r?.dimension === 'string' ? r.dimension.trim() : '',
        high_anchor: typeof r?.high_anchor === 'string' ? r.high_anchor.trim() : '',
        mid_anchor: typeof r?.mid_anchor === 'string' ? r.mid_anchor.trim() : '',
        low_anchor: typeof r?.low_anchor === 'string' ? r.low_anchor.trim() : '',
      }))
      .filter(r => wantedNames.has(r.dimension) && r.high_anchor && r.mid_anchor && r.low_anchor)

    if (!cleaned.length) return null
    return { rubrics: cleaned }
  } catch (err) {
    console.error('[generate] rubric generation failed', err?.message)
    return null
  }
}

export async function POST(request) {
  // Tracks PAYG credit state so the outer catch can refund if a failure happens
  // after deduction. null means no deduction yet / not applicable.
  let creditRefundCtx = null
  let adminForRefund = null
  try {
    const body = await request.json()
    const {
      role_title,
      job_description: jobDescriptionRaw,
      skill_weights,
      save_as_template,
      template_name,
      context_answers: contextAnswersRaw,
      assessment_mode,
      location: locationRaw,
    } = body
    const location = typeof locationRaw === 'string' && locationRaw.trim()
      ? locationRaw.trim().slice(0, 120)
      : null

    // Trim oversized inputs so the prompt can't balloon past Claude/Vercel limits.
    // The JD cap is applied before it reaches any prompt template; the downstream
    // code keeps using the plain `job_description` / `context_answers` names.
    const job_description = typeof jobDescriptionRaw === 'string'
      ? jobDescriptionRaw.slice(0, JD_MAX_CHARS)
      : ''
    const context_answers = contextAnswersRaw && typeof contextAnswersRaw === 'object'
      ? Object.fromEntries(Object.entries(contextAnswersRaw).map(([k, v]) => [
          k,
          typeof v === 'string' ? v.slice(0, CONTEXT_ANSWER_MAX_CHARS) : v,
        ]))
      : contextAnswersRaw
    const employment_type = body.employment_type || 'permanent'
    // Per-assessment keying for the in-scenario interruption gate. 'candidate'
    // is the anti-gaming default (each candidate sees the curveball on
    // different scenarios). 'assessment' makes every candidate on this
    // assessment hit the curveball on the same scenarios, used for
    // apples-to-apples bulk-invite comparison.
    const interruption_keying = body.interruption_keying === 'assessment' ? 'assessment' : 'candidate'
    // Immersive add-on flag from the new-assessment page. Whether the buyer
    // attached the £25 Immersive add-on at create time. Together with mode
    // and the post-detection shell_family this drives the modular Workspace
    // gate below: Strategy-Fit office roles get the modular path by default;
    // cheaper-tier assessments get the modular path only when Immersive is
    // attached. Anything else stays on the legacy WorkspacePage.
    const immersive_enabled = body.immersive_enabled === true
    // Normalise mode: 'rapid' (1 scenario + prioritisation), 'quick' (2 scenarios), 'standard' (3 scenarios), 'advanced' (4 scenarios).
    const rawMode = (assessment_mode || 'standard').toLowerCase()
    let mode = ['rapid', 'quick', 'standard', 'advanced'].includes(rawMode) ? rawMode : 'standard'
    // isRapid/isQuick/isStandard/isAdvanced declared below, after the credit
    // check has had a chance to re-map `mode` (PAYG rapid-screen fallback).

    // Auth check
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })


    // ── Plan / credit check ──────────────────────────────────────────────────
    const adminClient = createServiceClient()

    // Safety net: if signup failed to create the public.users row, create an
    // emergency PAYG row so the FK on assessments.user_id does not break.
    const { data: userRow } = await adminClient
      .from('users')
      .select('id, plan, plan_type')
      .eq('id', user.id)
      .maybeSingle()

    if (!userRow) {
      console.error('[generate] no users row for', user.id, '- creating emergency row')
      await adminClient.from('users').upsert({
        id: user.id,
        email: user.email,
        plan: 'payg',
        plan_type: 'payg',
        subscription_status: 'payg',
        onboarding_complete: true,
      }, { onConflict: 'id' })
    }

    const { data: userProfile } = await adminClient
      .from('users')
      .select('plan, subscription_status')
      .eq('id', user.id)
      .maybeSingle()


    const PLAN_LIMITS = { starter: 10, professional: 30, business: 100, founding: null, growth: 30, agency: 100, scale: 100, payg: null }
    const planKey = (userProfile?.plan || 'starter').toLowerCase()
    const isPaygUser = planKey === 'payg' || userProfile?.plan_type === 'payg'
 // PAYG users never have a monthly limit, they are credit-gated only.
    // For everyone else, fall back to starter's 10/month when plan is unknown.
    const planLimit = isPaygUser ? null : (PLAN_LIMITS[planKey] ?? PLAN_LIMITS.starter)
    // An accidental `subscription_status = 'active'` on a PAYG row would
    // otherwise route the user through the plan-limit branch instead of
    // the credit check; guard explicitly against that.
    const activeSub = userProfile?.subscription_status === 'active' && !isPaygUser

    // Map mode to credit type
    const creditTypeMap = {
      rapid: 'rapid-screen',
      quick: 'speed-fit',
      standard: 'depth-fit',
      advanced: 'strategy-fit',
    }
    let creditType = creditTypeMap[mode]
    if (!creditType) {
      return NextResponse.json({ error: 'bad_mode', message: `Unknown assessment mode: ${mode}` }, { status: 400 })
    }

    if (activeSub && planLimit !== null) {
      // Check monthly usage against plan limit
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const { count } = await adminClient.from('assessments')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', startOfMonth)
      if ((count || 0) >= planLimit) {
        return NextResponse.json({ error: 'limit_reached', message: `Monthly assessment limit reached (${planLimit}). Upgrade your plan or purchase individual credits.` }, { status: 403 })
      }
    } else if (!activeSub) {
      // Pay-per-assessment: verify credit balance but do NOT deduct yet.
      // Deduction happens after the assessment is safely saved (see below),
      // and the outer catch refunds if anything fails after deduction.
      const { data: credit, error: creditErr } = await adminClient
        .from('assessment_credits')
        .select('credits_remaining')
        .eq('user_id', user.id)
        .eq('credit_type', creditType)
        .maybeSingle()

      // Fallback: if the requested credit_type has no balance, check whether
      // the user has rapid-screen credits we can spend instead. This lets a
      // PAYG user who only holds Rapid Screen credits still succeed even if
      // the client sent a different assessment_mode.
      const { data: rapidCredit } = creditType === 'rapid-screen'
        ? { data: credit }
        : await adminClient
            .from('assessment_credits')
            .select('credits_remaining')
            .eq('user_id', user.id)
            .eq('credit_type', 'rapid-screen')
            .maybeSingle()


      const requestedHasBalance = credit && credit.credits_remaining > 0
      const rapidHasBalance = rapidCredit && rapidCredit.credits_remaining > 0

      let chargedCreditType = creditType
      let chargedBalance = credit?.credits_remaining ?? 0

      if (!requestedHasBalance && rapidHasBalance) {
        // Downgrade: spend a rapid-screen credit and run in rapid mode.
        mode = 'rapid'
        creditType = 'rapid-screen'
        chargedCreditType = 'rapid-screen'
        chargedBalance = rapidCredit.credits_remaining
      } else if (!requestedHasBalance) {
        console.warn('[generate] no_credits trigger', { reason: credit ? 'balance<=0' : 'no row', creditErr })
        const CREDIT_LABELS = { 'rapid-screen': 'Rapid Screen', 'speed-fit': 'Speed-Fit', 'depth-fit': 'Depth-Fit', 'strategy-fit': 'Strategy-Fit' }
        const label = CREDIT_LABELS[creditType] || creditType
        return NextResponse.json({
          error: 'no_credits',
          credit_type: creditType,
          message: `No ${label} credits remaining. Purchase ${label} credits to continue.`,
        }, { status: 403 })
      }

      // Stash what we need to deduct / refund later. Points at whichever
      // credit row we actually committed to charging.
      creditRefundCtx = {
        userId: user.id,
        creditType: chargedCreditType,
        preDeductionBalance: chargedBalance,
        deducted: false,
      }
      adminForRefund = adminClient
    }

    // FIX 2: If the PAYG user is about to spend a rapid-screen credit,
    // make sure the rest of the pipeline (prompt selection + max_tokens)
    // runs in rapid mode too. Under the current creditTypeMap this is a
    // defensive no-op, but it protects against future fallback logic
    // where a downgrade to rapid-screen is chosen server-side.
    if (!activeSub && creditType === 'rapid-screen') {
      mode = 'rapid'
    }

    // Re-derive mode flags now that `mode` is locked in for the rest of
    // the handler. These feed the prompt selector and the token budget.
    const isRapid    = mode === 'rapid'
    const isQuick    = mode === 'quick'
    const isStandard = mode === 'standard'
    const isAdvanced = mode === 'advanced'

    // ── Unsuitable role detection ───────────────────────────────────────────────
    // Block roles that are primarily physical, repetitive, or short-term temporary
    // before we burn any tokens. Friendly message returned to the UI.
    const unsuitableText = `${role_title} ${job_description}`.toLowerCase()
    const UNSUITABLE_PATTERNS = [
      /\bwarehouse operative\b/,
      /\bpicker\b/,
      /\bpacker\b/,
      /\bpicker\s*\/?\s*packer\b/,
      /\bdelivery driver\b/,
      /\blorry driver\b/,
      /\bhgv driver\b/,
      /\bhgv\b/,
      /\bcleaner\b/,
      /\blabourer\b/,
      /\btemporary\b/,
      /\bseasonal\b/,
      /\bagency temp\b/,
    ]
    if (UNSUITABLE_PATTERNS.some(p => p.test(unsuitableText))) {
      return NextResponse.json({
        error: 'unsuitable_role',
        message: 'This role type may not be suitable for scenario-based assessment. PRODICTA works best for roles involving decision-making, communication, and problem-solving. Roles that are primarily physical, repetitive, or short-term temporary may not benefit from this type of assessment.',
      }, { status: 422 })
    }

    // ── Sector detection (drives sector-specific scenario guidance) ─────────────
    const sectorText = `${role_title} ${job_description}`.toLowerCase()
    const sectorHas = (...words) => words.some(w => sectorText.includes(w))
    let sector = 'general'
    if (sectorHas('nurse', 'midwife', 'paramedic', 'healthcare assistant', 'hca ', 'physiotherap', 'occupational therap', 'radiograph', 'pharmacist', 'ward manager', 'clinical lead', 'mental health support', 'nhs', 'a&e', 'a & e', 'emergency department')) sector = 'healthcare'
    else if (sectorHas('care worker', 'senior carer', 'support worker', 'domiciliary', 'registered manager', 'care assistant', 'residential care', 'supported living', 'safeguarding adults')) sector = 'social_care'
    else if (sectorHas('teaching assistant', 'hlta', 'sen support', 'school administrator', 'pastoral lead', 'cover supervisor', 'teacher', 'classroom', 'pupil', 'safeguarding children', 'sendco', 'send ')) sector = 'education'
    else if (sectorHas('council officer', 'benefits advisor', 'planning officer', 'social worker', 'housing officer', 'civil servant', 'local authority', 'central government', 'public sector')) sector = 'public_sector'
    else if (sectorHas('electrician', 'plumber', 'gas engineer', 'maintenance technician', 'site manager', 'facilities manager', 'tradesperson', 'on site', 'engineer technician')) sector = 'trades'
    else if (sectorHas('restaurant manager', 'hotel receptionist', 'bar manager', 'retail manager', 'store supervisor', 'duty manager', 'hospitality', 'front of house', 'hotel ', 'shop floor', 'merchand', 'concession')) sector = 'hospitality_retail'
    else if (sectorHas('paralegal', 'legal secretary', 'conveyanc', 'solicitor', 'legal assistant', 'compliance officer', 'barrister', 'law firm')) sector = 'legal'
    else if (sectorHas('software developer', 'software engineer', 'devops', 'qa tester', 'technical lead', 'product manager', 'it support', 'systems administrator', 'sysadmin', 'data analyst', 'ux designer', 'scrum master', 'cto', 'backend', 'frontend', 'fullstack', 'full stack', 'sre', 'data engineer', 'data scientist')) sector = 'technology'
    else if (sectorHas('accounts assistant', 'management accountant', 'financial controller', 'credit controller', 'payroll manager', 'finance director', 'bookkeeper', 'tax advisor', 'auditor', 'fp&a', 'accountant', 'reconciliation', 'month end', 'month-end')) sector = 'finance'
    else if (sectorHas('marketing manager', 'content writer', 'social media manager', 'graphic designer', 'brand manager', 'digital marketing', 'pr manager', 'communications officer', 'campaign manager', 'copywriter', 'creative director')) sector = 'marketing'
    else if (sectorHas('sales executive', 'business development manager', 'account manager', 'sales director', 'inside sales', 'key account manager', 'telesales', 'bdr', 'sdr', 'pipeline', 'sales pipeline', 'new business sales')) sector = 'sales'
    else if (sectorHas('hr advisor', 'hr manager', 'people partner', 'talent acquisition', 'hr director', 'recruitment coordinator', 'learning and development', 'l&d manager', 'people operations')) sector = 'hr'
    else if (sectorHas('operations manager', 'logistics coordinator', 'supply chain', 'production manager', 'quality manager', 'warehouse manager', 'fleet manager', 'operations director')) sector = 'operations'
    else if (sectorHas('charity', 'non-profit', 'nonprofit', 'fundraiser', 'volunteer coordinator', 'impact manager', 'trustee', 'third sector')) sector = 'charity'
    else if (sectorHas('quantity surveyor', 'estate agent', 'property manager', 'building surveyor', 'contracts manager', 'site manager', 'project manager construction', 'rics', 'planning consent')) sector = 'property_construction'
    else if (sectorHas('receptionist', 'office administrator', 'office admin', 'admin assistant', 'administrative assistant', 'data entry', 'personal assistant', ' pa ', 'executive assistant', 'secretary', 'office manager', 'front of house admin', 'front desk')) sector = 'admin_reception'

    const SECTOR_GUIDANCE = {
      healthcare: `SECTOR: HEALTHCARE / NHS.
Build scenarios from: patient safety decisions, safeguarding concerns, working under staffing pressure, handling difficult patients or families, escalation to senior clinicians, handover accuracy, infection control decisions, and prioritising competing patient needs. Use realistic ward, clinic or community settings, named colleagues (consultant, nurse in charge, ward manager, HCA), and recognisable NHS pressures (bed pressures, short staffing, missed breaks).
DO NOT generate scenarios that require specific clinical knowledge such as drug dosages, dosing calculations, ECG interpretation, or differential diagnosis. Focus on decision making, communication, prioritisation and safeguarding. Never include sales pipelines, board presentations, P&L, KPIs or commercial targets.`,

      social_care: `SECTOR: SOCIAL CARE.
Build scenarios from: safeguarding vulnerable adults, lone working decisions, medication administration as a process (never clinical dosing), family communication, dignity and respect, reporting concerns, capacity assessments, and boundary setting with service users. Use realistic care settings (residential, supported living, domiciliary visits), named service users with brief context, and recognisable pressures (lone working, missed visits, family disagreements).
Never include sales, pipelines, board presentations, KPIs, marketing or commercial strategy.`,

      education: `SECTOR: EDUCATION.
Build scenarios from: safeguarding children, managing disruptive behaviour, communicating with parents, supporting SEN pupils, working alongside teaching staff, reporting concerns, and adapting to unexpected changes in the school day. Use realistic primary or secondary school settings, named pupils and parents, and recognisable pressures (cover at short notice, parent complaints, behaviour incidents).
Never include sales, pipelines, board presentations, commercial KPIs or P&L.`,

      public_sector: `SECTOR: PUBLIC SECTOR / LOCAL GOVERNMENT.
Build scenarios from: following policy and procedure, handling complaints from members of the public, data protection decisions, working across departments, prioritising statutory deadlines, and politically sensitive communications. Use realistic council, government department or housing settings, named residents or applicants, and recognisable pressures (statutory deadlines, FOI requests, ward councillor enquiries).
Never include sales targets, commercial pipelines or private sector P&L language.`,

      trades: `SECTOR: TRADES AND TECHNICAL.
Build scenarios from: health and safety decisions, client communication, prioritising multiple jobs across the day, dealing with unexpected problems on site, working independently, quality versus speed decisions, and reporting faults or concerns. Use realistic site or customer settings, named clients, and recognisable pressures (parts not arriving, customer not happy, second job overrunning).
Never include strategy decks, sales pipelines, board reporting or marketing campaigns.`,

      hospitality_retail: `SECTOR: HOSPITALITY AND RETAIL.
Build scenarios from: customer complaints, team management during busy periods, handling difficult customers, stock or cash discrepancies, health and safety, covering for absent staff, and upselling or service standards. Use realistic shop, restaurant, bar or hotel settings, named team members and customers, and recognisable pressures (a no-show shift, a complaint that escalates, a busy service hour).
Never include corporate strategy, board reporting or B2B sales pipelines.`,

      technology: `SECTOR: TECHNOLOGY.
Build scenarios from: debugging under pressure, stakeholder communication about technical issues, prioritising bug fixes versus feature work, code review disagreements, incident response, estimating delivery timelines, explaining technical concepts to non-technical stakeholders, and handling scope creep. Use realistic team and product settings, named colleagues (PM, tech lead, designer, support), and recognisable pressures (production incident, sprint slipping, blocked PR, vague brief).
Avoid clinical, classroom or shop-floor framing.`,

      finance: `SECTOR: FINANCE AND ACCOUNTING.
Build scenarios from: month-end pressure, audit preparation, variance analysis, stakeholder queries about numbers, reconciliation discrepancies, regulatory compliance, fraud or irregularity detection, and balancing accuracy with deadlines. Use realistic finance team settings, named colleagues (FC, FD, auditor, budget holder), and recognisable pressures (close week, missing supporting docs, pushed-back deadline).
Avoid clinical, classroom or trades framing.`,

      marketing: `SECTOR: MARKETING AND CREATIVE.
Build scenarios from: campaign deadline pressure, stakeholder feedback on creative work, budget constraints, balancing multiple projects, data-driven decisions versus creative instinct, client or internal brief changes, and measuring ROI. Use realistic agency or in-house marketing settings, named stakeholders (brand lead, designer, sales, agency partner), and recognisable pressures (last-minute brief change, copy not approved, paid budget cut).
Avoid clinical, classroom or trades framing.`,

      sales: `SECTOR: SALES AND BUSINESS DEVELOPMENT.
Build scenarios from: pipeline management, handling rejection, client relationship management, negotiation pressure, hitting targets under pressure, upselling, dealing with competitor threats, and managing client expectations. Use realistic sales settings, named prospects and accounts, and recognisable pressures (deal at risk, quarter end, undercut by competitor).
Avoid clinical, classroom or care-setting framing.`,

      hr: `SECTOR: HR AND PEOPLE.
Build scenarios from: employee grievances, disciplinary processes, redundancy conversations, recruitment decisions, policy interpretation, supporting managers with difficult conversations, TUPE transfers, and absence management. Use realistic HR settings, named employees and managers, and recognisable pressures (formal process timing, sensitive disclosures, line manager wanting a shortcut).
Score policy adherence and confidentiality higher than commercial framing.`,

      operations: `SECTOR: OPERATIONS AND LOGISTICS.
Build scenarios from: supply chain disruptions, scheduling conflicts, quality control decisions, health and safety incidents, managing shift patterns, dealing with suppliers, and cost reduction pressure. Use realistic operations settings, named colleagues and suppliers, and recognisable pressures (late delivery, broken kit, staff shortage on a shift).
Avoid clinical, classroom or pure office framing.`,

      charity: `SECTOR: CHARITY AND NON-PROFIT.
Build scenarios from: funding pressure, volunteer management, safeguarding, stakeholder reporting, balancing mission with financial reality, trustee communication, and beneficiary complaints. Use realistic third-sector settings, named volunteers, beneficiaries, trustees, and funders, and recognisable pressures (grant deadline, beneficiary in crisis, volunteer no-show).
Treat safeguarding as a high-priority dimension. Avoid hard commercial framing that ignores mission.`,

      property_construction: `SECTOR: PROPERTY AND CONSTRUCTION.
Build scenarios from: project delays, health and safety on site, client expectations, budget overruns, subcontractor management, planning disputes, and defect resolution. Use realistic site or property settings, named clients and subcontractors, and recognisable pressures (programme slipping, defect found at handover, planning objection).
Health and safety must be treated as non-negotiable.`,

      admin_reception: `SECTOR: ADMINISTRATION AND RECEPTION.
Build scenarios from: managing a busy front desk with multiple demands at once, handling a difficult visitor or caller, prioritising incoming requests, diary management conflicts, dealing with confidential information, supporting multiple managers with competing deadlines, and handling a complaint when the right person is unavailable. Use realistic office or reception settings, named visitors, callers and managers, and recognisable pressures (phone ringing while a visitor is at the desk, two managers wanting the same slot, a courier interrupting).
These are often entry-level roles. Keep scenarios straightforward and practical, not strategic. Test multitasking, communication, common sense and reliability. Do NOT expect leadership, commercial thinking, P&L awareness or board-level framing. A receptionist scenario should feel like a busy Monday morning, not a board meeting.`,

      legal: `SECTOR: LEGAL.
Build scenarios from: client confidentiality, managing case deadlines, dealing with difficult clients, prioritising competing matters, billing accuracy, working with counsel, and compliance decisions. Use realistic firm settings, named clients and matters, and recognisable pressures (limitation deadlines, missing client documents, fee earner under pressure).
Avoid clinical, classroom, or shop-floor framing.`,
    }

    const sectorGuidanceBlock = SECTOR_GUIDANCE[sector]
      ? `\n\nSECTOR-SPECIFIC GUIDANCE (you MUST follow this):\n${SECTOR_GUIDANCE[sector]}\n\nEvery scenario must feel like a real day in this specific job. A nurse must never get a scenario about managing a sales pipeline. A care worker must never get a scenario about board presentations. Read the JD and write scenarios that the actual person doing this job would recognise as their normal week.\n`
      : ''

    // ── Seniority detection (drives scenario complexity) ────────────────────────
    // -- ALTER TABLE assessments ADD COLUMN role_level TEXT DEFAULT 'MID_LEVEL';
    const seniorityText = `${role_title} ${job_description}`.toLowerCase()
    let seniorityTier = 'mid'
    if (/\b(junior|jr\.?|graduate|trainee|entry.?level|apprentice|assistant|intern|care worker|receptionist|driver|operative|coordinator|support worker|cleaner|porter|carer)\b/.test(seniorityText)) seniorityTier = 'junior'
    else if (/\b(director|head of|vp|vice president|chief|cxo|ceo|cto|cfo|coo|managing director|md\b|partner|principal)\b/.test(seniorityText)) seniorityTier = 'senior'
    else if (/\b(senior|sr\.?|lead|staff engineer|head)\b/.test(seniorityText)) seniorityTier = 'senior'

    // Map to role_level for Pressure Gauge tiers
    const roleLevel = seniorityTier === 'junior' ? 'OPERATIONAL' : seniorityTier === 'senior' ? 'LEADERSHIP' : 'MID_LEVEL'

    const SENIORITY_GUIDANCE = {
      junior: `SENIORITY: OPERATIONAL / ENTRY LEVEL.
ASSESSMENT STYLE: Rapid-Fire Prioritisation. Create short, punchy, real-world situations. "The delivery is late, a customer is shouting, and the floor is wet. What do you do first?" Keep scenarios practical and task-based. Test immediate reliability, safety awareness, basic communication, and following process under pressure. Expect short answers (50-100 words). Speed of response matters more than depth. Do NOT expect strategic thinking, leadership, commercial awareness, or budget decisions. A care worker gets a patient safety scenario, not a ward management crisis. A receptionist gets a busy front desk scenario, not a stakeholder management challenge. Avoid scenarios requiring managing people, owning budgets, or organisation-wide decisions. Frame scenarios conversationally as if coming from a supervisor.`,

      mid: `SENIORITY: MID LEVEL.
ASSESSMENT STYLE: Resource Constraint Scenarios. Give them a task then add a constraint mid-scenario. "You need to deliver the project by Friday, but the budget was just cut by 20% and your best team member called in sick." Build scenarios that involve managing competing priorities, handling difficult conversations, and making independent decisions. Test resourcefulness, problem-solving, prioritisation, and resilience. Expect 150-250 word responses with structured thinking. A mid-level nurse gets a staffing crisis requiring escalation decisions. A mid-level accountant gets a month-end pressure scenario with stakeholder pushback. Avoid framing as either pure task execution or pure strategic vision.`,

      senior: `SENIORITY: LEADERSHIP.
ASSESSMENT STYLE: Stakeholder Conflict Navigation. Present two conflicting but equally valid opinions from senior stakeholders. "The CFO wants to cut the marketing budget by 40%. The CMO says this will destroy the brand. You are the MD. What do you do?" Build scenarios involving strategy, trade-offs, political intelligence, and high-stakes decisions. Test strategic thinking, stakeholder management, decision-making under ambiguity, and ability to lead through conflicting priorities. Expect detailed 250-400 word responses with nuanced reasoning. Frame scenarios in a boardroom context with named stakeholders holding opposing positions. A finance director gets a board presentation with conflicting data. A senior developer gets an architecture decision with trade-offs. Do NOT reduce these scenarios to simple task execution.`,
    }

    const seniorityGuidanceBlock = `\n\nSENIORITY GUIDANCE (you MUST follow this in addition to the sector guidance):\n${SENIORITY_GUIDANCE[seniorityTier]}\nThis applies regardless of sector. Combine the sector framing with this seniority calibration. A junior in any sector should never get a leadership scenario. A senior in any sector should never get a pure task-execution scenario.\n`

    // Call Claude API
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    // Pre-pass: pull a structured Job Breakdown (tasks, disruptions, decisions,
    // failure points) before any scenario is generated. The breakdown is fed
    // into every scenario prompt as authoritative input and persisted on the
    // assessment row for the audit trail. Failure here is non-fatal; scenarios
    // fall back to the inline Job DNA extraction.
    const jobBreakdown = await extractJobBreakdown(client, role_title, job_description, context_answers)
    const jobBreakdownBlock = formatJobBreakdownBlock(jobBreakdown)

    // Dynamic Dimension Detection. Picks the 5 to 7 dimensions PRODICTA will
    // score on for THIS role and generates High/Mid/Low rubrics tailored to it.
    // Results are persisted on the assessment row so scoring (in
    // lib/score-candidate.js) and the Skills Breakdown panel both render from
    // the same source of truth. Both calls are non-fatal: if either returns
    // null, scoring falls back to the legacy fixed-family path.
    const detectedDimensions = await detectScoringDimensions(client, role_title, job_description, context_answers, jobBreakdown)
    const dimensionRubrics = await generateScoringRubrics(client, role_title, job_description, jobBreakdown, detectedDimensions)

    const standard3Prompt = `You are a specialist assessment designer for UK businesses. Your job is to create THREE work simulation scenarios for this role. These are for a 25-minute Depth-Fit Assessment, the right balance of depth and candidate experience for most roles.

These are NOT hypothetical exercises. Each scenario must be built from actual tasks listed in the job description. The candidate should feel like they are already in the role.

---

ROLE: ${role_title}

JOB DESCRIPTION:
${job_description}
${context_answers && Object.values(context_answers).some(v => v?.trim()) ? `
ADDITIONAL CONTEXT PROVIDED BY THE HIRING MANAGER:
${Object.entries(context_answers).map(([, v]) => v?.trim()).filter(Boolean).map(v => `- ${v}`).join('\n')}

Treat these answers as ground truth. Weave the environment, failure modes, and success criteria directly into every scenario.
` : ''}${jobBreakdownBlock}---

STEP 1 - EXTRACT JOB DNA (do this before writing a single scenario)

Read the job description and context answers. Extract and record the following as your scenario blueprint. Every scenario must trace back to at least one item from this blueprint.

A. SUCCESS DEFINITION, top 3 outcomes this person must deliver in the first 90 days, what "brilliant hire" looks like at the 3-month review.
B. FAILURE TRIGGERS, top 3 reasons someone fails in this role, what behaviours get people terminated early.
C. DAILY DECISION MOMENTS, what decisions this person makes every day, competing priorities they face regularly.
D. PRESSURE PROFILE, the biggest source of pressure in this role and whether it is time-based, stakeholder-based, volume-based, or ambiguity-based.
E. ROLE SPECIFICS, tools, KPIs, named stakeholders, reporting lines, sector, pace.

Use every item from A through E to shape the scenarios. If the context answers provide failure modes or success criteria, treat them as ground truth.

---

STEP 1B - MAP TO DECISION MOMENT TYPES

Every scenario must be built around one of these decision moment types. Select three different types based on the Job DNA. Do not use the same type twice.

- PRIORITISATION UNDER LOAD: Too many tasks, not enough time.
- STAKEHOLDER CONFLICT: Two or more people want different things.
- RESOURCE CONSTRAINT: Not enough budget, time, people, or information.
- COMMUNICATION BREAKDOWN: Something has gone wrong and the right people do not know yet.
- ERROR RECOVERY: A mistake has been made and must be fixed.
- AMBIGUITY UNDER PRESSURE: Instructions are unclear or incomplete.
- COMPLIANCE JUDGEMENT: Something feels wrong legally, ethically, or procedurally.
- ESCALATION DECISION: Something is beyond the candidate's authority alone.

---

STEP 2 - BUILD EACH SCENARIO FROM FOUR LAYERS

Every scenario must be constructed from all four of these layers. Do not skip any layer.

LAYER A, CONTEXT (minimum 130 words). Specific time of day, specific week in role, named colleagues with job titles, a situation already in progress with history, tools relevant to this role, background pressure the candidate is already aware of.

LAYER B, CONFLICT. A genuine dilemma where every option has a downside. No obviously correct answer.

TRADE-OFF RULE, MANDATORY FOR EVERY SCENARIO:
Every scenario conflict must present a genuine trade-off where every available option has a real downside. There must be no obviously correct answer. A candidate who sounds good but thinks poorly must be exposed by the trade-off.

These are the trade-off types. Use at least one per scenario:

SPEED VERSUS QUALITY: Acting quickly risks errors or client dissatisfaction. Taking time to do it properly risks missing the deadline or losing the opportunity. Neither option is safe. The candidate must choose and justify.
Example: "You can submit the proposal today with the information you have, or wait two days for the full data set. The client is pushing for today. The data gap is significant."

CLIENT VERSUS INTERNAL TEAM: What the client wants conflicts with what the internal team needs. Satisfying one damages the other. There is no solution that makes everyone happy.
Example: "The client wants daily updates. Your team finds this micromanagement and is starting to disengage. You cannot change the client's preference."

SHORT-TERM FIX VERSUS LONG-TERM IMPACT: The quick fix solves today's problem but creates a bigger one next month. The proper solution takes longer than the situation allows.
Example: "You can patch the process now and ship on time, or rebuild it properly and miss the quarter. The patch will need rebuilding anyway."

RELATIONSHIP VERSUS PROCESS: Following the correct process damages an important relationship. Protecting the relationship means bending or breaking the process.
Example: "The correct procedure requires escalating this formally. Doing so will permanently damage your relationship with the client. Not doing so puts you in breach of compliance."

INDIVIDUAL VERSUS TEAM: What is best for the candidate personally conflicts with what is best for the team or the business.
Example: "Taking on this project would accelerate your career but would leave your team under-resourced during a critical period."

TRADE-OFF CONSTRUCTION RULES:
- Both options must have a real cost. If one option is obviously better, rewrite it.
- The trade-off must be specific to this role and this scenario. Never use abstract trade-offs.
- The candidate must actively choose. The scenario must require a decision, not a plan to find a third option.
- The consequence of each choice must be stated or clearly implied. The candidate should know what they are giving up.
- Never resolve the trade-off for the candidate by making one option clearly safer. If you find yourself making one option safer, add a downside to it.

TRADE-OFF APPLICATION FOR THIS MODE (standard, 3 scenarios): Use a different trade-off type for each scenario. Trade-offs must escalate in complexity across scenarios: Scenario 1 uses a relatively contained trade-off (e.g. SPEED VERSUS QUALITY); Scenario 2 uses a sharper interpersonal or organisational trade-off (e.g. CLIENT VERSUS INTERNAL TEAM or SHORT-TERM FIX VERSUS LONG-TERM IMPACT); Scenario 3 uses the hardest trade-off (RELATIONSHIP VERSUS PROCESS or INDIVIDUAL VERSUS TEAM).

LAYER C, DECISION PRESSURE. At least one of: a specific deadline, a named person waiting, a consequence if nothing is done, incomplete information, or emotional charge.

LAYER D, REQUIRED OUTPUT. A real work output (email or message, ranked prioritisation with reasoning, concrete decision with rationale, communication plan, or set of actions in order). Not a reflection or opinion.

URGENCY LANGUAGE RULE:
Every scenario must contain at least one urgency signal, emerging naturally from the context:
- A specific clock time
- A named person creating pressure
- A countdown
- An escalation risk

EMOTIONAL REALISM RULES, MANDATORY:
Every scenario must contain at least one emotional realism element that makes the situation feel like real work rather than a test. Choose from the following per scenario:

ELEMENT 1, NAMED PERSON CREATING PRESSURE:
A specific named colleague, manager, or client is waiting, frustrated, or watching. Their emotional state is clear.
Examples:
- "Marcus has been chasing you since 8am and his tone in the last message suggests he is losing patience."
- "Sarah copied the MD into her last email. You are now being watched."
- "The client, James Okafor, has left two voicemails. He sounds calm but you know from experience that calm is his warning sign."

ELEMENT 2, TIME SPECIFICITY:
A specific clock time creates urgency that feels real.
Examples:
- "It is 4:47pm. The office closes at 5:30 and you have no flexibility on that today."
- "It is 9:10am. You have a meeting at 10 that you cannot move."
- "It is Friday at 3pm. Nothing can be escalated until Monday."

ELEMENT 3, CONSEQUENCE VISIBILITY:
The candidate can see or anticipate the consequence of inaction. Someone is watching or will find out.
Examples:
- "If this is not resolved before the client call at 2pm, it will come up in front of the board."
- "Your line manager reviews the dashboard every morning. Whatever state this is in at 9am tomorrow is what they will see."
- "Three members of your team are waiting on your decision before they can start their day."

ELEMENT 4, HISTORY AND CONTEXT:
The situation has backstory that creates additional pressure. This is not the first time. There are existing relationships and tensions in play.
Examples:
- "This is the third time this quarter this client has escalated. Your manager has already mentioned it once."
- "You and James have had a difficult working relationship since the restructure. This situation will either repair it or end it."
- "The team has been promised this would be resolved by end of week. It is Thursday."

RULES FOR EMOTIONAL REALISM:
- Names must feel real and UK-appropriate. Mix genders and cultural backgrounds as the existing prompt already instructs.
- Emotional realism must emerge naturally from the scenario context. It must not feel bolted on.
- The emotional element must add to the decision pressure, not distract from it. Every emotional detail must make the trade-off harder, not easier.
- Do not use emotional elements that could introduce bias. A frustrated female manager and a frustrated male manager must be treated identically. A client named James and a client named Mohammed must carry identical weight and tone.

EMOTIONAL REALISM APPLICATION FOR THIS MODE (standard, 3 scenarios): Scenario 1 must use at least one element. Scenario 2 must use at least two elements. Scenario 3 must use at least two elements AND must include ELEMENT 4 (HISTORY AND CONTEXT).

PROGRESSIVE REALISM RULES (apply across the three scenarios in sequence):
Scenario 1 (Core Task): One clear conflict, moderate time pressure, familiar work context. Tests basic competence.
Scenario 2 (Pressure Test): Two competing priorities, tight deadline, a named stakeholder creating pressure. Tests resilience.
Scenario 3 (Judgment Call): Ambiguous situation, incomplete information, significant consequence if wrong. Tests judgment.

GLOBAL RULES: Built around actual JD tasks. Realistic UK names, company names, and monetary figures. Specific numbers for deadlines, budgets, team sizes. Written in present tense.

---

SCENARIO 1 - "Can they do the job?" (Type: "Core Task", Time: 9 minutes)
Take a core responsibility from the JD and give the candidate that actual work to do. Include realistic email content, data, or briefing material of at least 80 words.

---

SCENARIO 2 - "Will they last under pressure?" (Type: "Pressure Test", Time: 8 minutes)
Take another real task from the JD but add pressure: a competing deadline, a difficult stakeholder, a system that has gone down, or an unexpected problem mid-task. Feeds all four Pressure-Fit sub-scores.

---

SCENARIO 3 - "Will they fit?" (Type: "Judgment Call", Time: 8 minutes)
A scenario involving a colleague, manager, or competing team priorities, built around a real task from the JD. The candidate must navigate the relationship while still producing a concrete decision, response, or plan.

INCOMPLETE INFORMATION RULE (Scenario 3 only):
This scenario must contain one piece of missing information that is relevant but not provided. The candidate must decide whether to act without it or seek it out first. Do not tell the candidate the information is missing. Their response to ambiguity is part of what is being measured.

---

STEP 3 - VALIDATE EVERY SCENARIO BEFORE INCLUDING IT

Before finalising each scenario check it passes all six of these tests. If it fails any test, rewrite it.

Test 1, Reality check: A hiring manager for this role would recognise this as something that literally happens here.
Test 2, Consequence check: Failure to handle this well would cause a real problem in this role.
Test 3, Decision path check: There is a clear difference between a strong response and a risky response. A candidate cannot answer vaguely and still score well.
Test 4, Gaming check: The scenario is specific enough to this JD and context that a generic interview prep answer will not work.
Test 5, Behaviour check: The scenario tests what someone does, not what they know.
Test 6, Trade-off check: Does every available option in this scenario have a real downside? If one option is clearly safer or better than the others, add a cost to it or strengthen the downside of the better option until the choice is genuinely difficult.

---

FORCED CHOICE MECHANIC (include on exactly ONE scenario in the assessment)

Attach a forced_choice object to EXACTLY ONE of the three scenarios. Preferably the Pressure Test (Scenario 2). The other two scenarios must NOT have a forced_choice field.

The forced_choice is a structured decision task the candidate completes before writing their open text response. It must reflect a real decision they would face in this role. Never use generic options like "communicate with stakeholders" or "prioritise urgent tasks". Use the actual tasks, people, and decisions from that scenario's context.

Choose one of these mechanic types based on what best fits the scenario:

TYPE 1, PRIORITY RANKING (5 to 7 items):
{
  "type": "ranking",
  "instruction": "Rank these actions in the order you would tackle them. Drag to reorder.",
  "items": ["Action 1", "Action 2", "Action 3", "Action 4", "Action 5"]
}

TYPE 2, SELECT AND EXCLUDE (6 to 8 options):
{
  "type": "select_exclude",
  "instruction": "Select the 3 actions you would take first. Then identify 1 you would not do at this stage.",
  "items": ["Option 1", "Option 2", "Option 3", "Option 4", "Option 5", "Option 6"],
  "select_count": 3,
  "exclude_count": 1
}

TYPE 3, FORCED TRADE-OFF (exactly 3 pairs, every option has a downside):
{
  "type": "trade_off",
  "instruction": "For each situation, choose one option. There is no perfect answer, both have trade-offs.",
  "pairs": [
    {"a": "Option A", "b": "Option B"},
    {"a": "Option C", "b": "Option D"},
    {"a": "Option E", "b": "Option F"}
  ]
}

---

OUTPUT FORMAT

${RANKED_ACTIONS_AND_INTERRUPTION_BLOCK}
Return ONLY a JSON array with exactly 3 objects. No preamble, no explanation, no markdown.

[
  {
    "type": "Core Task",
    "title": "Concise title describing the situation",
    "candidate_label": "One sentence plain English description of what this scenario is testing, written for the candidate to read before they begin. Must not use the words test or assess. Frame it as context for why this situation matters in the role.",
    "dimension_tested": "PRIORITISATION UNDER LOAD",
    "context": "The full situation in present tense. At least 130 words. Named characters, specific numbers. Must feel like a real working day.",
    "task": "Exactly what the candidate must produce. One specific deliverable.",
    "timeMinutes": 9,
    "skills": ["Communication", "Problem solving"],
    "forced_choice": null
  }
]

Exactly one of the three scenario objects (preferably Scenario 2) must carry a populated forced_choice object in place of null. The other two must have "forced_choice": null.

The three scenario types must be: "Core Task", "Pressure Test", "Judgment Call".

dimension_tested must be one of: PRIORITISATION UNDER LOAD, STAKEHOLDER CONFLICT, RESOURCE CONSTRAINT, COMMUNICATION BREAKDOWN, ERROR RECOVERY, AMBIGUITY UNDER PRESSURE, COMPLIANCE JUDGEMENT, ESCALATION DECISION. Do not repeat a dimension across scenarios.

Skills must be chosen only from: Communication, Problem solving, Prioritisation, Leadership, Negotiation, Client management, Judgment, Strategy, Analysis, Crisis management, People management, Technical communication, Stakeholder management, Conflict resolution

Write in UK English throughout. No Americanisms. Pull everything from the JD.

FORMATTING RULE: Never use em dash (—) or en dash (–) characters anywhere in the output. Use commas, full stops, or rewrite the sentence instead.`

    const rapidPrompt = `You are a specialist assessment designer for UK businesses. Your job is to create a RAPID SCREEN assessment for this role. This is a 5-8 minute screening assessment designed to filter large volumes of candidates quickly. Keep everything short, punchy, and real-world.

---

ROLE: ${role_title}

JOB DESCRIPTION:
${job_description}
${context_answers && Object.values(context_answers).some(v => v?.trim()) ? `
ADDITIONAL CONTEXT PROVIDED BY THE HIRING MANAGER:
${Object.entries(context_answers).map(([, v]) => v?.trim()).filter(Boolean).map(v => `- ${v}`).join('\n')}

Treat these answers as ground truth.
` : ''}${jobBreakdownBlock}---

STEP 1 - EXTRACT CONDENSED JOB DNA

Read the job description. Extract in shorthand:
A. SUCCESS DEFINITION, what the ONE thing is this person must get right to survive their first week.
B. FAILURE TRIGGERS, the ONE behaviour that gets people let go early in this role.
D. PRESSURE PROFILE, the biggest pressure in this role (time, stakeholder, volume, or ambiguity).

The scenario must trace back to A, B, and D.

---

STEP 1B - SELECT ONE DECISION MOMENT TYPE

Pick the single decision moment type that best fits this role's reality:
- PRIORITISATION UNDER LOAD
- STAKEHOLDER CONFLICT
- RESOURCE CONSTRAINT
- COMMUNICATION BREAKDOWN
- ERROR RECOVERY
- AMBIGUITY UNDER PRESSURE
- COMPLIANCE JUDGEMENT
- ESCALATION DECISION

---

STEP 2 - BUILD THE SCENARIO FROM FOUR LAYERS (compressed)

LAYER A, CONTEXT (60-80 words). Specific time of day, a named colleague or customer, a situation already in progress, the tool or workflow in play.
LAYER B, CONFLICT. A genuine dilemma. Not a single-right-answer task.

TRADE-OFF RULE, MANDATORY: The conflict must present a genuine trade-off where every available option has a real downside. There must be no obviously correct answer. Use exactly ONE of these trade-off types, chosen to fit the role:
- SPEED VERSUS QUALITY: Act now with incomplete information and risk errors, or wait for clarity and miss the window.
- CLIENT VERSUS INTERNAL TEAM: What the client wants conflicts with what the team needs. Satisfying one damages the other.
- SHORT-TERM FIX VERSUS LONG-TERM IMPACT: The quick patch solves today but creates a bigger problem later.
- RELATIONSHIP VERSUS PROCESS: Following the correct process damages an important relationship. Protecting the relationship bends the process.
- INDIVIDUAL VERSUS TEAM: What is best for the candidate personally conflicts with what is best for the team.
Both options must have a real, specific cost. The candidate must actively choose, not plan a third option. Trade-off must be specific to this role.

LAYER C, DECISION PRESSURE. At least one urgency signal (a specific clock time, a named person waiting, a countdown, or an escalation risk). Must emerge naturally from the context.

EMOTIONAL REALISM RULE, MANDATORY: The scenario must include at least ONE of the following emotional realism elements, woven naturally into the context:
- NAMED PERSON CREATING PRESSURE: a specific colleague, manager, or client whose emotional state (frustrated, losing patience, watching) is clear.
- TIME SPECIFICITY: a specific clock time that creates real urgency (e.g. "It is 4:47pm. The office closes at 5:30.").
- CONSEQUENCE VISIBILITY: someone is watching or will find out if this is not resolved.
- HISTORY AND CONTEXT: existing backstory or prior tension that raises the stakes.
The emotional element must make the trade-off harder, not easier, and must not introduce bias. Treat names and genders identically (e.g. a client named James and a client named Mohammed must carry identical weight and tone).

LAYER D, REQUIRED OUTPUT. A real work output, not a reflection. The candidate's response should be under 150 words.

Use OPERATIONAL framing regardless of seniority: direct, practical, no corporate fluff.

---

STEP 3 - VALIDATE BEFORE INCLUDING

Test 1, Reality check: The hiring manager would recognise this as something that literally happens here.
Test 2, Consequence check: Handling this badly would cause a real problem.
Test 3, Decision path check: A strong response looks different to a risky response.
Test 4, Gaming check: A generic interview prep answer will not work here.
Test 5, Behaviour check: This tests what someone does, not what they know.
Test 6, Trade-off check: Does every available option in this scenario have a real downside? If one option is clearly safer or better than the others, add a cost to it or strengthen the downside of the better option until the choice is genuinely difficult.

If the scenario fails any test, rewrite it before output.

---

OUTPUT FORMAT

${RANKED_ACTIONS_AND_INTERRUPTION_BLOCK}
Return ONLY a JSON array with exactly 1 object. No preamble, no explanation, no markdown.

[
  {
    "type": "Rapid Screen",
    "title": "Concise title describing the situation",
    "candidate_label": "One sentence plain English description of what this scenario is testing, written for the candidate to read before they begin. Must not use the words test or assess. Frame it as context for why this situation matters in the role.",
    "dimension_tested": "PRIORITISATION UNDER LOAD",
    "context": "The situation in present tense. 60-80 words. Named characters, specific details. Must feel like a real working day.",
    "task": "Exactly what the candidate must do. One specific deliverable. Tell them to keep their response under 150 words.",
    "timeMinutes": 8,
    "skills": ["Communication", "Judgment"]
  }
]

dimension_tested must be one of: PRIORITISATION UNDER LOAD, STAKEHOLDER CONFLICT, RESOURCE CONSTRAINT, COMMUNICATION BREAKDOWN, ERROR RECOVERY, AMBIGUITY UNDER PRESSURE, COMPLIANCE JUDGEMENT, ESCALATION DECISION.

Skills must be chosen only from: Communication, Problem solving, Prioritisation, Leadership, Negotiation, Client management, Judgment, Strategy, Analysis, Crisis management, People management, Technical communication, Stakeholder management, Conflict resolution

Write in UK English throughout. No Americanisms.

FORMATTING RULE: Never use em dash or en dash characters anywhere in the output. Use commas, full stops, or rewrite the sentence instead.`

    const prompt = isRapid ? rapidPrompt : isQuick ? `You are a specialist assessment designer for UK businesses. Your job is to create TWO rapid work simulation scenarios for this role. These are for a 15-minute rapid assessment - they must be tightly focused on the highest-priority skills from the job description.

These are NOT hypothetical exercises. Each scenario must be built from actual tasks listed in the job description. The candidate should feel like they are already in the role.

---

ROLE: ${role_title}

JOB DESCRIPTION:
${job_description}
${context_answers && Object.values(context_answers).some(v => v?.trim()) ? `
ADDITIONAL CONTEXT PROVIDED BY THE HIRING MANAGER:
${Object.entries(context_answers).map(([, v]) => v?.trim()).filter(Boolean).map(v => `- ${v}`).join('\n')}

Treat these answers as ground truth. Weave the environment, failure modes, and success criteria directly into every scenario.
` : ''}${jobBreakdownBlock}---

STEP 1 - EXTRACT JOB DNA (do this before writing a single scenario)

Read the job description and context answers. Extract:
A. SUCCESS DEFINITION, top 2 outcomes this person must deliver in the first 90 days.
B. FAILURE TRIGGERS, top 2 reasons someone fails in this role.
C. DAILY DECISION MOMENTS, the decisions this person makes most often.
D. PRESSURE PROFILE, the biggest source of pressure in this role (time, stakeholder, volume, or ambiguity).
E. ROLE SPECIFICS, tools, KPIs, named stakeholders, sector, pace.

Every scenario must trace back to at least one item above.

---

STEP 1B - MAP TO DECISION MOMENT TYPES

Select two different decision moment types based on the Job DNA. Do not use the same type twice.

- PRIORITISATION UNDER LOAD
- STAKEHOLDER CONFLICT
- RESOURCE CONSTRAINT
- COMMUNICATION BREAKDOWN
- ERROR RECOVERY
- AMBIGUITY UNDER PRESSURE
- COMPLIANCE JUDGEMENT
- ESCALATION DECISION

---

STEP 2 - BUILD EACH SCENARIO FROM FOUR LAYERS

LAYER A, CONTEXT (minimum 100 words). Specific time of day, specific week in role, named colleagues with job titles, a situation already in progress, background pressure.

LAYER B, CONFLICT. A genuine dilemma where every option has a downside.

TRADE-OFF RULE, MANDATORY FOR EVERY SCENARIO:
Every scenario conflict must present a genuine trade-off where every available option has a real downside. There must be no obviously correct answer. A candidate who sounds good but thinks poorly must be exposed by the trade-off.

These are the trade-off types. Use at least one per scenario:

SPEED VERSUS QUALITY: Acting quickly risks errors or client dissatisfaction. Taking time to do it properly risks missing the deadline or losing the opportunity. Neither option is safe. The candidate must choose and justify.
Example: "You can submit the proposal today with the information you have, or wait two days for the full data set. The client is pushing for today. The data gap is significant."

CLIENT VERSUS INTERNAL TEAM: What the client wants conflicts with what the internal team needs. Satisfying one damages the other. There is no solution that makes everyone happy.
Example: "The client wants daily updates. Your team finds this micromanagement and is starting to disengage. You cannot change the client's preference."

SHORT-TERM FIX VERSUS LONG-TERM IMPACT: The quick fix solves today's problem but creates a bigger one next month. The proper solution takes longer than the situation allows.
Example: "You can patch the process now and ship on time, or rebuild it properly and miss the quarter. The patch will need rebuilding anyway."

RELATIONSHIP VERSUS PROCESS: Following the correct process damages an important relationship. Protecting the relationship means bending or breaking the process.
Example: "The correct procedure requires escalating this formally. Doing so will permanently damage your relationship with the client. Not doing so puts you in breach of compliance."

INDIVIDUAL VERSUS TEAM: What is best for the candidate personally conflicts with what is best for the team or the business.
Example: "Taking on this project would accelerate your career but would leave your team under-resourced during a critical period."

TRADE-OFF CONSTRUCTION RULES:
- Both options must have a real cost. If one option is obviously better, rewrite it.
- The trade-off must be specific to this role and this scenario. Never use abstract trade-offs.
- The candidate must actively choose. The scenario must require a decision, not a plan to find a third option.
- The consequence of each choice must be stated or clearly implied. The candidate should know what they are giving up.
- Never resolve the trade-off for the candidate by making one option clearly safer. If you find yourself making one option safer, add a downside to it.

TRADE-OFF APPLICATION FOR THIS MODE (quick, 2 scenarios): Use one trade-off per scenario, and the two scenarios must use DIFFERENT trade-off types.

LAYER C, DECISION PRESSURE. At least one of: a specific deadline, a named person waiting, a consequence if nothing is done, incomplete information, or emotional charge.

LAYER D, REQUIRED OUTPUT. A real work output (email, ranked prioritisation, concrete decision with rationale, communication plan, or set of actions in order).

URGENCY LANGUAGE RULE:
Every scenario must contain at least one urgency signal (specific clock time, named person creating pressure, countdown, or escalation risk).

EMOTIONAL REALISM RULES, MANDATORY:
Every scenario must contain at least one emotional realism element that makes the situation feel like real work rather than a test. Choose from the following per scenario:

ELEMENT 1, NAMED PERSON CREATING PRESSURE:
A specific named colleague, manager, or client is waiting, frustrated, or watching. Their emotional state is clear.
Examples:
- "Marcus has been chasing you since 8am and his tone in the last message suggests he is losing patience."
- "Sarah copied the MD into her last email. You are now being watched."
- "The client, James Okafor, has left two voicemails. He sounds calm but you know from experience that calm is his warning sign."

ELEMENT 2, TIME SPECIFICITY:
A specific clock time creates urgency that feels real.
Examples:
- "It is 4:47pm. The office closes at 5:30 and you have no flexibility on that today."
- "It is 9:10am. You have a meeting at 10 that you cannot move."
- "It is Friday at 3pm. Nothing can be escalated until Monday."

ELEMENT 3, CONSEQUENCE VISIBILITY:
The candidate can see or anticipate the consequence of inaction. Someone is watching or will find out.
Examples:
- "If this is not resolved before the client call at 2pm, it will come up in front of the board."
- "Your line manager reviews the dashboard every morning. Whatever state this is in at 9am tomorrow is what they will see."
- "Three members of your team are waiting on your decision before they can start their day."

ELEMENT 4, HISTORY AND CONTEXT:
The situation has backstory that creates additional pressure. This is not the first time. There are existing relationships and tensions in play.
Examples:
- "This is the third time this quarter this client has escalated. Your manager has already mentioned it once."
- "You and James have had a difficult working relationship since the restructure. This situation will either repair it or end it."
- "The team has been promised this would be resolved by end of week. It is Thursday."

RULES FOR EMOTIONAL REALISM:
- Names must feel real and UK-appropriate. Mix genders and cultural backgrounds as the existing prompt already instructs.
- Emotional realism must emerge naturally from the scenario context. It must not feel bolted on.
- The emotional element must add to the decision pressure, not distract from it. Every emotional detail must make the trade-off harder, not easier.
- Do not use emotional elements that could introduce bias. A frustrated female manager and a frustrated male manager must be treated identically. A client named James and a client named Mohammed must carry identical weight and tone.

EMOTIONAL REALISM APPLICATION FOR THIS MODE (quick, 2 scenarios): Use at least ONE element per scenario.

PROGRESSIVE REALISM RULES:
Scenario 1 (Core Task): One clear conflict, moderate time pressure. Tests basic competence.
Scenario 2 (Pressure Test): Two competing priorities, tight deadline, a named stakeholder creating pressure. Tests resilience.

GLOBAL RULES: Built around actual JD tasks. Realistic UK names and monetary figures. Specific numbers. Present tense.

---

SCENARIO 1 - Core capability test (Type: "Core Task", Time: 7 minutes)
The single most important task this person will do. Pull a specific task directly from the JD. Give them real content to work with.

---

SCENARIO 2 - Pressure and judgment (Type: "Pressure Test", Time: 8 minutes)
A realistic pressure situation drawn from the JD. A competing deadline, a difficult stakeholder, or an unexpected problem mid-task. The candidate does real work under pressure.

---

STEP 3 - VALIDATE EVERY SCENARIO BEFORE INCLUDING IT

Before finalising each scenario check it passes all six of these tests. If it fails any test, rewrite it.

Test 1, Reality check: A hiring manager for this role would recognise this as something that literally happens here.
Test 2, Consequence check: Failure to handle this well would cause a real problem in this role.
Test 3, Decision path check: There is a clear difference between a strong response and a risky response.
Test 4, Gaming check: The scenario is specific enough to this JD that a generic interview prep answer will not work.
Test 5, Behaviour check: The scenario tests what someone does, not what they know.
Test 6, Trade-off check: Does every available option in this scenario have a real downside? If one option is clearly safer or better than the others, add a cost to it or strengthen the downside of the better option until the choice is genuinely difficult.

---

OUTPUT FORMAT

${RANKED_ACTIONS_AND_INTERRUPTION_BLOCK}
Return ONLY a JSON array with exactly 2 objects. No preamble, no explanation, no markdown.

[
  {
    "type": "Core Task",
    "title": "Concise title describing the situation",
    "candidate_label": "One sentence plain English description of what this scenario is testing, written for the candidate to read before they begin. Must not use the words test or assess. Frame it as context for why this situation matters in the role.",
    "dimension_tested": "PRIORITISATION UNDER LOAD",
    "context": "The full situation in present tense. At least 100 words. Named characters, specific numbers. Must feel like a real working day.",
    "task": "Exactly what the candidate must produce. One specific deliverable.",
    "timeMinutes": 7,
    "skills": ["Communication", "Problem solving"]
  }
]

The two scenario types must be: "Core Task", "Pressure Test".

dimension_tested must be one of: PRIORITISATION UNDER LOAD, STAKEHOLDER CONFLICT, RESOURCE CONSTRAINT, COMMUNICATION BREAKDOWN, ERROR RECOVERY, AMBIGUITY UNDER PRESSURE, COMPLIANCE JUDGEMENT, ESCALATION DECISION. Do not repeat a dimension across scenarios.

Skills must be chosen only from: Communication, Problem solving, Prioritisation, Leadership, Negotiation, Client management, Judgment, Strategy, Analysis, Crisis management, People management, Technical communication, Stakeholder management, Conflict resolution

Write in UK English throughout. No Americanisms.

FORMATTING RULE: Never use em dash (—) or en dash (–) characters anywhere in the output. Use commas, full stops, or rewrite the sentence instead.` : isStandard ? standard3Prompt : `You are a specialist assessment designer for UK businesses. Your job is to create four work simulation scenarios that test whether this specific leadership hire will succeed, last, and fit. The assessment also includes a separate Day 1 workspace simulation covering inbox, calendar and prioritisation. You do NOT need to produce that here.

These are NOT hypothetical exercises or personality tests. Each scenario must be built from actual tasks, responsibilities, and requirements listed in the job description. The candidate should feel like they are already in the role on a Tuesday morning, doing real work.

---

ROLE: ${role_title}

JOB DESCRIPTION:
${job_description}
${context_answers && Object.values(context_answers).some(v => v?.trim()) ? `
ADDITIONAL CONTEXT PROVIDED BY THE HIRING MANAGER:
${Object.entries(context_answers).map(([, v]) => v?.trim()).filter(Boolean).map(v => `- ${v}`).join('\n')}

Treat these answers as ground truth. Weave the environment, team size, pace, challenges, failure modes, and success criteria directly into every scenario.
` : ''}${jobBreakdownBlock}
---

STEP 1 - EXTRACT JOB DNA (do this before writing a single scenario)

Read the job description and context answers. Extract and record the following as your scenario blueprint. Every scenario must trace back to at least one item from this blueprint.

A. SUCCESS DEFINITION
- What does success look like in the first 90 days? Be specific.
- What are the top 3 outcomes this person must deliver?
- What would make the hiring manager say "brilliant hire" at the 3-month review?

B. FAILURE TRIGGERS
- What are the top 3 reasons someone fails in this role?
- What behaviours get people fired or terminated early?
- What does a bad hire look like in this specific environment?

C. DAILY DECISION MOMENTS
- What decisions does this person make every day?
- What competing priorities will they face regularly?
- What gets them into trouble if they handle it wrong?

D. PRESSURE PROFILE
- What is the biggest source of pressure in this role?
- Is the pressure time-based, stakeholder-based, volume-based, or ambiguity-based?
- What does a bad day look like?

E. ROLE SPECIFICS
- Specific tools, systems, platforms mentioned
- KPIs, targets, performance measures
- Named stakeholders, team structure, reporting lines
- Industry, sector, regulatory context
- Pace, environment, day-to-day reality

Use every item from A through E to shape the scenarios. If the context answers provide failure modes or success criteria, treat them as ground truth and build scenarios directly from them.

If the JD mentions Salesforce, use Salesforce. If it mentions a £500k target, use that number. Two job descriptions with the same role title must produce completely different scenarios.

---

STEP 1B - MAP TO DECISION MOMENT TYPES

Every scenario must be built around one of these decision moment types. Select the types that best match the Job DNA you extracted. Do not use the same type twice.

Decision moment types:
- PRIORITISATION UNDER LOAD: Too many tasks, not enough time. What gets done first, what gets delayed, what gets dropped.
- STAKEHOLDER CONFLICT: Two or more people want different things. The candidate must navigate without losing either relationship.
- RESOURCE CONSTRAINT: Not enough budget, time, people, or information to do everything properly. Forced trade-off.
- COMMUNICATION BREAKDOWN: Something has gone wrong and the right people do not know yet. Who do you tell, when, and how.
- ERROR RECOVERY: A mistake has been made, by the candidate, a colleague, or a system. How do you fix it and what do you do first.
- AMBIGUITY UNDER PRESSURE: Instructions are unclear or incomplete. The candidate must act without full information.
- COMPLIANCE JUDGEMENT: Something feels wrong legally, ethically, or procedurally. What do you do.
- ESCALATION DECISION: Something is beyond the candidate's authority or ability to fix alone. Do you escalate, and if so how and to whom.

For each scenario note internally which decision moment type it uses. The scenario title in the JSON output should reflect the type naturally without naming it explicitly.

---

STEP 2 - BUILD EACH SCENARIO FROM FOUR LAYERS

Every scenario must be constructed from all four of these layers. Do not skip any layer.

LAYER A, CONTEXT (minimum 150 words)
Set the scene with full specificity:
- It is a specific time of day and day of the week
- The candidate has been in the role for a specific number of weeks
- Named colleagues with job titles are involved
- A specific situation is already in progress with history behind it
- Tools, systems, or workflows relevant to this role are active
- There is background pressure the candidate is already aware of

LAYER B, CONFLICT
Something creates a genuine dilemma:
- Competing priorities where both matter
- Limited resources where something must give
- A stakeholder with an opposing need
- A mistake or problem that has just surfaced
- An unexpected change that disrupts what was planned
Every option must have a downside. There is no obviously correct answer. A candidate who sounds good but thinks poorly must be exposed here.

TRADE-OFF RULE, MANDATORY FOR EVERY SCENARIO:
Every scenario conflict must present a genuine trade-off where every available option has a real downside. There must be no obviously correct answer. A candidate who sounds good but thinks poorly must be exposed by the trade-off.

These are the trade-off types. Use at least one per scenario:

SPEED VERSUS QUALITY: Acting quickly risks errors or client dissatisfaction. Taking time to do it properly risks missing the deadline or losing the opportunity. Neither option is safe. The candidate must choose and justify.
Example: "You can submit the proposal today with the information you have, or wait two days for the full data set. The client is pushing for today. The data gap is significant."

CLIENT VERSUS INTERNAL TEAM: What the client wants conflicts with what the internal team needs. Satisfying one damages the other. There is no solution that makes everyone happy.
Example: "The client wants daily updates. Your team finds this micromanagement and is starting to disengage. You cannot change the client's preference."

SHORT-TERM FIX VERSUS LONG-TERM IMPACT: The quick fix solves today's problem but creates a bigger one next month. The proper solution takes longer than the situation allows.
Example: "You can patch the process now and ship on time, or rebuild it properly and miss the quarter. The patch will need rebuilding anyway."

RELATIONSHIP VERSUS PROCESS: Following the correct process damages an important relationship. Protecting the relationship means bending or breaking the process.
Example: "The correct procedure requires escalating this formally. Doing so will permanently damage your relationship with the client. Not doing so puts you in breach of compliance."

INDIVIDUAL VERSUS TEAM: What is best for the candidate personally conflicts with what is best for the team or the business.
Example: "Taking on this project would accelerate your career but would leave your team under-resourced during a critical period."

TRADE-OFF CONSTRUCTION RULES:
- Both options must have a real cost. If one option is obviously better, rewrite it.
- The trade-off must be specific to this role and this scenario. Never use abstract trade-offs.
- The candidate must actively choose. The scenario must require a decision, not a plan to find a third option.
- The consequence of each choice must be stated or clearly implied. The candidate should know what they are giving up.
- Never resolve the trade-off for the candidate by making one option clearly safer. If you find yourself making one option safer, add a downside to it.

TRADE-OFF APPLICATION FOR THIS MODE (advanced, 4 scenarios): Use a different trade-off type across the four scenarios and escalate complexity in sequence. Scenario 4 (Staying Power) MUST use the most complex trade-off type: RELATIONSHIP VERSUS PROCESS or INDIVIDUAL VERSUS TEAM.

LAYER C, DECISION PRESSURE
Add one or more of these pressure elements:
- A specific deadline: "by 3pm", "before the client call at 2", "end of play today"
- A named person waiting for a response: "Sarah has asked for an update", "the client is on hold"
- A consequence if nothing is done: "if this is not resolved today, the contract is at risk"
- Incomplete information: one key piece of context is missing and the candidate must decide whether to act or seek it
- Emotional charge: the situation involves a frustrated client, a struggling colleague, or a senior stakeholder who is watching

LAYER D, REQUIRED OUTPUT
State exactly what the candidate must produce. Not a reflection or opinion. A real work output:
- An actual email or message drafted and sent
- A specific ranked prioritisation with reasoning for each ranking
- A concrete decision with rationale and next steps
- A communication plan showing who gets told what and when
- A set of actions in order with timing

URGENCY LANGUAGE RULE:
Every scenario must contain at least one of the following urgency signals, emerging naturally from the scenario context and not bolted on:
- A specific clock time (e.g. "It is 9:10am", "It is 4:45pm and the office closes at 5")
- A named person creating pressure (e.g. "Marcus has just messaged asking for an update", "Your line manager Priya is waiting")
- A countdown (e.g. "You have 20 minutes before the call", "This needs to go out before 12")
- An escalation risk (e.g. "If this is not resolved today the client has said they will escalate to the board")

EMOTIONAL REALISM RULES, MANDATORY:
Every scenario must contain at least one emotional realism element that makes the situation feel like real work rather than a test. Choose from the following per scenario:

ELEMENT 1, NAMED PERSON CREATING PRESSURE:
A specific named colleague, manager, or client is waiting, frustrated, or watching. Their emotional state is clear.
Examples:
- "Marcus has been chasing you since 8am and his tone in the last message suggests he is losing patience."
- "Sarah copied the MD into her last email. You are now being watched."
- "The client, James Okafor, has left two voicemails. He sounds calm but you know from experience that calm is his warning sign."

ELEMENT 2, TIME SPECIFICITY:
A specific clock time creates urgency that feels real.
Examples:
- "It is 4:47pm. The office closes at 5:30 and you have no flexibility on that today."
- "It is 9:10am. You have a meeting at 10 that you cannot move."
- "It is Friday at 3pm. Nothing can be escalated until Monday."

ELEMENT 3, CONSEQUENCE VISIBILITY:
The candidate can see or anticipate the consequence of inaction. Someone is watching or will find out.
Examples:
- "If this is not resolved before the client call at 2pm, it will come up in front of the board."
- "Your line manager reviews the dashboard every morning. Whatever state this is in at 9am tomorrow is what they will see."
- "Three members of your team are waiting on your decision before they can start their day."

ELEMENT 4, HISTORY AND CONTEXT:
The situation has backstory that creates additional pressure. This is not the first time. There are existing relationships and tensions in play.
Examples:
- "This is the third time this quarter this client has escalated. Your manager has already mentioned it once."
- "You and James have had a difficult working relationship since the restructure. This situation will either repair it or end it."
- "The team has been promised this would be resolved by end of week. It is Thursday."

RULES FOR EMOTIONAL REALISM:
- Names must feel real and UK-appropriate. Mix genders and cultural backgrounds as the existing prompt already instructs.
- Emotional realism must emerge naturally from the scenario context. It must not feel bolted on.
- The emotional element must add to the decision pressure, not distract from it. Every emotional detail must make the trade-off harder, not easier.
- Do not use emotional elements that could introduce bias. A frustrated female manager and a frustrated male manager must be treated identically. A client named James and a client named Mohammed must carry identical weight and tone.

EMOTIONAL REALISM APPLICATION FOR THIS MODE (advanced, 4 scenarios): Scenario 1 uses at least one element. Scenario 2 uses at least two elements. Scenario 3 uses at least two elements AND must include ELEMENT 4 (HISTORY AND CONTEXT). Scenario 4 (Staying Power) MUST include all four elements, woven naturally into the context.

PROGRESSIVE REALISM RULES (apply across all four scenarios in sequence):
Scenario 1 (Core Task): One clear conflict, moderate time pressure, familiar work context. Tests basic competence.
Scenario 2 (Pressure Test): Two competing priorities, tight deadline, a named stakeholder creating pressure. Tests resilience.
Scenario 3 (Judgment Call): Ambiguous situation, incomplete information, significant consequence if wrong. Tests judgment.
Scenario 4 (Staying Power): Multiple simultaneous pressures, political complexity, no clean solution. Tests character under maximum load.

GLOBAL RULES FOR EVERY SCENARIO:
- Built around an actual task or responsibility from the JD, not an abstract situation
- Use realistic UK company names, UK colleague names (mix of genders and cultural backgrounds), and monetary figures appropriate for this role and seniority
- Include specific numbers: deadlines, budgets, team sizes, deal values, targets, percentages
- Written in present tense. Never use "imagine", "suppose", or "pretend"

---

SCENARIO 1 - "Can they do the job?" (Type: "Core Task", Time: 12 minutes)
Take a core responsibility from the JD and give the candidate that actual work to do. Include a realistic email thread, document, data set, or briefing of at least 80 words. Feeds primarily into Skills Breakdown scores, pass probation probability, and Candidate Type.

---

SCENARIO 2 - "Will they last under pressure?" (Type: "Pressure Test", Time: 10 minutes)
Real task from the JD plus a specific realistic pressure element. The candidate must complete real work while managing the pressure. Feeds all four Pressure-Fit sub-scores and underperformance risk.

---

SCENARIO 3 - "Will they fit?" (Type: "Judgment Call", Time: 12 minutes)
A scenario involving the team, the manager, or company culture, built around a real task from the JD. The candidate must navigate the relationship while still completing real work.

INCOMPLETE INFORMATION RULE (Scenario 3 only):
This scenario must contain one piece of missing information that is relevant but not provided. The candidate must decide whether to act without it or seek it out first. Examples:
- The budget figure is not confirmed yet
- The client's exact requirements have not been signed off
- A key colleague is on leave and cannot be reached
- A system shows conflicting data and IT have not responded
Do not tell the candidate the information is missing. Let them notice it or not. Their response to ambiguity is part of what is being measured.

Feeds Composure Under Conflict, Ownership and Accountability, and Candidate Type.

---

SCENARIO 4 - "Will they stay?" (Type: "Staying Power", Time: 14 minutes)
A scenario where the reality of the role is harder or more mundane than expected, built around actual day-to-day tasks from the JD. Multiple simultaneous pressures and no clean solution. Feeds all four Pressure-Fit sub-scores, churn risk, the Reality Timeline, and underperformance risk.

---

STEP 3 - VALIDATE EVERY SCENARIO BEFORE INCLUDING IT

Before finalising each scenario check it passes all six of these tests. If it fails any test, rewrite it.

Test 1, Reality check: Would a hiring manager for this role read this and say "yes, that literally happens here"? If not, rewrite using more specific details from the JD.
Test 2, Consequence check: Would failure to handle this well actually cause a real problem in this role? If the stakes are low or abstract, raise them.
Test 3, Decision path check: Is there a clear difference between a strong response and a risky response? If a candidate could answer vaguely and score well, add more specificity to force a real decision.
Test 4, Gaming check: Could a candidate memorise an answer to this from a generic interview prep guide? If yes, make the scenario more specific to this JD, this company context, and this exact situation.
Test 5, Behaviour check: Does this test what someone does, not what they know? If the scenario could be answered with textbook theory rather than practical judgment, rewrite it around a real action that must be taken.
Test 6, Trade-off check: Does every available option in this scenario have a real downside? If one option is clearly safer or better than the others, add a cost to it or strengthen the downside of the better option until the choice is genuinely difficult.

---

SCORING GUIDANCE (do not include in output, use to shape what the scenarios reveal)

Strong responses show genuine competence with the actual work, maintain composure under pressure, take ownership rather than escalate unnecessarily, and demonstrate self-awareness about the less glamorous parts of the role. Weak responses reveal surface-level capability, disengagement when work is hard or dull, conflict avoidance, and a preference for the interesting parts of the job over the essential parts. These contrasts must flow naturally from the scenario design, not from hints in the task wording.

---

FORCED CHOICE MECHANIC (include on exactly ONE scenario in the assessment)

Attach a forced_choice object to EXACTLY ONE of the four scenarios. Preferably the Pressure Test (Scenario 2). The other three scenarios must NOT have a forced_choice field.

The forced_choice is a structured decision task the candidate completes before writing their open text response. It must reflect a real decision they would face in this role. Never use generic options like "communicate with stakeholders" or "prioritise urgent tasks". Use the actual tasks, people, and decisions from that scenario's context.

Choose one of these mechanic types based on what best fits the scenario:

TYPE 1, PRIORITY RANKING (5 to 7 items):
{
  "type": "ranking",
  "instruction": "Rank these actions in the order you would tackle them. Drag to reorder.",
  "items": ["Action 1", "Action 2", "Action 3", "Action 4", "Action 5"]
}

TYPE 2, SELECT AND EXCLUDE (6 to 8 options):
{
  "type": "select_exclude",
  "instruction": "Select the 3 actions you would take first. Then identify 1 you would not do at this stage.",
  "items": ["Option 1", "Option 2", "Option 3", "Option 4", "Option 5", "Option 6"],
  "select_count": 3,
  "exclude_count": 1
}

TYPE 3, FORCED TRADE-OFF (exactly 3 pairs, every option has a downside):
{
  "type": "trade_off",
  "instruction": "For each situation, choose one option. There is no perfect answer, both have trade-offs.",
  "pairs": [
    {"a": "Option A", "b": "Option B"},
    {"a": "Option C", "b": "Option D"},
    {"a": "Option E", "b": "Option F"}
  ]
}

---

OUTPUT FORMAT

${RANKED_ACTIONS_AND_INTERRUPTION_BLOCK}
Return ONLY a JSON array with exactly 4 objects. No preamble, no explanation, no markdown.

[
  {
    "type": "Core Task",
    "title": "Concise title describing the situation (not the task)",
    "candidate_label": "One sentence plain English description of what this scenario is testing, written for the candidate to read before they begin. Must not use the words test or assess. Frame it as context for why this situation matters in the role.",
    "dimension_tested": "PRIORITISATION UNDER LOAD",
    "context": "The full situation in present tense. Must be at least 150 words. Include named characters, specific numbers, and the full email thread, data, or briefing the candidate must work with. Must feel like a real working day at a real UK company in this specific sector.",
    "task": "Exactly what the candidate must produce. One specific deliverable. Tell them the format, the recipient, and any constraints. Do not hint at the right approach.",
    "timeMinutes": 12,
    "skills": ["Communication", "Negotiation"],
    "forced_choice": null
  }
]

Exactly one of the four scenario objects (preferably Scenario 2) must carry a populated forced_choice object in place of null. The other three must have "forced_choice": null.

The four scenario types must be: "Core Task", "Pressure Test", "Judgment Call", "Staying Power".

dimension_tested must be one of: PRIORITISATION UNDER LOAD, STAKEHOLDER CONFLICT, RESOURCE CONSTRAINT, COMMUNICATION BREAKDOWN, ERROR RECOVERY, AMBIGUITY UNDER PRESSURE, COMPLIANCE JUDGEMENT, ESCALATION DECISION. Do not repeat a dimension across scenarios.

Skills must be chosen only from: Communication, Problem solving, Prioritisation, Leadership, Negotiation, Client management, Judgment, Strategy, Analysis, Crisis management, People management, Technical communication, Stakeholder management, Conflict resolution

Write in UK English throughout. No Americanisms. No generic scenarios. No abstract situations. Pull everything from the JD.

FORMATTING RULE: Never use em dash (—) or en dash (–) characters anywhere in the output. Use commas, full stops, or rewrite the sentence instead.`

    // Rapid Screen only needs a single scenario + a prioritisation test, so
    // skip the heavy sector / seniority guidance blocks and cap output tokens.
    // Other modes still get the full guidance injected before FORMATTING RULE.
    const finalPrompt = isRapid
      ? prompt
      : prompt.replace(
          'FORMATTING RULE: Never use em dash',
          `${sectorGuidanceBlock}${seniorityGuidanceBlock}\nFORMATTING RULE: Never use em dash`
        )

    const scenarioModel = 'claude-sonnet-4-5'
    const scenarioMaxTokens = MAX_TOKENS_BY_MODE[mode] ?? 3000
    // Stream the response so the server-to-Anthropic connection stays active
    // for the full generation. 90s per-call cap so a single stuck call can't
    // eat the whole function budget; the outer catch refunds PAYG credit.
    const stream = client.messages.stream({
      model: scenarioModel,
      max_tokens: scenarioMaxTokens,
      messages: [{ role: 'user', content: finalPrompt }],
    })
    const message = await raceWithTimeout(stream.finalMessage(), 90000, 'scenario generation')

    const content = message.content[0].text.trim()
    const jsonStr = content.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim()
    const scenarios = JSON.parse(jsonStr)

    // Detect role type
    const jdLower = job_description.toLowerCase()
    const t = `${role_title} ${jdLower}`.toLowerCase()
    const has = (...words) => words.some(w => t.includes(w))
    let detected_role_type = 'general'
    if (sector !== 'general') detected_role_type = sector
    else if (false) {} // keep legacy fallthroughs below intact
    else if (has('legal counsel', 'solicitor', 'paralegal', 'barrister', 'compliance officer')) detected_role_type = 'legal'
    else if (has('nurse', 'carer', 'care worker', 'support worker', 'healthcare', 'clinical', 'midwife', 'safeguarding')) detected_role_type = 'healthcare'
    else if (has('finance director', 'accountant', 'bookkeeper', 'accounts assistant', 'finance manager', 'fp&a', 'controller', 'auditor', 'tax ', 'payroll')) detected_role_type = 'finance'
    else if (has('sales', 'business development', 'account manager', 'account executive', 'pipeline', 'revenue', 'bdr', 'sdr')) detected_role_type = 'sales'
    else if (has('marketing', 'campaign', 'brand', 'content marketing', 'digital marketing', 'seo', 'growth marketing')) detected_role_type = 'marketing'
    else if (has('hr ', ' hr', 'people partner', 'people operations', 'talent acquisition', 'recruiter', 'l&d', 'learning and development')) detected_role_type = 'hr'
    else if (has('engineer', 'developer', 'software', 'backend', 'frontend', 'fullstack', 'devops', 'data scientist', 'data engineer', 'qa ', 'sre')) detected_role_type = 'engineering'
    else if (has('customer service', 'customer support', 'contact centre', 'call centre', 'helpdesk', 'service advisor', 'customer experience')) detected_role_type = 'customer_service'
    else if (has('operations manager', 'operations director', 'logistics', 'supply chain', 'warehouse', 'fulfilment', 'dispatch')) detected_role_type = 'operations'
    else if (has('director', 'head of', 'chief', 'managing director', 'general manager')) detected_role_type = 'management'
    else if (has('office manager', 'office', 'admin', 'administrator', 'receptionist', 'secretary', 'personal assistant', ' pa ', 'executive assistant')) detected_role_type = 'office'

    // Save assessment to Supabase

    let { data: assessment, error } = await adminClient
      .from('assessments')
      .insert({
        user_id: user.id,
        role_title,
        job_description,
        detected_role_type,
        role_level: roleLevel,
        scenarios,
        skill_weights: skill_weights || { Communication: 25, 'Problem solving': 25, Prioritisation: 25, Leadership: 25 },
        status: 'active',
        assessment_mode: mode,
        employment_type,
        interruption_keying,
        // Audit-trail provenance: which scenario template generated these.
        scenario_version: PD_SCENARIO_VERSION,
        ...(jobBreakdown && { job_breakdown: jobBreakdown }),
        ...(detectedDimensions && { detected_dimensions: detectedDimensions }),
        ...(dimensionRubrics && { dimension_rubrics: dimensionRubrics }),
        ...(location && { location }),
        ...(context_answers && Object.values(context_answers).some(v => v?.trim()) && {
          context_answers,
        }),
        ...(save_as_template && {
          is_template: true,
          template_name: template_name?.trim() || role_title,
        }),
      })
      .select()
      .single()

    // If the audit-trail migration has not been applied yet, retry without
    // scenario_version so assessment creation stays resilient. Other paths
    // already use this pattern for new columns.
    let assessmentInsertRetried = error && /scenario_version/i.test(error.message || '')
    if (assessmentInsertRetried) {
      console.warn('[generate] retrying assessment insert without scenario_version (migration not applied)')
      const retry = await adminClient
        .from('assessments')
        .insert({
          user_id: user.id,
          role_title,
          job_description,
          detected_role_type,
          role_level: roleLevel,
          scenarios,
          skill_weights: skill_weights || { Communication: 25, 'Problem solving': 25, Prioritisation: 25, Leadership: 25 },
          status: 'active',
          assessment_mode: mode,
          employment_type,
          interruption_keying,
          ...(jobBreakdown && { job_breakdown: jobBreakdown }),
          ...(detectedDimensions && { detected_dimensions: detectedDimensions }),
          ...(dimensionRubrics && { dimension_rubrics: dimensionRubrics }),
          ...(location && { location }),
          ...(context_answers && Object.values(context_answers).some(v => v?.trim()) && {
            context_answers,
          }),
          ...(save_as_template && {
            is_template: true,
            template_name: template_name?.trim() || role_title,
          }),
        })
        .select()
        .single()
      if (retry.error) throw retry.error
      assessment = retry.data
    } else if (error) {
      throw error
    }

 // Assessment is persisted, now it is safe to deduct the PAYG credit.
    // If the calendar / inbox generations below fail, they are non-blocking
    // and the assessment itself is still usable, so the deduction stays.
    // If anything truly fatal happens after this point, the outer catch will
    // refund via creditRefundCtx.
    if (creditRefundCtx && !creditRefundCtx.deducted) {
      const { error: deductError } = await adminClient.from('assessment_credits').update({
        credits_remaining: creditRefundCtx.preDeductionBalance - 1,
      }).eq('user_id', creditRefundCtx.userId).eq('credit_type', creditRefundCtx.creditType)
      if (deductError) {
        console.error('[generate] credit deduction failed after assessment insert', deductError)
      } else {
        creditRefundCtx.deducted = true
      }
    }

    // -- ALTER TABLE assessments ADD COLUMN calendar_events JSONB;
    // Generate calendar events for Day One Planning (async, non-blocking)
    try {
      const calStream = client.messages.stream({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        messages: [{
          role: 'user',
          content: `Generate realistic first-Monday calendar events for a "${role_title}" role (${roleLevel} level).

Return JSON only. UK English. No emoji. No em dashes.
{
  "fixed_events": [
    {"time": "09:00", "title": "string", "type": "meeting"},
    {"time": "10:30", "title": "string", "type": "meeting"},
    {"time": "15:30", "title": "string", "type": "meeting"}
  ],
  "interruption": {"time": "11:00", "title": "string", "type": "interruption"},
  "deadline": {"time": "14:00", "title": "string", "type": "deadline"},
  "unscheduled_tasks": [
    {"title": "string", "type": "task"},
    {"title": "string", "type": "task"},
    {"title": "string", "type": "task"},
    {"title": "string", "type": "task"}
  ]
}

${roleLevel === 'OPERATIONAL' ? 'Use simple practical events: team briefing, floor walk, safety check, stock count. Tasks: check equipment, read safety notices, shadow experienced colleague, complete induction form.' : roleLevel === 'LEADERSHIP' ? 'Use board-level events: exec team meeting, board strategy session, investor call. Tasks: review board papers, prepare stakeholder map, draft 90-day priorities, schedule direct report introductions.' : 'Use mid-level events: team standup, client call, 1-to-1 with manager. Tasks: review team briefing docs, respond to client emails, prepare agenda for planning session, update project tracker.'}`
        }],
      })
      const calMsg = await raceWithTimeout(calStream.finalMessage(), 90000, 'calendar generation')
      const calText = calMsg.content[0]?.text || ''
      const calMatch = calText.match(/\{[\s\S]*\}/)
      if (calMatch) {
        const calEvents = JSON.parse(calMatch[0].replace(/[\u2014\u2013]/g, ', '))
        await adminClient.from('assessments').update({ calendar_events: calEvents }).eq('id', assessment.id)
      }
    } catch (calErr) {
      console.error('Calendar events generation error:', calErr)
    }

    // -- ALTER TABLE assessments ADD COLUMN inbox_events JSONB;
    // Generate inbox overload events for Depth-Fit and Strategy-Fit (non-blocking)
    if (mode !== 'quick') {
      try {
        const inboxStream = client.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `Generate realistic inbox overload items for each scenario in a "${role_title}" assessment (${roleLevel} level). There are ${scenarios.length} scenarios.

For EACH scenario, generate:
- 3 inbox items that land at the same time as the scenario (an urgent client/external request, a resource/budget constraint notification, and a team/internal message)
- 1 interruption message from a manager or colleague that arrives mid-task

Return JSON only. UK English. No emoji. No em dashes.
{
  "scenarios": [
    {
      "scenario_index": 0,
      "inbox_items": [
        {"sender": "string", "subject": "string", "preview": "string", "priority": "urgent", "type": "client"},
        {"sender": "string", "subject": "string", "preview": "string", "priority": "action_needed", "type": "resource"},
        {"sender": "string", "subject": "string", "preview": "string", "priority": "today", "type": "team"}
      ],
      "interruption": {"sender": "string", "role": "string", "message": "string"}
    }
  ]
}

${roleLevel === 'OPERATIONAL' ? 'Use simple workplace messages: supervisor asking about shift cover, stock delivery query, colleague needing help on the floor.' : roleLevel === 'LEADERSHIP' ? 'Use executive-level messages: board member requesting data, investor relations query, HR escalation about a senior hire.' : 'Use mid-level workplace messages: client complaint, budget approval needed, team member asking for guidance on a project.'}`
          }],
        })
        const inboxMsg = await raceWithTimeout(inboxStream.finalMessage(), 90000, 'inbox generation')
        const inboxText = inboxMsg.content[0]?.text || ''
        const inboxMatch = inboxText.match(/\{[\s\S]*\}/)
        if (inboxMatch) {
          const inboxEvents = JSON.parse(inboxMatch[0].replace(/[\u2014\u2013]/g, ', '))
          await adminClient.from('assessments').update({ inbox_events: inboxEvents }).eq('id', assessment.id)
        }
      } catch (inboxErr) {
        console.error('Inbox events generation error:', inboxErr)
      }
    }

    // -- ALTER TABLE assessments ADD COLUMN role_profile JSONB;
    // -- ALTER TABLE assessments ADD COLUMN shell_family TEXT;
    // -- ALTER TABLE assessments ADD COLUMN workspace_scenario JSONB;
    // -- ALTER TABLE assessments ADD COLUMN use_modular_workspace BOOLEAN
    //    NOT NULL DEFAULT false;
    // -- ALTER TABLE assessments ADD COLUMN healthcare_workspace_enabled
    //    BOOLEAN NOT NULL DEFAULT false; (Phase 2)
    //
    // Phase 1 + Phase 2 modular Workspace launch: detect role profile +
    // shell family for every assessment (small Haiku call, useful
    // downstream). The Office shell modular path becomes the default when:
    //   - the role classified into the in-scope office shell, AND
    //   - either mode is 'advanced' (Strategy-Fit, where Workspace is
    //     always part of the package), OR the buyer attached the Immersive
    //     add-on at create time (so cheaper tiers can opt in).
    // The Healthcare shell stays on the legacy WorkspacePage at creation
    // time and only switches to the modular orchestrator when an admin
    // sets healthcare_workspace_enabled = true on the row. Phase 2 stub
    // stage does not pre-generate healthcare workspace_scenario; admin
    // testing uses /admin/workspace-test to preview healthcare scenarios
    // without writing to the database.
    //
    // Anything else (healthcare, education, field_ops, out_of_scope, or
    // a Strategy-Fit role outside the office shell) stays on the legacy
    // WorkspacePage until Phase 2 builds those shells. Existing
    // assessments are not migrated; they keep whatever flag value the
    // row was created with so in-flight candidates see no behaviour
    // change mid-assessment.
    //
    // Both detect and generate calls are non-blocking; if either fails
    // the assessment row is still valid and the legacy Workspace path
    // will run.
    try {
      const detectorResult = await raceWithTimeout(
        detectRoleProfile(client, {
          roleTitle: role_title,
          jobDescription: job_description,
          contextAnswers: context_answers,
          employmentType: employment_type,
          mode,
        }),
        45000,
        'role profile detection'
      )
      if (detectorResult) {
        const { profile, shell_family } = detectorResult
        const useModular =
          shell_family === 'office' &&
          (mode === 'advanced' || immersive_enabled === true)
        await adminClient.from('assessments').update({
          role_profile: profile,
          shell_family,
          use_modular_workspace: useModular,
        }).eq('id', assessment.id)

        let blockCount = null
        let canonicalLabel = null
        if (useModular) {
          try {
            const scenario = await raceWithTimeout(
              generateScenario(client, profile, {
                roleTitle: role_title,
                jobDescription: job_description,
              }),
              90000,
              'workspace scenario generation'
            )
            if (scenario) {
              blockCount = Array.isArray(scenario.selected_blocks) ? scenario.selected_blocks.length : null
              canonicalLabel = scenario.match_info?.canonical_label || scenario.match_info?.canonical_id || null
              await adminClient.from('assessments').update({
                workspace_scenario: scenario,
              }).eq('id', assessment.id)
            }
          } catch (scenarioErr) {
            console.error('Workspace scenario generation error:', scenarioErr)
          }
        }

        // Structured launch-monitoring log. One line per created assessment
        // so adoption of the modular path can be tracked in the first week
        // by grepping `[generate] assessment_created` in the platform logs.
        console.log('[generate] assessment_created', JSON.stringify({
          assessment_id: assessment.id,
          mode,
          shell_family,
          use_modular_workspace: useModular,
          immersive_enabled,
          canonical_match: canonicalLabel,
          block_count: blockCount,
          employment_type,
        }))
      } else {
        console.log('[generate] assessment_created', JSON.stringify({
          assessment_id: assessment.id,
          mode,
          shell_family: null,
          use_modular_workspace: false,
          immersive_enabled,
          canonical_match: null,
          block_count: null,
          employment_type,
          note: 'role profile detection returned null',
        }))
      }
    } catch (profileErr) {
      console.error('Role profile detection error:', profileErr)
    }

    return NextResponse.json({ id: assessment.id, scenarios }, { headers: keepAliveHeaders })
  } catch (err) {
    console.error('Generate error:', err)

    // Refund PAYG credit if we already decremented. Uses the pre-deduction
    // balance so a concurrent successful purchase from another tab isn't
    // accidentally overwritten downward. The risk of a concurrent *send* in
    // the same tab is low because the UI disables the button during send.
    //
 // Manual restore needed if this failed silently earlier, e.g.:
    //   UPDATE assessment_credits SET credits_remaining = 1
    //   WHERE user_id = 'd802808d-afb1-4766-838b-7db310a281ad'
    //     AND credit_type = 'rapid-screen';
    if (creditRefundCtx?.deducted && adminForRefund) {
      const { error: refundError } = await adminForRefund
        .from('assessment_credits')
        .update({ credits_remaining: creditRefundCtx.preDeductionBalance })
        .eq('user_id', creditRefundCtx.userId)
        .eq('credit_type', creditRefundCtx.creditType)
      if (refundError) {
        console.error('[generate] credit refund failed', refundError)
      } else {
      }
    }

    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

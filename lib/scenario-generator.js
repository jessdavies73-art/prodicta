// Connected scenario generator for the modular Workspace.
//
// Two public exports:
//   selectBlocks(role_profile)
//     - Deterministic. Applies all the block-selection rules from the
//       Phase 1 brief and returns an ordered array of selected_blocks
//       with suggested durations. Server- and client-safe (pure JS).
//   generateScenario(client, role_profile, { roleTitle, jobDescription })
//     - Calls selectBlocks() then a single Claude Haiku call that produces
//       the spine, trigger, scenario_arc, and connected per-block content.
//       Returns the full workspace_scenario JSONB shape, or null on
//       failure. Caller treats null as best-effort: if the generator
//       fails the assessment row is still inserted without
//       workspace_scenario and the legacy Workspace path will run.
//
// Phase 1 implements the Office shell only. shell_family checks happen at
// the call site (in /api/assessment/generate), so this module assumes the
// caller has already confirmed shell_family === 'office'.

import { BLOCK_CATALOGUE, BLOCK_STAGE_ORDER } from '@/lib/workspace-blocks/office/catalogue'

// ─────────────────────────────────────────────────────────────────────────
// selectBlocks: deterministic block selection
// ─────────────────────────────────────────────────────────────────────────

// Per-category caps: most categories cap at 1 per scenario so the
// Workspace doesn't pile multiple analysis blocks or multiple decision
// blocks back to back. Communication and coordination can repeat because
// they cover different work modes (inbox vs Slack vs calendar).
const CATEGORY_CAPS = {
  analysis: 1,
  creation: 1,
  decision: 1,
  dynamic: 1,
  communication: 2,
  coordination: 2,
}

// Total target durations in seconds, scaled to land 15-20 min for
// permanent and 12-15 min for temporary.
function targetTotalSeconds(blockCount, isTemporary) {
  if (isTemporary) {
    return blockCount === 3 ? 720 : 900 // 12 min or 15 min
  }
  if (blockCount <= 4) return 1020 // 17 min
  if (blockCount === 5) return 1080 // 18 min
  return 1140 // 19 min
}

// Block-count target by seniority + employment type.
function targetBlockCount(profile) {
  if (profile.employment_type === 'temporary') {
    return profile.seniority_band === 'junior' ? 3 : 4
  }
  switch (profile.seniority_band) {
    case 'junior': return 4
    case 'mid': return 4
    case 'manager': return 5
    case 'senior_manager': return 5
    case 'director': return 6
    case 'c_suite': return 6
    default: return 5
  }
}

// Compute a weight for a block given a role profile. Higher = more likely
// to be selected. Base 50; modifiers stack additively.
function weightForBlock(blockId, profile) {
  const block = BLOCK_CATALOGUE[blockId]
  if (!block) return 0
  let w = 50

  const primaryWorkTypes = profile.primary_work_types || []
  const allWorkTypes = profile.work_types || []

  // Strong bonus for matching a primary work type.
  for (const wt of primaryWorkTypes) {
    if (block.work_types.includes(wt)) w += 30
  }
  // Smaller bonus for matching a non-primary present work type.
  for (const wt of allWorkTypes) {
    if (block.work_types.includes(wt) && !primaryWorkTypes.includes(wt)) w += 8
  }

  const seniority = profile.seniority_band
  const isJuniorish = seniority === 'junior' || seniority === 'mid'
  const isManagerUp = ['manager', 'senior_manager', 'director', 'c_suite'].includes(seniority)
  const isTopBand = seniority === 'director' || seniority === 'c_suite'

  // Junior/mid bias toward coordination and communication.
  if (isJuniorish && (block.category === 'coordination' || block.category === 'communication')) w += 18
  // Manager+ bias toward decision and dynamic.
  if (isManagerUp && (block.category === 'decision' || block.category === 'dynamic')) w += 18
  // Director/C-suite must include a Dynamic block: heavy bonus pushes
  // crisis-simulation or stakeholder-conflict to the top.
  if (isTopBand && block.category === 'dynamic') w += 40

  // Manager (people manager) prefers conversation simulation.
  if (profile.ic_or_manager === 'manager' && blockId === 'conversation-simulation') w += 22

  // External-facing roles prefer inbox and conversation simulation.
  if (profile.interaction_internal_external === 'external'
      && (blockId === 'inbox' || blockId === 'conversation-simulation')) w += 18

  // Temporary roles bias toward coordination + communication and away
  // from heavy creation work.
  if (profile.employment_type === 'temporary') {
    if (block.category === 'coordination' || block.category === 'communication') w += 12
    if (block.category === 'creation') w -= 15
  }

  // Stakeholder complexity: more complexity favours stakeholder-conflict.
  if (profile.stakeholder_complexity === 'many_competing' && blockId === 'stakeholder-conflict') w += 18

  return w
}

// Scale the per-block default durations so the total lands on the target.
// Round each duration to the nearest 30s for clean UI numbers.
function scaledDurations(chosenIds, totalTargetSeconds) {
  const totalDefault = chosenIds.reduce((s, id) => s + BLOCK_CATALOGUE[id].default_duration_seconds, 0)
  if (totalDefault === 0) return chosenIds.map(() => 180)
  const ratio = totalTargetSeconds / totalDefault
  return chosenIds.map(id => {
    const scaled = BLOCK_CATALOGUE[id].default_duration_seconds * ratio
    return Math.max(60, Math.round(scaled / 30) * 30)
  })
}

// Final order: stable sort by stage, then by weight desc within stage.
function orderByStage(chosenIds, weights) {
  return [...chosenIds].sort((a, b) => {
    const stageDiff = (BLOCK_STAGE_ORDER[a] || 9) - (BLOCK_STAGE_ORDER[b] || 9)
    if (stageDiff !== 0) return stageDiff
    return (weights[b] || 0) - (weights[a] || 0)
  })
}

// Public selector. Returns ordered array of:
//   { block_id, weight, suggested_duration_seconds, order }
export function selectBlocks(role_profile) {
  if (!role_profile) return []
  const isTemp = role_profile.employment_type === 'temporary'
  const targetCount = targetBlockCount(role_profile)

  // Score every block.
  const weights = {}
  for (const id of Object.keys(BLOCK_CATALOGUE)) {
    weights[id] = weightForBlock(id, role_profile)
  }

  // Greedy pick by weight, respecting category caps.
  const sortedIds = Object.keys(BLOCK_CATALOGUE).sort((a, b) => weights[b] - weights[a])
  const chosen = []
  const counts = {}
  for (const id of sortedIds) {
    if (chosen.length >= targetCount) break
    const cat = BLOCK_CATALOGUE[id].category
    const cap = CATEGORY_CAPS[cat] ?? 1
    if ((counts[cat] || 0) >= cap) continue
    chosen.push(id)
    counts[cat] = (counts[cat] || 0) + 1
  }

  // Coverage check: every primary_work_type must have at least one chosen
  // block. If a primary work type is missing, swap in the highest-weight
  // unchosen block that covers it (replacing the lowest-weight chosen
  // block whose category hasn't been used up).
  const primary = role_profile.primary_work_types || []
  for (const wt of primary) {
    const covered = chosen.some(id => BLOCK_CATALOGUE[id].work_types.includes(wt))
    if (covered) continue
    const candidate = sortedIds.find(id => !chosen.includes(id) && BLOCK_CATALOGUE[id].work_types.includes(wt))
    if (!candidate) continue
    // Drop the lowest-weight chosen block that doesn't cover any primary
    // work type uniquely (preserve breadth).
    const droppable = [...chosen].reverse().find(id => {
      const otherCovers = chosen.filter(x => x !== id).flatMap(x => BLOCK_CATALOGUE[x].work_types)
      const types = BLOCK_CATALOGUE[id].work_types
      return types.every(t => otherCovers.includes(t))
    })
    if (droppable) {
      const idx = chosen.indexOf(droppable)
      const droppedCat = BLOCK_CATALOGUE[droppable].category
      counts[droppedCat] -= 1
      chosen.splice(idx, 1)
      const candCat = BLOCK_CATALOGUE[candidate].category
      const cap = CATEGORY_CAPS[candCat] ?? 1
      if ((counts[candCat] || 0) < cap) {
        chosen.push(candidate)
        counts[candCat] = (counts[candCat] || 0) + 1
      } else {
        // Restore the dropped block if we can't fit the candidate.
        chosen.splice(idx, 0, droppable)
        counts[droppedCat] += 1
      }
    }
  }

  // Director/C-suite must include a dynamic block. Force one in if the
  // selection logic somehow missed it.
  const isTopBand = ['director', 'c_suite'].includes(role_profile.seniority_band)
  const hasDynamic = chosen.some(id => BLOCK_CATALOGUE[id].category === 'dynamic')
  if (isTopBand && !hasDynamic) {
    const dyn = sortedIds.find(id => BLOCK_CATALOGUE[id].category === 'dynamic')
    if (dyn && !chosen.includes(dyn)) {
      // Drop the lowest-weight non-coverage-critical chosen block.
      const dropIdx = chosen.length - 1
      chosen[dropIdx] = dyn
    }
  }

  const ordered = orderByStage(chosen, weights)
  const durations = scaledDurations(ordered, targetTotalSeconds(ordered.length, isTemp))
  return ordered.map((id, i) => ({
    block_id: id,
    weight: weights[id],
    suggested_duration_seconds: durations[i],
    order: i + 1,
  }))
}

// ─────────────────────────────────────────────────────────────────────────
// generateScenario: AI-generated connected scenario
// ─────────────────────────────────────────────────────────────────────────

function makeScenarioId(roleTitle) {
  const slug = (roleTitle || 'role').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 32)
  const stamp = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 6)
  return `${slug}-${stamp}-${rand}`
}

function buildBlockBriefList(selected) {
  return selected.map(s => {
    const b = BLOCK_CATALOGUE[s.block_id]
    const mins = Math.round(s.suggested_duration_seconds / 60)
    return `  ${s.order}. ${b.name} (id "${b.id}", ${mins} min, category: ${b.category})`
  }).join('\n')
}

const FUNCTION_SCENARIO_HINTS = {
  marketing: 'Q3 campaign launch brief due by end of day, agency needs direction; or competitor move overnight requires response.',
  finance: 'Month-end variance flagged Friday afternoon, FD wants the answer by lunch; or budget cut announced over the weekend.',
  hr: 'Grievance landed Friday afternoon and the line manager wants advice today; or a senior hire backed out at the weekend.',
  recruitment: 'Client just changed the role spec mid-process; or a top candidate has a competing offer expiring today.',
  legal: 'Contract due to exchange today, opposing side raised last-minute concerns; or a regulator query landed Friday.',
  sales: 'Pipeline review with the CEO at 2pm and the numbers are soft; or a customer escalation arrived at 8am.',
  software_dev: 'Production bug found over the weekend, sprint planning is at 11am, and the on-call engineer needs help.',
  customer_service: 'A complaint went viral on Twitter overnight; or a repeat customer is escalating to legal.',
  operations: 'Supplier failure at 8am affecting customer deliveries; or a stock count discrepancy flagged Friday.',
  project_management: 'Critical-path slip surfaced Friday and the steering committee meets at 3pm.',
  procurement: 'Preferred supplier missed a delivery commitment with no warning; or a tender deadline shifted forward.',
  admin_pa: 'CEO unexpectedly called away, full diary needs replanning, two VIP visitors arriving at 11am.',
  public_sector: 'Member of Parliament submitted a written question due back by 5pm; or a service complaint escalated to the press.',
  senior_leadership: 'Largest customer threatening to walk after Friday\'s service incident; or a board member raised a governance concern overnight.',
  aerospace: 'A safety report from Friday is sitting on the desk and the production team is asking when they can resume.',
  multilingual: 'A high-stakes overseas client request landed in two languages over the weekend.',
  fmcg_wholesale: 'A key account is renegotiating terms today and a stock allocation decision is due before noon.',
}

function buildScenarioPrompt({ role_profile, roleTitle, jobDescription, selected }) {
  const fnHint = FUNCTION_SCENARIO_HINTS[role_profile.function]
    || 'Pick a believable Monday morning event specific to this role.'
  const blockList = buildBlockBriefList(selected)
  const isTopBand = ['director', 'c_suite'].includes(role_profile.seniority_band)

  return `You are designing a connected 9am Monday Workspace simulation for a candidate applying for the role below. The candidate will spend 15 to 20 minutes working through a sequence of blocks. The blocks are ALREADY chosen and ordered for you. Your job is to write a believable scenario that flows through them, with each block's content connecting to the previous block's output.

Role title: ${roleTitle || role_profile.function}
Function: ${role_profile.function}
Seniority: ${role_profile.seniority_band}
IC or manager: ${role_profile.ic_or_manager}
Interaction style: ${role_profile.interaction_internal_external}
Sector context: ${role_profile.sector_context || 'unspecified'}
Company size: ${role_profile.company_size || 'unspecified'}
Employment type: ${role_profile.employment_type || 'permanent'}
Primary work types: ${(role_profile.primary_work_types || []).join(', ')}
${jobDescription ? `Job description excerpt:\n${String(jobDescription).slice(0, 800)}\n` : ''}

Selected blocks in order:
${blockList}

Scenario hint for this function:
${fnHint}

Output requirements:
- Return JSON only. UK English. No emoji. No em dashes.
- The spine and trigger must be specific to this role and sector. State concrete numbers, names, deadlines, products, customers. Generic outputs (e.g. "you have some emails to handle") are unacceptable.
- The trigger event appears in the FIRST block's content.
- Each block's content references what the candidate has just done in the previous block (use connects_from). Each block's content sets up what the candidate will do next (use connects_to).
- The scenario_arc maps to the five narrative stages and describes what the candidate experiences across the blocks.
${isTopBand ? '- Because seniority is director or c_suite, escalate the stakes in stage 4 and stage 5 (board, regulator, top customer, press).' : ''}

Output schema:
{
  "title": "string (4-8 words, role-specific)",
  "spine": "string (1-2 sentences describing what's happening today for this person)",
  "trigger": "string (the 9am Monday event that kicks the scenario off)",
  "scenario_arc": {
    "stage_1_setup": "string (what the candidate sees first)",
    "stage_2_context": "string (what they learn from the early research/data blocks)",
    "stage_3_output": "string (what they produce mid-scenario)",
    "stage_4_pressure": "string (what changes or escalates partway through)",
    "stage_5_resolution": "string (the final ask)"
  },
  "block_content": {
${selected.map(s => `    "${s.block_id}": {
      "summary": "string (1 sentence describing this block's content for this candidate)",
      "setup": "string (what the candidate sees / receives in this block)",
      "expected_output": "string (what the candidate is expected to produce)",
      "connects_from": "string or null (reference to previous block output)",
      "connects_to": "string or null (what this hand off to in the next block)",
      "key_items": [
        "string (a specific named item: an email subject, a row label, a decision title, a stakeholder name)"
      ]
    }`).join(',\n')}
  }
}

The "key_items" arrays should each contain 3 to 5 strings that are specific and named (e.g. "Email from Helen Carter, Procurement Director, subject: Q3 budget freeze", not "an email about budgets").`
}

function parseJsonResponse(text) {
  if (!text || typeof text !== 'string') return null
  const cleaned = text.replace(/[—–]/g, ', ')
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (!match) return null
  try { return JSON.parse(match[0]) } catch { return null }
}

// Validate the AI response: every selected block must have a content entry
// with the expected fields. Anything missing is filled with a placeholder
// string so the orchestrator can still render and we don't throw on
// downstream reads.
function normaliseScenario(raw, selected) {
  if (!raw || typeof raw !== 'object') return null
  const safeStr = (v) => typeof v === 'string' ? v.trim() : ''
  const safeArr = (v) => Array.isArray(v) ? v.filter(x => typeof x === 'string').slice(0, 8) : []
  const block_content = {}
  for (const s of selected) {
    const entry = raw.block_content?.[s.block_id] || {}
    block_content[s.block_id] = {
      summary: safeStr(entry.summary),
      setup: safeStr(entry.setup),
      expected_output: safeStr(entry.expected_output),
      connects_from: safeStr(entry.connects_from) || null,
      connects_to: safeStr(entry.connects_to) || null,
      key_items: safeArr(entry.key_items),
    }
  }
  return {
    title: safeStr(raw.title) || 'Monday morning scenario',
    spine: safeStr(raw.spine),
    trigger: safeStr(raw.trigger),
    scenario_arc: {
      stage_1_setup: safeStr(raw.scenario_arc?.stage_1_setup),
      stage_2_context: safeStr(raw.scenario_arc?.stage_2_context),
      stage_3_output: safeStr(raw.scenario_arc?.stage_3_output),
      stage_4_pressure: safeStr(raw.scenario_arc?.stage_4_pressure),
      stage_5_resolution: safeStr(raw.scenario_arc?.stage_5_resolution),
    },
    block_content,
  }
}

// Public: produce the full workspace_scenario JSONB. Caller persists it on
// assessments.workspace_scenario.
export async function generateScenario(client, role_profile, { roleTitle, jobDescription } = {}) {
  if (!client || !role_profile) return null
  const selected = selectBlocks(role_profile)
  if (selected.length === 0) return null

  const prompt = buildScenarioPrompt({ role_profile, roleTitle, jobDescription, selected })

  let stream
  try {
    stream = client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 3500,
      messages: [{ role: 'user', content: prompt }],
    })
  } catch (err) {
    console.error('[scenario-generator] stream init failed', err)
    return null
  }

  let final
  try {
    final = await stream.finalMessage()
  } catch (err) {
    console.error('[scenario-generator] stream completion failed', err)
    return null
  }

  const text = final?.content?.[0]?.text || ''
  const raw = parseJsonResponse(text)
  const ai = normaliseScenario(raw, selected)
  if (!ai) {
    console.warn('[scenario-generator] no valid scenario JSON, raw:', text.slice(0, 500))
    return null
  }

  const selected_blocks = selected.map(s => ({
    block_id: s.block_id,
    order: s.order,
    duration_seconds: s.suggested_duration_seconds,
    content_ref: s.block_id, // block_content keyed by block_id; refs match
  }))

  return {
    scenario_id: makeScenarioId(roleTitle),
    shell_family: 'office',
    title: ai.title,
    spine: ai.spine,
    trigger: ai.trigger,
    selected_blocks,
    block_content: ai.block_content,
    scenario_arc: ai.scenario_arc,
    generated_at: new Date().toISOString(),
  }
}

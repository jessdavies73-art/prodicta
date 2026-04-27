// Modular Workspace slide builder for the Highlight Reel.
//
// When the candidate's results carry workspace_block_scores, the reel
// expands from the legacy 6-slide structure to an 8-slide structure
// (or 7 slides if neither decision-queue nor conversation-simulation
// blocks were completed). Slide content is selected from the per-block
// strengths / signals / watch-outs already produced by
// lib/workspace-block-scoring.js so the reel surfaces the strongest
// concrete moments rather than the older blob-level summary.
//
// Slide types this returns:
//   'title'              - candidate name + score ring (8s)
//   'verdict'            - hire verdict + ai_summary (10s)
//   'block_strength'     - top strength from highest-scoring block (10s)
//   'decision_moment'    - top high-weight signal from a dynamic block (10s)
//   'conversation_moment'- top signal from conversation-simulation (10s)
//   'performance_moment' - merged decision/conversation when only one
//                          dynamic block was completed (10s)
//   'block_watch_out'    - watch-out from lowest-scoring block (10s)
//   'questions'          - up to 3 interview questions (10s)
//   'branding'           - PRODICTA close (8s)
//
// Returns null when workspace_block_scores is missing or empty so the
// caller falls through to the legacy 6-slide flow.

const BLOCK_LABELS = {
  // Office shell
  'inbox':                       'Inbox handling',
  'task-prioritisation':         'Task prioritisation',
  'calendar-planning':           'Calendar planning',
  'decision-queue':              'Decision queue',
  'conversation-simulation':     'Conversation simulation',
  'stakeholder-conflict':        'Stakeholder conflict',
  'reading-summarising':         'Reading and summarising',
  'document-writing':            'Document writing',
  'spreadsheet-data':            'Spreadsheet and data',
  'crisis-simulation':           'Crisis simulation',
  // Healthcare/Care shell
  'patient-handover':            'Patient handover',
  'buzzer-alert-queue':          'Buzzer / alert queue',
  'medication-round':            'Medication round',
  'clinical-decision-queue':     'Clinical decisions',
  'doctor-instruction-handling': 'Doctor instructions',
  'family-visitor-interaction':  'Family / visitor interaction',
  'care-plan-review':            'Care plan review',
  'safeguarding-incident':       'Safeguarding incident',
  'clinical-crisis-simulation':  'Clinical crisis',
  'patient-family-conversation': 'Patient / family conversation',
}

const WEIGHT_RANK = { high: 3, medium: 2, low: 1 }

function blockLabel(block_id) {
  return BLOCK_LABELS[block_id] || (block_id || 'Block')
}

function topStrengthFromBlock(block) {
  const strengths = Array.isArray(block?.strengths) ? block.strengths.filter(s => typeof s === 'string' && s.trim()) : []
  return strengths.length ? strengths[0] : null
}

function topSignalFromBlock(block) {
  const signals = Array.isArray(block?.signals) ? block.signals : []
  if (!signals.length) return null
  const sorted = [...signals].sort((a, b) => (WEIGHT_RANK[b?.weight] || 0) - (WEIGHT_RANK[a?.weight] || 0))
  return sorted[0]
}

function pickTopBlockStrength(blockScores) {
  const scored = blockScores
    .filter(b => Number.isFinite(b?.score))
    .filter(b => Array.isArray(b?.strengths) && b.strengths.length > 0)
  if (!scored.length) return null
  const sorted = [...scored].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  const top = sorted[0]
  return {
    block_id: top.block_id,
    block_label: blockLabel(top.block_id),
    score: top.score,
    strength: topStrengthFromBlock(top),
    narrative: typeof top.narrative === 'string' ? top.narrative : '',
  }
}

function pickTopBlockWatchOut(blockScores) {
  const candidates = blockScores
    .filter(b => Array.isArray(b?.watch_outs) && b.watch_outs.length > 0)
  if (!candidates.length) return null
  const sorted = [...candidates].sort((a, b) => (a.score ?? 100) - (b.score ?? 100))
  const worst = sorted[0]
  return {
    block_id: worst.block_id,
    block_label: blockLabel(worst.block_id),
    score: worst.score,
    watch_out: worst.watch_outs[0],
    narrative: typeof worst.narrative === 'string' ? worst.narrative : '',
  }
}

// Decision moment: prefer decision-queue, then crisis-simulation, then
// any block with a high-weight signal. Pull the strongest signal from
// the chosen block.
function pickDecisionMoment(blockScores) {
  const decision = blockScores.find(b => b.block_id === 'decision-queue')
  const crisis = blockScores.find(b => b.block_id === 'crisis-simulation')
  const candidate = decision || crisis
  if (candidate) {
    const sig = topSignalFromBlock(candidate)
    if (sig) return { block_id: candidate.block_id, block_label: blockLabel(candidate.block_id), score: candidate.score, signal: sig }
  }
  // No dedicated decision block; surface the highest-weight signal across all blocks.
  let best = null
  for (const b of blockScores) {
    const sig = topSignalFromBlock(b)
    if (!sig) continue
    if (!best || (WEIGHT_RANK[sig.weight] || 0) > (WEIGHT_RANK[best.signal.weight] || 0)) {
      best = { block_id: b.block_id, block_label: blockLabel(b.block_id), score: b.score, signal: sig }
    }
  }
  return best
}

// Conversation moment: prefer conversation-simulation, then any block
// whose top signal is tone_calibration. Returns null when there is
// nothing conversational to surface.
function pickConversationMoment(blockScores) {
  const conv = blockScores.find(b => b.block_id === 'conversation-simulation')
  if (conv) {
    const sig = topSignalFromBlock(conv)
    if (sig) return { block_id: conv.block_id, block_label: blockLabel(conv.block_id), score: conv.score, signal: sig }
  }
  // Fallback: find any block whose signals carry a tone_calibration type.
  for (const b of blockScores) {
    const sigs = Array.isArray(b?.signals) ? b.signals : []
    const tone = sigs.find(s => /tone[_ ]calibration/i.test(s?.type || ''))
    if (tone) return { block_id: b.block_id, block_label: blockLabel(b.block_id), score: b.score, signal: tone }
  }
  return null
}

// Build the modular slide list. Returns null when workspace_block_scores
// is missing or empty so the caller falls back to legacy.
export function buildModularSlides(data) {
  const blockScores = Array.isArray(data?.workspace_block_scores) ? data.workspace_block_scores : null
  if (!blockScores || blockScores.length === 0) return null

  const strength = pickTopBlockStrength(blockScores)
  const watchOut = pickTopBlockWatchOut(blockScores)
  const decision = pickDecisionMoment(blockScores)
  const conversation = pickConversationMoment(blockScores)

  // Avoid duplicating a slide when the decision and conversation picks
  // landed on the same signal (rare but possible if a non-dedicated
  // block surfaced the same evidence to both selectors). Collapse to one
  // "performance moment" slide when only one dynamic block was completed.
  const decisionPicked = decision != null
  const conversationPicked = conversation != null && (!decision || conversation.signal !== decision.signal)
  const collapseToPerformance = (decisionPicked && !conversationPicked) || (!decisionPicked && conversation != null) || (!decisionPicked && !conversation)

  const slides = []
  // 1. Title
  slides.push({ type: 'title', duration: 8 })
  // 2. Verdict
  slides.push({ type: 'verdict', duration: 10 })
  // 3. Top block strength
  if (strength) {
    slides.push({ type: 'block_strength', duration: 10, payload: strength })
  }
  // 4 + 5. Decision and conversation moments, or one merged performance moment.
  if (decision && conversation && conversation.signal !== decision.signal) {
    slides.push({ type: 'decision_moment', duration: 10, payload: decision })
    slides.push({ type: 'conversation_moment', duration: 10, payload: conversation })
  } else if (decision) {
    slides.push({ type: 'performance_moment', duration: 10, payload: decision })
  } else if (conversation) {
    slides.push({ type: 'performance_moment', duration: 10, payload: conversation })
  }
  // 6. Top watch-out
  if (watchOut) {
    slides.push({ type: 'block_watch_out', duration: 10, payload: watchOut })
  }
  // 7. Interview questions (only when there are any)
  const questions = Array.isArray(data?.interview_questions) ? data.interview_questions.slice(0, 3) : []
  if (questions.length) {
    slides.push({ type: 'questions', duration: 10, payload: { questions } })
  }
  // 8. Branding close.
  slides.push({ type: 'branding', duration: 8 })

  return slides
}

export { BLOCK_LABELS }

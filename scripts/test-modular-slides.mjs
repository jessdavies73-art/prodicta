// Smoke test for buildModularSlides. Exercises three shapes:
//   1. Marketing Manager: 5 modular blocks present (decision-queue +
//      crisis-simulation), conversation block missing -> 7 slides.
//   2. Sales Executive: inbox + conversation-simulation + decision-queue
//      + stakeholder-conflict (no crisis) -> 8 slides.
//   3. Legacy: no workspace_block_scores -> null (caller falls back to 6).

import { buildModularSlides } from '../app/assessment/[id]/candidate/[candidateId]/highlight-reel/buildModularSlides.js'

function summarise(label, slides) {
  console.log('---')
  console.log(`Case: ${label}`)
  if (slides == null) {
    console.log('  result: null (legacy 6-slide flow)')
    return
  }
  console.log(`  total slides: ${slides.length}`)
  slides.forEach((s, i) => {
    const tag = s.type
    const blk = s.payload?.block_label ? ` [${s.payload.block_label}, score ${s.payload.score ?? '—'}]` : ''
    const ev = s.payload?.signal?.evidence ? ` :: "${s.payload.signal.evidence.slice(0, 60)}…"` : ''
    const w = s.payload?.watch_out ? ` :: "${s.payload.watch_out.slice(0, 60)}…"` : ''
    const st = s.payload?.strength ? ` :: "${s.payload.strength.slice(0, 60)}…"` : ''
    console.log(`  ${i + 1}. ${tag} (${s.duration}s)${blk}${ev}${w}${st}`)
  })
}

// Marketing Manager modular set: decision-queue + crisis-simulation
// dynamic; no conversation-simulation block. Expect collapse to 1
// performance moment slide -> 7 slides total.
const marketingMgr = {
  name: 'Marcus Williams', role: 'Marketing Manager',
  overall_score: 74, ai_summary: 'Mixed but credible.',
  workspace_block_scores: [
    {
      block_id: 'spreadsheet-data', score: 70,
      strengths: ['Caught the suspicious variance on the paid social row.'],
      watch_outs: ['Missed the data quality issue on row 9.'],
      narrative: 'Reads tables for the obvious anomaly but stops scanning once one is found.',
      signals: [
        { type: 'anomaly_catch_partial', evidence: 'Caught one of two planted anomalies.', weight: 'high' },
        { type: 'action_grounding', evidence: 'Action lacked an owner and a deadline.', weight: 'medium' },
      ],
    },
    {
      block_id: 'decision-queue', score: 78,
      strengths: ['Defensible choice on the campaign budget call with a named trade-off.'],
      watch_outs: [],
      narrative: 'Solid baseline decision making with a soft spot on commercial constraints.',
      signals: [
        { type: 'trade_off_articulation', evidence: 'Two of three rationales name the trade-off clearly.', weight: 'high' },
        { type: 'speed_calibration', evidence: '45s on lightweight, 110s on heavyweight.', weight: 'low' },
      ],
    },
    {
      block_id: 'document-writing', score: 76,
      strengths: ['Hit four of five must-include points and stayed inside word limit.'],
      watch_outs: ['Closing did not name a next decision or deadline.'],
      narrative: 'The brief does the job but reads as a draft rather than a finished piece.',
      signals: [
        { type: 'must_include_coverage', evidence: 'Four of five points addressed.', weight: 'medium' },
      ],
    },
    {
      block_id: 'stakeholder-conflict', score: 72,
      strengths: ['All four stakeholder responses acknowledged the named want.'],
      watch_outs: ['Final decision read as a compromise designed to avoid conflict.'],
      narrative: 'Acknowledgement layer is strong; the final call hedges.',
      signals: [
        { type: 'compromise_preference', evidence: 'Final decision split the budget rather than committing.', weight: 'high' },
      ],
    },
    {
      block_id: 'crisis-simulation', score: 74,
      strengths: ['Stage 1 named the agency contact and the holding line cleanly.'],
      watch_outs: ['Stage 2 stuck to the original plan despite new £45k cost.'],
      narrative: 'Competent stage-1 composure but limited adaptation when constraints shift.',
      signals: [
        { type: 'stage1_composure', evidence: 'Holding line in stage 1 was structured.', weight: 'medium' },
      ],
    },
  ],
  interview_questions: [
    'Walk me through how you would handle a typo airing on Channel 4 in 90 minutes.',
    'When did you last commit to a budget decision before everyone agreed?',
    'How do you decide what not to do on a Q3 launch?',
  ],
}
summarise('Marketing Manager (5 modular blocks, no conversation block)', buildModularSlides(marketingMgr))

// Sales Executive modular set: includes conversation-simulation AND
// decision-queue, no crisis. Expect 8 slides.
const salesExec = {
  name: 'Priya Patel', role: 'Sales Executive',
  overall_score: 61, ai_summary: 'Mixed profile.',
  workspace_block_scores: [
    {
      block_id: 'inbox', score: 65,
      strengths: ['Replies to peer-relationship emails were warm and well-calibrated.'],
      watch_outs: ['Reply to the senior partner used the same casual tone as her reply to a peer.'],
      narrative: 'Defaults to inbox order and a single warm register.',
      signals: [
        { type: 'priority_order_miss', evidence: 'VIP escalation email opened fourth, not first.', weight: 'high' },
        { type: 'tone_calibration', evidence: 'Reply to Senior Partner read like a reply to a peer.', weight: 'high' },
      ],
    },
    {
      block_id: 'conversation-simulation', score: 58,
      strengths: ['Discovery-first instinct in the opening turn was strong.'],
      watch_outs: ['Conceded on price in turn 4 unprompted.'],
      narrative: 'Prioritises rapport over commercial discipline.',
      signals: [
        { type: 'pre_emptive_concession', evidence: 'Offered a 10 percent discount in turn 4 unprompted.', weight: 'high' },
        { type: 'tone_calibration', evidence: 'Counterpart\'s tone softened by turn 6.', weight: 'medium' },
      ],
    },
    {
      block_id: 'decision-queue', score: 62,
      strengths: ['Picked the safer option on each call, with consistent rationale.'],
      watch_outs: ['Slow on lightweight calls, fast on heavyweight.'],
      narrative: 'Preference-driven decision making rather than constraint-driven.',
      signals: [
        { type: 'speed_inversion', evidence: 'Spent longer on small calls than on big ones.', weight: 'medium' },
        { type: 'preference_language', evidence: 'Two rationales used "what feels right" framing.', weight: 'high' },
      ],
    },
    {
      block_id: 'stakeholder-conflict', score: 60,
      strengths: ['All stakeholder responses showed warmth.'],
      watch_outs: ['Final decision did not commit to a clear call.'],
      narrative: 'Struggles to commit when stakeholders disagree.',
      signals: [
        { type: 'no_commit', evidence: 'Final decision hedged between options.', weight: 'high' },
      ],
    },
  ],
  interview_questions: [
    'Tell me about the last time you held the line on price.',
    'Walk me through how you triage your inbox on a Monday.',
    'When did you last commit to a call with stakeholders disagreeing?',
  ],
}
summarise('Sales Executive (4 blocks, conversation + decision present)', buildModularSlides(salesExec))

// Legacy (no modular blocks).
summarise('Legacy (no workspace_block_scores)', buildModularSlides({ name: 'Test', overall_score: 70 }))

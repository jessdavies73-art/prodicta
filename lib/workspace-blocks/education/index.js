'use client'

// Education shell block registry. Re-exports the catalogue (plain
// data) for callers that need it on the client, and exposes a loader
// that returns the lazy-loaded React component for a given block id.
// Mirrors the office and healthcare shell shapes so the orchestrator
// can treat all three shells uniformly.
//
// Phase 2 Education ships every block as a stub that renders the
// shared BlockPlaceholder. Real interactive surfaces replace each stub
// in follow-up prompts; the metadata shape and loader keys stay
// stable so the orchestrator does not need a code change per block.
//
// Server callers (scenario-generator, /api/assessment/generate) should
// import BLOCK_CATALOGUE from './catalogue' directly to avoid pulling
// 'use client' into the server graph.

import dynamic from 'next/dynamic'
import { BLOCK_CATALOGUE, BLOCK_STAGE_ORDER } from './catalogue'

export { BLOCK_CATALOGUE, BLOCK_STAGE_ORDER }

const LOADERS = {
  'class-roster':            dynamic(() => import('./class-roster')),
  'lesson-plan':             dynamic(() => import('./lesson-plan')),
  'parent-communication':    dynamic(() => import('./parent-communication')),
  'behaviour-incident':      dynamic(() => import('./behaviour-incident')),
  'safeguarding-referral':   dynamic(() => import('./safeguarding-referral')),
  'head-teacher-message':    dynamic(() => import('./head-teacher-message')),
  'cohort-coordination':     dynamic(() => import('./cohort-coordination')),
  'conversation-simulation': dynamic(() => import('./conversation-simulation')),
  'crisis-simulation':       dynamic(() => import('./crisis-simulation')),
}

export function loadBlock(blockId) {
  return LOADERS[blockId] || null
}

export function listBlocks() {
  return Object.values(BLOCK_CATALOGUE)
}

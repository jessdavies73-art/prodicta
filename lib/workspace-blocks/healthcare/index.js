'use client'

// Healthcare shell block registry. Re-exports the catalogue (plain data)
// for callers that need it on the client, and exposes a loader that
// returns the lazy-loaded React component for a given block id. Mirrors
// the office shell shape so the orchestrator can treat the two shells
// uniformly.
//
// Phase 2 ships every block as a stub that renders the shared
// BlockPlaceholder. Real interactive surfaces replace each stub in
// follow-up prompts; the metadata export shape and loader keys stay
// stable so the orchestrator does not need a code change per block.
//
// Server callers (scenario-generator, /api/assessment/generate) should
// import BLOCK_CATALOGUE from './catalogue' directly to avoid pulling
// 'use client' into the server graph.

import dynamic from 'next/dynamic'
import { BLOCK_CATALOGUE, BLOCK_STAGE_ORDER } from './catalogue'

export { BLOCK_CATALOGUE, BLOCK_STAGE_ORDER }

const LOADERS = {
  'patient-handover':            dynamic(() => import('./patient-handover')),
  'buzzer-alert-queue':          dynamic(() => import('./buzzer-alert-queue')),
  'medication-round':            dynamic(() => import('./medication-round')),
  'clinical-decision-queue':     dynamic(() => import('./clinical-decision-queue')),
  'doctor-instruction-handling': dynamic(() => import('./doctor-instruction-handling')),
  'family-visitor-interaction':  dynamic(() => import('./family-visitor-interaction')),
  'care-plan-review':            dynamic(() => import('./care-plan-review')),
  'safeguarding-incident':       dynamic(() => import('./safeguarding-incident')),
  'clinical-crisis-simulation':  dynamic(() => import('./clinical-crisis-simulation')),
  'patient-family-conversation': dynamic(() => import('./patient-family-conversation')),
}

export function loadBlock(blockId) {
  return LOADERS[blockId] || null
}

export function listBlocks() {
  return Object.values(BLOCK_CATALOGUE)
}

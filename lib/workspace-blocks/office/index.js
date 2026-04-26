'use client'

// Office shell block registry. Re-exports the catalogue (plain data) for
// callers that need it on the client, and exposes a loader that returns
// the lazy-loaded React component for a given block id. The orchestrator
// uses loadBlock(id) to mount the right component for each scenario step
// without forcing all 14 components into the initial bundle.
//
// Server callers (scenario-generator, /api/assessment/generate) should
// import BLOCK_CATALOGUE from './catalogue' directly to avoid pulling
// 'use client' into the server graph.

import dynamic from 'next/dynamic'
import { BLOCK_CATALOGUE, BLOCK_STAGE_ORDER } from './catalogue'

export { BLOCK_CATALOGUE, BLOCK_STAGE_ORDER }

const LOADERS = {
  'inbox':                   dynamic(() => import('./inbox')),
  'slack-teams':             dynamic(() => import('./slack-teams')),
  'conversation-simulation': dynamic(() => import('./conversation-simulation')),
  'spreadsheet-data':        dynamic(() => import('./spreadsheet-data')),
  'reading-summarising':     dynamic(() => import('./reading-summarising')),
  'document-writing':        dynamic(() => import('./document-writing')),
  'presentation-output':     dynamic(() => import('./presentation-output')),
  'decision-queue':          dynamic(() => import('./decision-queue')),
  'approvals':               dynamic(() => import('./approvals')),
  'trade-offs':              dynamic(() => import('./trade-offs')),
  'calendar-planning':       dynamic(() => import('./calendar-planning')),
  'task-prioritisation':     dynamic(() => import('./task-prioritisation')),
  'crisis-simulation':       dynamic(() => import('./crisis-simulation')),
  'stakeholder-conflict':    dynamic(() => import('./stakeholder-conflict')),
}

export function loadBlock(blockId) {
  return LOADERS[blockId] || null
}

export function listBlocks() {
  return Object.values(BLOCK_CATALOGUE)
}

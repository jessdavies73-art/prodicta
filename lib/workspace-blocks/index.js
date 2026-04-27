'use client'

// Cross-shell block dispatch. The orchestrator (ModularWorkspace) calls
// loadBlockForShell(shell_family, blockId) to mount the right component
// for an assessment whose shell may be:
//   'office'      Phase 1, live
//   'healthcare'  Phase 2, gated by healthcare_workspace_enabled
//   'education'   Phase 2, gated by education_workspace_enabled (stubs)
// The caller decides which shell to use based on assessment.shell_family;
// this module just dispatches to the right per-shell registry without
// pulling every shell into the initial bundle.
//
// Server callers should import the per-shell catalogue directly from
// './office/catalogue', './healthcare/catalogue', or './education/catalogue'
// to keep 'use client' out of the server graph.

import * as office from './office'
import * as healthcare from './healthcare'
import * as education from './education'

const SHELLS = {
  office,
  healthcare,
  education,
}

export function loadBlockForShell(shell_family, blockId) {
  const shell = SHELLS[shell_family]
  if (!shell) return null
  return shell.loadBlock(blockId)
}

export function getBlockCatalogueForShell(shell_family) {
  const shell = SHELLS[shell_family]
  if (!shell) return null
  return shell.BLOCK_CATALOGUE
}

export function getBlockStageOrderForShell(shell_family) {
  const shell = SHELLS[shell_family]
  if (!shell) return null
  return shell.BLOCK_STAGE_ORDER
}

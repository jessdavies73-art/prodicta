// Document writing block scorer.
//
// Reads the candidate's document_text, word_count, and time_writing_seconds
// against the brief in block_content (document_type, audience, word_limit,
// must_include, no_gos, context).

import { runScorer } from './_shared.js'

const BLOCK_ID = 'document-writing'
const BLOCK_NAME = 'Document writing'

const CRITERIA = `Score the candidate against these six criteria. Quote candidate phrases when forming evidence.

1. AUDIENCE FIT. The document should read like the right register for the named audience in block_content. A note to a CEO is shorter and more decisive than a note to a peer team; a client letter is more formal than an internal memo. A misjudged register is the most common watch-out here.

2. MUST_INCLUDE COVERAGE. The must_include array in block_content lists the specific points the document must hit. For each must_include item, did the document address it explicitly? Missing one or two items is a watch-out; missing three or more is a structural failure.

3. NO_GOS RESPECTED. Did the document avoid anything in the no_gos list? Naming a third party they should not have named, committing to something they had no authority to commit to, or pre-empting a conclusion they were told not to draw is a discretion failure and a clear watch-out.

4. WORD COUNT. The word_count should sit close to the word_limit (target plus or minus 15 percent). Significantly under-running suggests they undercut the brief; significantly over-running suggests they could not hold the line.

5. STRUCTURE. Does the document have a clear opening that sets context, a body that addresses the must_include points in a logical order, and a close that names the next step or the requested action? Missing any of these reads as a draft, not a finished piece.

6. TONE AND CLARITY. Read for tone (does it match what the audience expects from this role) and for clarity (is the language plain, are sentences active, are claims supported). Vague hedging language and excessive qualifiers weaken a document; over-confident assertions on a sensitive topic are equally off.`

export async function scoreDocumentWriting({ anthropic, role_profile, role_title, account_type, employment_type, scenario_context, block_content, candidate_inputs }) {
  return runScorer({
    anthropic,
    block_id: BLOCK_ID,
    blockName: BLOCK_NAME,
    role_profile,
    role_title,
    account_type,
    employment_type,
    scenario_context,
    block_content,
    candidate_inputs,
    criteria: CRITERIA,
  })
}

export const DOCUMENT_WRITING_BLOCK_ID = BLOCK_ID

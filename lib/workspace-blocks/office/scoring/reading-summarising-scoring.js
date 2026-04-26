// Reading and summarising block scorer.
//
// Reads the candidate's summary_bullets, recommendation, question, and
// time_reading_seconds against the document_text and document_type they
// were shown.

import { runScorer } from './_shared.js'

const BLOCK_ID = 'reading-summarising'
const BLOCK_NAME = 'Reading and summarising'

const CRITERIA = `Score the candidate against these four criteria. Reference the document_text in block_content when forming evidence.

1. HEADLINE BULLETS. Do the summary_bullets capture the actual headline of the document, or surface details? The headline is the substantive risk, decision, or finding the document hinges on. Strong bullets name specific numbers, parties, or clauses lifted from the text. Weak bullets restate generic structural points ("the document discusses risk").

2. ACTIONABLE RECOMMENDATION. The recommendation should be specific enough that a colleague could act on it tomorrow: name what to do, who needs to do it, and the deadline if known. A vague recommendation ("we should investigate further") with no named owner or action is a watch-out.

3. CRITICAL THINKING IN THE QUESTION. The question field should probe an assumption, a missing piece of evidence, or a weakness in the document's reasoning. A clarifying question that asks for a fact already in the document is shallow; a question that interrogates the basis of the document's conclusion is the signal we want.

4. READING TIME REASONABLENESS. time_reading_seconds against document_word_count tells us pace. A reasonable adult reads 200 to 250 words per minute. Far below that suggests skimming and missing detail; far above suggests getting stuck or re-reading. Use this as a contextual signal alongside the content quality, not as the dominant factor.`

export async function scoreReadingSummarising({ anthropic, role_profile, role_title, account_type, employment_type, scenario_context, block_content, candidate_inputs }) {
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

export const READING_SUMMARISING_BLOCK_ID = BLOCK_ID

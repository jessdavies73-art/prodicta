// Spreadsheet and data block scorer.
//
// Reads the candidate's highlighted_cells, cell_notes, and summary_text
// against the rows/columns/anomalies in block_content. The anomalies
// array is the ground truth: each anomaly has a row_index, col_index,
// type, and a hint string used to award credit for catching the right
// cells.

import { runScorer } from './_shared.js'

const BLOCK_ID = 'spreadsheet-data'
const BLOCK_NAME = 'Spreadsheet and data'

const CRITERIA = `Score the candidate against these four criteria. The anomalies array in block_content is your ground truth: it lists the specific cells (row_index, col_index) that are deliberately planted as outliers, suspicious variances, attribution concentrations, data quality issues, missing values, or threshold breaches. Use the hint on each anomaly only as your own scoring reference; the candidate did not see hints.

1. ANOMALY CATCH. Compare highlighted_cells against the anomalies list. Catching at least one planted anomaly is the baseline for a passing score on this block. Catching every planted anomaly is excellent. Highlighting cells that are not anomalies is not penalised in itself (it is exploration), but if the candidate highlighted only non-anomalies they have missed the point.

2. INTERPRETATION IN THE NOTES. cell_notes is the candidate's per-cell note. Strong notes interpret what the anomaly means ("this campaign is over budget by 40 percent and underperforming on conversion"), not just describe what the cell shows ("this is a high number"). Description without interpretation is shallow.

3. HEADLINE INSIGHT IN THE SUMMARY. summary_text should name the headline finding from the data, not restate the table. A strong summary reads like one or two sentences a Director would actually want: what is going on, where, and what the implication is. Weak summaries narrate the table or hedge with no commitment.

4. RECOMMENDED ACTION GROUNDED. Did the summary include a recommended next action that follows from the anomalies they spotted? An action with no anchor in the data is hand-waving. An action grounded in a specific row or metric the candidate flagged is the signal we want.`

export async function scoreSpreadsheetData({ anthropic, role_profile, role_title, account_type, employment_type, scenario_context, block_content, candidate_inputs }) {
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

export const SPREADSHEET_DATA_BLOCK_ID = BLOCK_ID

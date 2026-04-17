/**
 * Calculate the Placement Survival Score (0-100%)
 *
 * Represents the predicted likelihood of completing the assignment
 * or passing probation, based on assessment data.
 */
export function calculateSurvivalScore({
  overallScore = 50,
  hiringConfidence = null,
  watchouts = [],
  executionReliability = null,
  trainingPotential = null,
}) {
  // Raw score starts from overall assessment score
  let raw = overallScore

  // Hiring confidence: High = +15, Medium = +5, Low = -10
  const hcScore = typeof hiringConfidence === 'object' && hiringConfidence
    ? (hiringConfidence.score ?? null)
    : (typeof hiringConfidence === 'number' ? hiringConfidence : null)

  if (hcScore != null) {
    if (hcScore >= 70) raw += 15
    else if (hcScore >= 55) raw += 5
    else raw -= 10
  }

  // Watch-out severity penalties
  const safeWatchouts = Array.isArray(watchouts) ? watchouts : []
  for (const w of safeWatchouts) {
    const sev = typeof w === 'object' ? w.severity : null
    if (sev === 'High') raw -= 8
    else if (sev === 'Medium') raw -= 4
    else if (sev === 'Low') raw -= 1
  }

  // Execution reliability: minor shift
  if (typeof executionReliability === 'number') {
    raw += Math.round((executionReliability - 50) * 0.1)
  }

  // Training potential: minor shift
  if (typeof trainingPotential === 'number') {
    raw += Math.round((trainingPotential - 50) * 0.1)
  }

  // Linear mapping with compressed range
  // raw typically ranges from ~-10 to ~110
  // Map to survival range of ~20 to ~95
  const survival = Math.round(raw * 0.58 + 26)

  return Math.min(97, Math.max(8, survival))
}

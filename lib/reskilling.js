// Re-skilling suggestion mapping based on watch-out category keywords
const SUGGESTIONS = {
  'attention to detail': 'Buddy-up with a detail-oriented team member for the first two weeks. Assign a daily end-of-day checklist to build the habit. Review their first three pieces of work together before submission.',
  'detail': 'Buddy-up with a detail-oriented team member for the first two weeks. Assign a daily end-of-day checklist to build the habit. Review their first three pieces of work together before submission.',
  'communication': 'Weekly 15-minute check-in with line manager for the first month. Give written briefs before verbal instructions. Encourage them to summarise meetings in writing immediately after.',
  'prioritisation': 'Daily morning task ranking exercise for the first two weeks. Use a simple traffic light system: urgent today, important this week, can wait. Review at end of day.',
  'prioritization': 'Daily morning task ranking exercise for the first two weeks. Use a simple traffic light system: urgent today, important this week, can wait. Review at end of day.',
  'pressure': 'Gradual workload ramp-up in weeks one and two. Avoid high-stakes deadlines in the first month. Assign a go-to contact for when they feel overwhelmed.',
  'stress': 'Gradual workload ramp-up in weeks one and two. Avoid high-stakes deadlines in the first month. Assign a go-to contact for when they feel overwhelmed.',
  'collaboration': 'Pair with a socially confident team member for onboarding. Include in team activities early. One-to-one introductions before group meetings.',
  'teamwork': 'Pair with a socially confident team member for onboarding. Include in team activities early. One-to-one introductions before group meetings.',
  'decision': 'Provide clear decision frameworks for common situations in their first week. Encourage decisions on low-risk tasks first. Debrief on decisions made in weekly check-in.',
  'reliability': 'Clear expectations document on day one covering hours, deadlines, and communication standards. Daily check-in for first two weeks. Address any missed commitments immediately and specifically.',
  'accountability': 'Clear expectations document on day one covering hours, deadlines, and communication standards. Daily check-in for first two weeks. Address any missed commitments immediately and specifically.',
  'leadership': 'Shadow a senior leader for the first month. Assign one small team responsibility in week two. Regular feedback on leadership moments observed.',
  'conflict': 'Provide clear decision frameworks for common situations in their first week. Encourage decisions on low-risk tasks first. Debrief on decisions made in weekly check-in.',
  'negotiation': 'Provide clear decision frameworks for common situations in their first week. Encourage decisions on low-risk tasks first. Debrief on decisions made in weekly check-in.',
  'analytical': 'Pair with a senior analyst from day one. Set structured reporting exercises in weeks one and two. Review analytical outputs together before submission.',
  'planning': 'Daily morning task ranking exercise for the first two weeks. Use a simple traffic light system: urgent today, important this week, can wait. Review at end of day.',
  'organisation': 'Daily morning task ranking exercise for the first two weeks. Use a simple traffic light system: urgent today, important this week, can wait. Review at end of day.',
}

const DEFAULT_SUGGESTION = 'Schedule a structured week one review with the line manager to discuss this specific area. Set one measurable goal for improvement in the first 30 days. Review progress at the month one check-in.'

export function getReskilingSuggestion(watchoutTitle) {
  if (!watchoutTitle) return DEFAULT_SUGGESTION
  const lower = watchoutTitle.toLowerCase()
  for (const [keyword, suggestion] of Object.entries(SUGGESTIONS)) {
    if (lower.includes(keyword)) return suggestion
  }
  return DEFAULT_SUGGESTION
}

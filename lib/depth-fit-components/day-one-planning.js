// Day One Planning generator. Produces the calendar events the
// candidate sees in the Day One Planning UI: three fixed events, one
// interruption, one deadline, and four unscheduled tasks the candidate
// has to place into the day.
//
// Branches on shell_family x seniority so an HCA gets handover and
// observation rounds, a Class Teacher gets parent meetings and
// marking, and a Headteacher gets SLT and Ofsted prep. Office shell
// keeps the legacy templates (junior/mid/senior) so existing flows
// see no change.
//
// Output shape matches the legacy calendar_events shape so existing
// readers (the calendar UI, the calendar-score route's input) work
// unchanged once we map at read time.

import {
  DAY_ONE_GUIDANCE,
  shellComplianceLine,
  resolveSeniorityForShell,
  cleanModelJson,
} from './_shared'

function buildPrompt({ role_title, shell_family, seniority }) {
  const guidance = DAY_ONE_GUIDANCE[shell_family]?.[seniority]
    || DAY_ONE_GUIDANCE.office[seniority]
    || DAY_ONE_GUIDANCE.office.mid
  const compliance = shellComplianceLine(shell_family)

  return `Generate realistic first-Monday calendar events for a "${role_title}" role.

Shell: ${shell_family}. Seniority tier: ${seniority}.

${guidance}

${compliance}

Return JSON only. UK English. No emoji. No em dashes. PRODICTA in all caps if mentioned.
{
  "fixed_events": [
    {"time": "09:00", "title": "string", "type": "meeting"},
    {"time": "10:30", "title": "string", "type": "meeting"},
    {"time": "15:30", "title": "string", "type": "meeting"}
  ],
  "interruption": {"time": "11:00", "title": "string", "type": "interruption"},
  "deadline": {"time": "14:00", "title": "string", "type": "deadline"},
  "unscheduled_tasks": [
    {"title": "string", "type": "task"},
    {"title": "string", "type": "task"},
    {"title": "string", "type": "task"},
    {"title": "string", "type": "task"}
  ]
}

Constraints:
- All event titles natural-sounding for the role and shell.
- Fixed events span morning to late afternoon.
- The interruption should be plausible for the role (a senior asking for input, a family member arriving, a parent at reception).
- The deadline should be a single concrete deliverable expected by 14:00.
- Unscheduled tasks should be four things the candidate must place into the day; mix admin and judgement work.`
}

export async function generateDayOnePlanning({
  client,
  role_title,
  role_profile,
  role_level,
  canonical_level,
  shell_family,
}) {
  if (!client) throw new Error('day-one-planning: anthropic client required')
  if (!role_title) throw new Error('day-one-planning: role_title required')

  const shell = shell_family || 'office'
  const seniority = resolveSeniorityForShell({
    shell_family: shell,
    role_profile,
    role_level,
    canonical_level,
  })

  const prompt = buildPrompt({ role_title, shell_family: shell, seniority })

  const stream = client.messages.stream({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  })
  const msg = await stream.finalMessage()
  const text = msg?.content?.[0]?.text || ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) {
    throw new Error('day-one-planning: model did not return JSON')
  }
  const events = JSON.parse(cleanModelJson(match[0]))

  return {
    payload: events,
    diagnostics: {
      shell_family: shell,
      seniority,
      role_title,
    },
  }
}

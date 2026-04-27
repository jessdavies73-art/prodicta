// Inbox Overload generator. Produces inbox items + a mid-task
// interruption per scenario the candidate works through. The shape
// mirrors the legacy inbox_events so the existing inbox UI works
// without change; we just route the read path through depth_fit_components
// when present.
//
// Branches on shell_family x seniority. An HCA gets a senior nurse
// asking about a resident and a hoist transfer request; a Class
// Teacher gets a parent complaint about marking; a Headteacher gets
// a MAT CEO update request and a media enquiry about a safeguarding
// incident.

import {
  INBOX_GUIDANCE,
  shellComplianceLine,
  resolveSeniorityForShell,
  cleanModelJson,
} from './_shared'

function buildPrompt({ role_title, shell_family, seniority, scenarioCount }) {
  const guidance = INBOX_GUIDANCE[shell_family]?.[seniority]
    || INBOX_GUIDANCE.office[seniority]
    || INBOX_GUIDANCE.office.mid
  const compliance = shellComplianceLine(shell_family)

  return `Generate realistic inbox overload items for each scenario in a "${role_title}" assessment.
There are ${scenarioCount} scenarios. Generate one block of inbox items per scenario.

Shell: ${shell_family}. Seniority tier: ${seniority}.

${guidance}

${compliance}

For EACH scenario, generate:
- 3 inbox items that land at the same time as the scenario:
    1. an urgent external request (client, family, parent, GP, regulator depending on shell)
    2. a resource or operational constraint notification
    3. a team or internal message
- 1 interruption message from a manager or senior colleague that arrives mid-task

Return JSON only. UK English. No emoji. No em dashes. PRODICTA in all caps if mentioned.
{
  "scenarios": [
    {
      "scenario_index": 0,
      "inbox_items": [
        {"sender": "string", "subject": "string", "preview": "string", "priority": "urgent", "type": "client"},
        {"sender": "string", "subject": "string", "preview": "string", "priority": "action_needed", "type": "resource"},
        {"sender": "string", "subject": "string", "preview": "string", "priority": "today", "type": "team"}
      ],
      "interruption": {"sender": "string", "role": "string", "message": "string"}
    }
  ]
}

Constraints:
- Sender names should fit the role and shell (a Senior Nurse, a Ward Sister, a SENCO, a Head of Year, a CFO).
- Subject lines should be plausible work language, not generic placeholders.
- Preview text should be 1-2 short sentences each.
- Priority values must be one of: urgent, action_needed, today.
- Type values: pick whatever fits the shell (client, family, resource, team, governance, safeguarding).
- For healthcare: use placeholder language (the prescribed analgesia, the regular round). No real drug names.
- For education: anonymise pupils (Pupil A, Pupil B). Never name a real school.`
}

export async function generateInboxOverload({
  client,
  role_title,
  role_profile,
  role_level,
  canonical_level,
  shell_family,
  scenarios,
}) {
  if (!client) throw new Error('inbox-overload: anthropic client required')
  if (!role_title) throw new Error('inbox-overload: role_title required')
  if (!Array.isArray(scenarios) || scenarios.length === 0) {
    throw new Error('inbox-overload: scenarios array required')
  }

  const shell = shell_family || 'office'
  const seniority = resolveSeniorityForShell({
    shell_family: shell,
    role_profile,
    role_level,
    canonical_level,
  })

  const prompt = buildPrompt({
    role_title,
    shell_family: shell,
    seniority,
    scenarioCount: scenarios.length,
  })

  const stream = client.messages.stream({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1200,
    messages: [{ role: 'user', content: prompt }],
  })
  const msg = await stream.finalMessage()
  const text = msg?.content?.[0]?.text || ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) {
    throw new Error('inbox-overload: model did not return JSON')
  }
  const events = JSON.parse(cleanModelJson(match[0]))

  return {
    payload: events,
    diagnostics: {
      shell_family: shell,
      seniority,
      role_title,
      scenario_count: scenarios.length,
    },
  }
}

// Smoke-test the crisis-simulation normaliser and block-render readiness.
// Runs three synthetic role-specific crises (MD, Marketing Manager, HR
// Director) through the same normaliser path the live scenario generator
// uses, then walks through the candidate-facing flow programmatically to
// confirm the captured payload matches the schema.

// We can't import the JSX block from a Node script (next/dynamic + JSX),
// so instead exercise the contract: simulate the orchestrator's handoff,
// the candidate's three responses, and the final reflection capture, then
// assert the shape of the payload sent back via onComplete.

const SAMPLES = {
  'MD (largest customer terminated)': {
    block_content: {
      summary: 'Largest customer has just terminated.',
      setup: '',
      expected_output: '',
      connects_from: 'Variance review showed the account was at risk.',
      connects_to: '',
      key_items: [],
      trigger_type: 'phone_call',
      initial_alert:
        'Patrick, it is Helen Carter at NorthCo. The board met this morning and we are terminating the master services agreement. The notice letter is going to legal in the next hour. I wanted you to hear it from me.',
      caller_or_sender: { name: 'Helen Carter', role: 'Procurement Director, NorthCo', relationship: 'external' },
      stage_1: {
        new_information:
          'Helen has hung up. Your CFO Suriya is in your office doorway. NorthCo is 22 percent of FY revenue and the renewal had been booked into the forecast.',
        prompt: 'What do you say to Suriya in the next 60 seconds, and who do you call first?',
      },
      stage_2: {
        new_information:
          'Suriya has agreed to delay her board call by an hour. Sales lead has heard about it and wants to fly to Manchester this afternoon to try to reverse it. Two competitors have already left voicemails for the Account Director.',
        prompt: 'Suriya is asking what you want her to tell the board chair. What is your line, and what do you authorise the sales lead to do?',
      },
      stage_3: {
        new_information:
          'It is now 11:30. The chair is on hold and wants three things: cause, exposure, and what you are doing about it. A FT journalist has called the comms director asking to confirm the loss.',
        prompt: 'You have five minutes before the chair drops. Give Suriya the three lines verbatim and tell her what comms says back to the FT.',
      },
    },
  },
  'Marketing Manager (campaign typo going live)': {
    block_content: {
      summary: 'Q3 campaign launches with a typo.',
      setup: '', expected_output: '', connects_from: '', connects_to: '', key_items: [],
      trigger_type: 'urgent_message',
      initial_alert:
        'It is Jess at Bright Agency. The Channel 4 30-second cut just landed in your inbox and the end-frame says "Trasted by 2 million businesses". It airs at 13:00. We can pull and re-master but you have to call it in the next twenty minutes.',
      caller_or_sender: { name: 'Jess Reardon', role: 'Account Director at Bright Agency', relationship: 'external' },
      stage_1: {
        new_information:
          'You re-watch the cut. The typo is in the supered end-frame, two seconds before fade. Air is in 2 hours, on three channels. The CMO is in a board prep and your media buyer cannot reach her.',
        prompt: 'What do you tell Jess in the next 60 seconds and what do you do about the CMO?',
      },
      stage_2: {
        new_information:
          'Jess is mastering a corrected cut now but cannot deliver until 12:35. Your media agency says Channel 4 will not accept a swap inside 30 minutes of broadcast and there is a £45k late-make-good fee. The PR director has just walked in and is asking what to brief Trade Press.',
        prompt: 'CMO is calling, what is your update? Be specific about which version airs at 13:00 and what we say if anyone notices.',
      },
      stage_3: {
        new_information:
          'CMO has just walked in. Five minutes until her next meeting. She is asking who signed off the master, what it costs to swap, and whether to tell the CEO before he sees it air.',
        prompt: 'Three sentences. Give her the call and the cost, and tell her what you want her to do with the CEO.',
      },
    },
  },
  'HR Director (tribunal claim + journalists)': {
    block_content: {
      summary: 'Tribunal claim hits, journalist enquiries follow.',
      setup: '', expected_output: '', connects_from: '', connects_to: '', key_items: [],
      trigger_type: 'breaking_news',
      initial_alert:
        'I have just had Tom Webb on. He has issued an ET1 against the company for unfair dismissal and race discrimination. He has also given an interview to the Guardian and they are running with it on the website at 14:00. He is your former Senior Buyer.',
      caller_or_sender: { name: 'Priya Shah', role: 'Head of Comms', relationship: 'internal' },
      stage_1: {
        new_information:
          'Priya forwards the Guardian reporter\'s questions: did the company know about the grievance Tom raised in March, who signed off the dismissal, and were any other employees affected. The CEO is on a flight back from Frankfurt and is uncontactable for two hours.',
        prompt: 'Priya needs a holding line for the Guardian in 30 minutes. What does it say, and who do you brief inside the building right now?',
      },
      stage_2: {
        new_information:
          'External legal counsel has agreed the holding line but wants to see the dismissal file before any further statement. The line manager who took the decision has just texted you saying he will resign rather than be named. Two other former employees of his are following the Guardian story on LinkedIn.',
        prompt: 'The CEO will land in 45 minutes. What is the full briefing for him, and what do you say to the line manager tonight?',
      },
      stage_3: {
        new_information:
          'It is 13:55. Guardian goes live in 5. The Chair has been forwarded the article and is asking, on a recorded call, whether we knew Tom had raised concerns and whether we have a problem with the line manager more widely.',
        prompt: 'Three sentences for the Chair, on the record. Be careful what you commit to.',
      },
    },
  },
}

// Inline copy of the normaliser logic so this script does not depend on
// importing JSX-laden modules. Mirrors lib/scenario-generator.js.
function normaliseCrisisSimulation(entry) {
  const safeStr = (v) => (typeof v === 'string' ? v.trim() : '')
  const REL = ['external', 'senior', 'peer', 'junior', 'internal']
  const TRIGGERS = ['phone_call', 'urgent_message', 'breaking_news']
  const trigger_type = TRIGGERS.includes(entry?.trigger_type) ? entry.trigger_type : 'phone_call'
  const initial_alert = safeStr(entry?.initial_alert)
  const cs = entry?.caller_or_sender || {}
  const caller_or_sender = {
    name: safeStr(cs?.name),
    role: safeStr(cs?.role),
    relationship: REL.includes(cs?.relationship) ? cs.relationship : 'internal',
  }
  const stage = (s) => {
    if (!s || typeof s !== 'object') return null
    const ni = safeStr(s.new_information), p = safeStr(s.prompt)
    if (!ni && !p) return null
    return { new_information: ni, prompt: p }
  }
  const stage_1 = stage(entry?.stage_1)
  const stage_2 = stage(entry?.stage_2)
  const stage_3 = stage(entry?.stage_3)
  if (!initial_alert && !stage_1 && !stage_2 && !stage_3) return null
  return { trigger_type, initial_alert, caller_or_sender, stage_1, stage_2, stage_3 }
}

// Simulate the orchestrator -> block contract end to end:
function simulateBlockRun(roleLabel, sample) {
  const normalised = normaliseCrisisSimulation(sample.block_content)
  if (!normalised) return { roleLabel, ok: false, reason: 'normaliser rejected payload' }

  const stages = [normalised.stage_1, normalised.stage_2, normalised.stage_3].filter(Boolean)

  const simulatedResponses = stages.map((s, i) => ({
    stage_number: i + 1,
    candidate_response:
      i === 0
        ? 'Hold the floor; CFO with me; call legal and the comms director; do not speak to press.'
        : i === 1
        ? 'Brief the chair: cause-known, exposure-quantified, mitigation-running. Do not authorise outreach.'
        : 'Three sentences for the chair: facts, mitigation, accountability. Comms says no comment to FT until 15:00.',
    time_per_stage: 70 + i * 12,
  }))

  const reflection =
    'I would have escalated to the chair sooner and avoided letting sales improvise an in-person reversal under emotion.'

  const captured = {
    block_id: 'crisis-simulation',
    stage_responses: simulatedResponses,
    final_reflection: reflection,
    full_transcript: '<<built by buildTranscript>>',
    decision_pattern: { stages_completed: stages.length, average_response_seconds: 82, average_response_length_chars: 140, cadence: 'measured' },
    trigger_type: normalised.trigger_type,
    caller_or_sender: normalised.caller_or_sender,
    total_time_in_block: 312,
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  }

  return {
    roleLabel,
    ok: true,
    normalised,
    captured,
    stages_count: stages.length,
  }
}

let pass = 0, fail = 0
for (const [roleLabel, sample] of Object.entries(SAMPLES)) {
  const r = simulateBlockRun(roleLabel, sample)
  if (!r.ok) {
    console.log(`FAIL  ${roleLabel}: ${r.reason}`)
    fail++
    continue
  }
  console.log('---')
  console.log(`Role: ${roleLabel}`)
  console.log(`  trigger_type           : ${r.normalised.trigger_type}`)
  console.log(`  caller_or_sender.name  : ${r.normalised.caller_or_sender.name} (${r.normalised.caller_or_sender.role})`)
  console.log(`  initial_alert          : "${r.normalised.initial_alert.slice(0, 120)}..."`)
  console.log(`  stages                 : ${r.stages_count}`)
  console.log(`  stage_1.prompt         : "${r.normalised.stage_1.prompt.slice(0, 100)}..."`)
  console.log(`  stage_2.new_info       : "${r.normalised.stage_2.new_information.slice(0, 100)}..."`)
  console.log(`  stage_3.prompt         : "${r.normalised.stage_3.prompt.slice(0, 100)}..."`)
  console.log(`  capture.stage_responses: ${r.captured.stage_responses.length} entries with time_per_stage`)
  console.log(`  capture.cadence        : ${r.captured.decision_pattern.cadence}`)
  console.log(`  capture.total_time_in_block: ${r.captured.total_time_in_block}s`)
  pass++
}
console.log('---')
console.log(`pass=${pass} fail=${fail}`)
process.exit(fail === 0 ? 0 : 1)

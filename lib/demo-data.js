// ── Static demo data, no database calls ──────────────────────────────────

// Helper for the four-variant verification question structure used on
// watch-outs and predicted outcomes. Keeps the demo content compact.
const vq = (question, strong, weak, probe) => ({
  question,
  strong_answer_signs: strong,
  weak_answer_signs: weak,
  follow_up_probe: probe,
})

// Build all four account/employment variants for the standard predicted
// outcomes (pass_probation, top_performer, churn_risk, underperformance_risk).
// The same shape applies across roles, so the helper takes a role title and
// stitches it into the question text. The default rendered question is the
// variant matching the assessment's account_type and employment_type.
function makePredictionsVerification(role, defaultFramedFor = 'employer_permanent') {
  const r = role || 'this role'
  const payload = {
    pass_probation: {
      linked_to: 'Pass probation',
      variants: {
        agency_permanent: vq(
          `Tell me about a permanent ${r} role where you cleared probation. What was on the success scorecard, and what did you do in the first 30 days that made the call easy for the line manager? We need to be confident before we send you to the client.`,
          ['Names KPIs and review dates', 'Describes early wins seen by the line manager', 'Owns one weakness honestly', 'Probation passed by design, not by default'],
          ['Cannot remember the probation objectives', 'Generic answer about working hard', 'Blames a previous manager for any difficulty', 'Probation passed by drift'],
          'If you had been pulled into a 30-day review and challenged on performance, what evidence would you bring?',
        ),
        agency_temporary: vq(
          `On a temp ${r} assignment, the equivalent of probation is the first week. Tell me about an assignment where the client decided in week one whether to keep you on, and what you did to make that call obvious.`,
          ['Names a week-one deliverable the client saw', 'Confirms client extended or rebooked', 'Owns what they did, not what the team did', 'Specific feedback from the on-site contact'],
          ['No clear week-one deliverable', 'Hoped the client would notice something', 'Vague memory of how the assignment ended', 'Cannot name the on-site feedback'],
          'What was the moment in that first week where you knew the client had decided?',
        ),
        employer_permanent: vq(
          `We document interview answers under ERA 2025 so the probation case is defensible. Tell me about a permanent ${r} role where you completed probation, what was on the scorecard, and what you would do differently in your first 90 days here.`,
          ['Recalls specific KPIs and review dates', 'Names the cadence of feedback with the line manager', 'Pre-empts probable failure modes for this role', 'Owns one weakness honestly'],
          ['Treats probation as a formality', 'No structured feedback received', 'Cannot name a probation-related KPI', 'Deflects every weakness onto external factors'],
          'If we were writing your 30-day review tomorrow, which behaviour would land on the development side and why?',
        ),
        employer_temporary: vq(
          `There is no probation here, just a sign-off at the end of week one. Tell me about a recent ${r} assignment where the on-site manager confirmed you in week one and what you did to make the decision obvious.`,
          ['First-week deliverable was tangible and visible', 'Names what the on-site manager said when they signed off', 'Worked without daily supervision', 'Aligned to a single clear brief'],
          ['Would expect a heavy onboarding before producing', 'Cannot name a deliverable from week one', 'Required day-to-day direction', 'Talks about plans rather than output'],
          'What would the on-site manager have said about your visible work after five working days?',
        ),
      },
    },
    top_performer: {
      linked_to: 'Become top performer',
      variants: {
        agency_permanent: vq(
          `Tell me about a ${r} role where you outperformed the brief. What did you do, what evidence did the client team use to know, and how would your previous line manager describe it?`,
          ['Quantified the outperformance with a number', 'Names the comparator (peers, baseline, target)', 'Owns the contributing decisions', 'Came back to commercial impact'],
          ['Generic claim of being top of the class', 'No comparator and no number', 'Credit goes to the team or the agency', 'Activity metrics rather than outcomes'],
          'What stopped you from going further than that, and what would have unlocked it?',
        ),
        agency_temporary: vq(
          `Top performer on a temp ${r} assignment usually means the client asks the agency to extend or rebook you. Tell me about an assignment where that happened and what specifically earned it.`,
          ['Client asked for an extension or rebook', 'Names the work that made the difference', 'Describes a moment of unprompted ownership', 'Confirms the agency was told'],
          ['Assignment ended on schedule with no mention', 'Cannot remember the client outcome', 'Took direction only, never proposed', 'No evidence the agency saw it'],
          'When the agency next called you for a similar assignment, what did the client say about you?',
        ),
        employer_permanent: vq(
          `We need to see signs you will outperform, not just survive probation. Tell me about a ${r} role where you did more than the role description and how it became visible to leadership.`,
          ['Specific contribution beyond the brief', 'Leadership was made aware in writing or in a forum', 'Connected the work to revenue or outcomes', 'Owned the choice to go further'],
          ['Effort framed as input rather than output', 'Leadership unaware of the contribution', 'No commercial linkage', 'Performance noticed only by peers'],
          'When you walked out of your last role, what specific evidence of overperformance did you take with you?',
        ),
        employer_temporary: vq(
          `Top performer on this assignment looks like the client asking for you on the next brief. Tell me about a ${r} assignment where that happened and what specifically made them call you back.`,
          ['Client requested the candidate by name on a follow-on', 'Specific output beyond the brief named', 'Worked without supervision uplift', 'Came back to client outcome, not effort'],
          ['No follow-on request was ever made', 'Talks about effort rather than the call-back signal', 'Required ongoing supervision', 'Cannot recall any feedback after the assignment'],
          'When was the last time a client booked you for a second assignment without being asked?',
        ),
      },
    },
    churn_risk: {
      linked_to: 'Leave within 6 months',
      variants: {
        agency_permanent: vq(
          `The agency carries the rebate exposure on this. Tell me honestly what would pull you out of a permanent ${r} role inside the first six months, and how you would raise concerns before deciding to leave.`,
          ['Specific, situational triggers named', 'Acknowledges pull factors honestly', 'Has a process for raising concerns first', 'Owns the choice rather than blaming employers'],
          ['Says "nothing would make me leave"', 'Triggers are vague or all about pay', 'No process for raising concerns first', 'History of short tenures unexplained'],
          'If those triggers showed up in week eight, what would you do before deciding to leave?',
        ),
        agency_temporary: vq(
          `Most temp ${r} churn we see is week-one no-shows and assignment friction. Tell me about a time you had a reason to walk off an assignment and what you did instead.`,
          ['Real friction event from a past assignment', 'Stayed and resolved through the consultant', 'Confirms attendance through to the end', 'Honest about how close it got'],
          ['Has walked off without notice', 'Has not seen a difficult assignment through', 'Blames every issue on previous agencies', 'Cannot describe how they raise issues'],
          'When you have hit a tough day on assignment, who is the first person you contact?',
        ),
        employer_permanent: vq(
          `Tell me about a ${r} role you nearly left in the first six months, why you stayed, and what we should know about your pull factors here. We need to understand the actual triggers because the line manager will be the one managing them.`,
          ['Acknowledges a real near-miss', 'Stayed for a substantive reason, not inertia', 'Names what would actually trigger a move', 'Has surfaced concerns through line management before'],
          ['Says they have never been close to leaving', 'Pull factors are entirely about money', 'No history of raising issues through line management', 'Cannot describe what would cause a move'],
          'If the role we are offering you turned out to be different from what we discussed, what would you do in the first month?',
        ),
        employer_temporary: vq(
          `Mid-assignment drop-off is what we need to avoid. Tell me about a ${r} assignment you saw through to the end despite something going wrong, and what kept you in the seat.`,
          ['Named a specific issue mid-assignment and stayed', 'Worked it out with the on-site manager', 'Saw assignment to its agreed end date', 'No-shows are not in the work history'],
          ['Has dropped an assignment early before', 'Cannot describe an end-of-assignment moment', 'No structure for raising issues with the on-site contact', 'Open work-history gaps unexplained'],
          'What would have to happen on this assignment for you to call it quits before the end date?',
        ),
      },
    },
    underperformance_risk: {
      linked_to: 'Underperformance risk',
      variants: {
        agency_permanent: vq(
          `Tell me about a ${r} role where the early signs of underperformance appeared in your own work. How did you spot them before someone else did, and what did you do? We need this before we put you in front of the client.`,
          ['Self-spotted the signal early', 'Names specific data they were watching', 'Course-corrected with a named action', 'Reported the situation to manager proactively'],
          ['Underperformance was first flagged by someone else', 'No leading indicators named', 'Reaction was defensive', 'Story ends with the manager fixing it'],
          'What is the leading indicator you would watch in the first 30 days here that would tell you the role was not landing?',
        ),
        agency_temporary: vq(
          `On ${r} assignments, underperformance shows up as the supervisor logging quality issues in week one. Tell me about an assignment where that nearly happened and how you turned it around.`,
          ['Named the on-site quality signal', 'Adjusted output inside the same shift or day', 'Confirmed the supervisor fed back positively after', 'Owns the dip honestly'],
          ['Did not notice the dip until told', 'Required reassignment to a different role', 'Cannot name supervisor feedback', 'No example of mid-assignment correction'],
          'How quickly do you usually spot an output drop, and who do you tell first?',
        ),
        employer_permanent: vq(
          `We document this answer under ERA 2025 because underperformance is a defensible signal at probation. Tell me about a ${r} role where you were on the edge of underperforming, what you did, and what your line manager would say about how you handled it.`,
          ['Specific situation, not hypothetical', 'Owns the contribution to the dip', 'Names the action they took', 'Manager would corroborate the recovery'],
          ['Cannot recall a near-miss', 'Blames the role rather than the work', 'Action was passive (waiting for a review)', 'Line manager unlikely to confirm the story'],
          'If your line manager called you out on a quality dip in week six, what is the first thing you would do?',
        ),
        employer_temporary: vq(
          `Underperformance on a ${r} assignment translates to extra supervision. Tell me about an assignment where the on-site manager had to step in and what you did about it.`,
          ['Names the situation and the supervisor intervention', 'Reduced supervision overhead inside the assignment', 'Confirms the supervisor signed it off', 'No pattern of repeated incidents'],
          ['Required heavy supervision throughout', 'Cannot describe the supervisor stepping in', 'Pattern of similar incidents across assignments', 'Blames training or systems'],
          'What does normal independence look like for you by day three of an assignment?',
        ),
      },
    },
  }
  // Attach the default verification_question for each prediction
  for (const k of Object.keys(payload)) {
    const v = payload[k].variants[defaultFramedFor] || payload[k].variants.employer_permanent
    payload[k].verification_question = { framed_for: defaultFramedFor, ...v }
  }
  return payload
}

// Build the four-variant "Likely impact" prediction lines for the major
// report panels (verdict, counter-offer, culture fit, execution reliability,
// training potential, leave analysis, first 30 days, skills breakdown).
// Returns an object shaped like predictions._panels — keyed by panel, each
// holding all four account/employment variants. Caller passes a per-candidate
// summary so the panel sentences read specifically rather than generically.
function makePanelPredictionVariants(role, summary = {}) {
  const r = role || 'this role'
  const tone = summary.tone || 'mixed'
  const strong = tone === 'strong'
  const weak   = tone === 'weak'
  const verdictBase = strong
    ? `Probably lands well in ${r} on the strength of clear evidence across the assessment.`
    : weak
    ? `Likely to struggle in ${r} unless the watch-outs are managed from week one.`
    : `Workable for ${r} with the named watch-outs flagged at induction.`

  const make = (base, lensA, lensAT, lensE, lensET) => ({
    agency_permanent:   `${base} ${lensA}`,
    agency_temporary:   `${base} ${lensAT}`,
    employer_permanent: `${base} ${lensE}`,
    employer_temporary: `${base} ${lensET}`,
  })

  return {
    verdict: make(
      verdictBase,
      'Defensible to send to the client and protects the rebate window.',
      'Safe to place on assignment with a tight first-week check-in for attendance and capability.',
      'Defensible at probation under ERA 2025 if the line manager documents the watch-outs from week one.',
      'Productive on assignment without unusual supervision overhead in the first week.',
    ),
    counter_offer: make(
      `Counter-offer signal traced to the candidate’s motivation language.`,
      'Run a Pre-Start Risk Check before the start date to protect the placement fee.',
      'Less critical for a short assignment, but verify their start-date commitment 48 hours before.',
      'Offer should include a 30-day check-in so any wobble is surfaced before probation closes.',
      'Confirm availability and rate at the start of the assignment to avoid a no-start.',
    ),
    culture_fit: make(
      `Working-style alignment with the role environment was assessed across the standard axes.`,
      'Brief the client on any friction points before the first day to protect placement health.',
      'Match the worker to the assignment style that suits them and reduce friction inside week one.',
      'Manage the friction points in the 30-60-90 plan and document mitigation under ERA 2025.',
      'Pick the right team to drop them into so the assignment runs without friction.',
    ),
    execution_reliability: make(
      `Reliability score reflects how completely instructions were followed across scenarios.`,
      'Low-reliability candidates should not be sent to fee-sensitive clients without supervision uplift.',
      'Critical for assignment delivery. Pair with a supervisor check-in at end of shift one.',
      'Document any reliability watch-out from week one so probation evidence is on file.',
      'Reduces supervision overhead and gives the on-site manager confidence in immediate productivity.',
    ),
    training_potential: make(
      `Trainability score reflects improvement across scenarios and self-awareness about gaps.`,
      'Higher scores reduce ramp risk during the rebate window and protect repeat business.',
      'Useful for short-term upskilling on assignment, less critical for one-off placements.',
      'Higher scores correlate with smoother probation and stronger long-term retention.',
      'Helpful if the assignment requires picking up unfamiliar processes inside the first week.',
    ),
    leave_analysis: make(
      `Disengagement risk traced to a specific behaviour against a specific aspect of the role.`,
      'Action the suggested 30-day intervention to keep the rebate window safe.',
      'Less material for short assignments, but watch for early-shift dropouts.',
      'Document the early-warning sign in the probation file so any move is defensible under ERA 2025.',
      'Check in mid-assignment to avoid a mid-assignment drop that requires a replacement.',
    ),
    first_thirty_days: make(
      `Day-30 signals translate the assessed strengths and watch-outs into observable checkpoints.`,
      'Use these to brief the client and protect placement health in the rebate window.',
      'Compress the same checkpoints into the first 5 working days for a temp placement.',
      'These also form the structured probation evidence the line manager needs under ERA 2025.',
      'Useful as a sign-off list when confirming the assignment is on track at week one.',
    ),
    skills_breakdown: make(
      `Skill profile shows the dimension mix that matters most for ${r}.`,
      'Lead the client conversation with the strongest dimensions and pre-empt the weaker ones.',
      'Prioritise placements that lean on the strong dimensions and avoid those that expose the weak ones.',
      'Build the 30-60-90 plan to compound the strong dimensions and shore up the weak ones for probation.',
      'Match the assignment scope to the strong dimensions so productivity is high from day one.',
    ),
  }
}

// Build all four variants for a watch-out from compact inputs. Each entry is
// {q, strong, weak, probe}. The default rendered question is the variant
// matching the assessment's account_type and employment_type.
function makeWatchoutVerification(parts, defaultFramedFor = 'employer_permanent') {
  const variants = {
    agency_permanent:  vq(parts.agency_permanent.q,  parts.agency_permanent.strong,  parts.agency_permanent.weak,  parts.agency_permanent.probe),
    agency_temporary:  vq(parts.agency_temporary.q,  parts.agency_temporary.strong,  parts.agency_temporary.weak,  parts.agency_temporary.probe),
    employer_permanent: vq(parts.employer_permanent.q, parts.employer_permanent.strong, parts.employer_permanent.weak, parts.employer_permanent.probe),
    employer_temporary: vq(parts.employer_temporary.q, parts.employer_temporary.strong, parts.employer_temporary.weak, parts.employer_temporary.probe),
  }
  const def = variants[defaultFramedFor] || variants.employer_permanent
  return {
    verification_question_variants: variants,
    verification_question: { framed_for: defaultFramedFor, ...def },
  }
}

export const DEMO_ASSESSMENTS = [
  { id: 'demo-assess-1', role_title: 'Marketing Manager', status: 'active', detected_role_type: 'operations', assessment_mode: 'standard', employment_type: 'permanent', scenario_version: 'scenario-v1.0', candidate_count: 1, created_at: '2026-04-20T10:00:00Z',
    interruption_keying: 'assessment',
    job_breakdown: { tasks: [
      'Brief and direct an external creative agency on campaign assets',
      'Build the quarterly marketing plan and align it with sales pipeline targets',
      'Run the weekly cross-functional campaign stand-up with sales, product, and exec',
      'Approve paid media spend by channel and reallocate budget mid-flight',
      'Draft the monthly board update on marketing performance and pipeline contribution',
    ], disruptions: [
      'PR incident or competitor move that needs a response inside 24 hours',
      'Budget cut announced mid-quarter forcing reallocation across live campaigns',
      'Sales raising urgent demand for content that is not in the plan',
      'Supply or product launch slipping after the launch comms are already drafted',
    ], decisions: [
      'Decide whether to delay a launch when the supporting data is not ready',
      'Decide which campaign to pause when budget is cut by 20% with one week notice',
      'Decide whether to push back on the CEO when the brief contradicts the brand position',
    ], failure_points: [
      'Approving spend that cannot be tied to pipeline contribution',
      'Letting cross-functional friction with sales sit unaddressed for weeks',
      'Defending the original plan past the point of usefulness when conditions change',
    ]},
    detected_dimensions: { dimensions: [
      { name: 'Commercial Thinking',            weight: 25, reason: 'Marketing Manager outcomes hinge on pipeline contribution, cost-per-acquisition, and budget efficiency. Without this, decisions default to activity over impact.' },
      { name: 'Stakeholder Management',         weight: 20, reason: 'The role sits between sales, product, and the exec team. Friction across those boundaries is the most common reason marketing leads fail in the first 12 months.' },
      { name: 'Communication',                  weight: 20, reason: 'Brief writing, exec updates, and agency direction all live in this role. Vague communication produces wasted spend and misaligned campaigns.' },
      { name: 'Adaptability',                   weight: 20, reason: 'Marketing plans rarely survive contact with reality. Budget cuts, supply issues, and competitor moves require live re-planning rather than defending the original plan.' },
      { name: 'Decision Making Under Pressure', weight: 15, reason: 'Launch dates, PR incidents, and campaign go/no-go calls compress decisions into hours, not days. Hesitation visibly damages outcomes.' },
    ]},
    dimension_rubrics: { rubrics: [
      { dimension: 'Commercial Thinking',            high_anchor: 'Frames every recommendation in terms of pipeline contribution, cost-per-acquisition, or revenue impact, with named targets and a measurement cadence.', mid_anchor: 'Connects campaign work to business outcomes when prompted, but defaults to engagement and reach metrics in unprompted writing.', low_anchor: 'Reports impressions and engagement rate without linking them to pipeline, revenue, or budget efficiency.' },
      { dimension: 'Stakeholder Management',         high_anchor: 'Reads the political map across sales, product, and exec, and proposes resolutions that protect long-term trust without conceding the marketing position.', mid_anchor: 'Handles individual stakeholder conversations well but takes longer to spot when two stakeholders are pulling in different directions.', low_anchor: 'Lets cross-functional friction sit unaddressed or escalates it to senior management rather than working it through directly.' },
      { dimension: 'Communication',                  high_anchor: 'Writes a tight exec update that ranks options by business risk, spells out the recommendation, and asks for a specific decision by a specific date.', mid_anchor: 'Communicates clearly in person and in writing, though briefs and updates sometimes leave the decision ask implicit.', low_anchor: 'Updates focus on alignment and keeping people informed without specifying what decisions are needed or by when.' },
      { dimension: 'Adaptability',                   high_anchor: 'Re-plans campaigns in real time when budget, supply, or messaging breaks, and protects the underlying objective by changing the route, not the destination.', mid_anchor: 'Adjusts tactics when conditions change but tends to default to a familiar channel mix rather than rethinking the approach.', low_anchor: 'Defends the original plan past the point of usefulness and treats changes as setbacks rather than inputs.' },
      { dimension: 'Decision Making Under Pressure', high_anchor: 'Reaches a defensible decision within hours of a launch incident or PR risk, with trade-offs spelled out, owners named, and a review point booked.', mid_anchor: 'Decides clearly under pressure but occasionally attributes the call to external factors rather than fully owning it.', low_anchor: 'Hesitates, asks for more analysis when time has run out, or defers the decision to the wider team to share the blame.' },
    ]},
    role_profile: {
      work_types: ['decisions', 'communication', 'analysis', 'creation', 'coordination'],
      primary_work_types: ['decisions', 'creation'],
      seniority_band: 'manager',
      function: 'marketing',
      sector_context: 'B2B SaaS scaleup, mid-market UK customer base',
      company_size: 'scaleup',
      employment_type: 'permanent',
      interaction_internal_external: 'mixed',
      ic_or_manager: 'manager',
      stakeholder_complexity: 'multiple',
    },
    shell_family: 'office',
    workspace_scenario: {
      scenario_id: 'demo-marketing-q3-launch',
      shell_family: 'office',
      title: 'Q3 campaign launch brief due',
      spine: 'Your Q3 product launch goes live in three weeks. The creative agency wants the brief signed off today and the CEO has just asked when paid spend goes live.',
      trigger: '9:02am: Email from Helen Carter at Bright agency, subject: "Need final brief by 11am or we miss print deadline". 9:04am: Slack from CEO: "When does Q3 paid go live? Pipeline forecast wants to know."',
      selected_blocks: [
        { block_id: 'inbox', order: 1, duration_seconds: 240, content_ref: 'inbox' },
        { block_id: 'spreadsheet-data', order: 2, duration_seconds: 180, content_ref: 'spreadsheet-data' },
        { block_id: 'document-writing', order: 3, duration_seconds: 300, content_ref: 'document-writing' },
        { block_id: 'decision-queue', order: 4, duration_seconds: 180, content_ref: 'decision-queue' },
        { block_id: 'crisis-simulation', order: 5, duration_seconds: 120, content_ref: 'crisis-simulation' },
      ],
      block_content: {
        'inbox': {
          summary: 'Three messages waiting at 9am: agency deadline, CEO question, finance budget update',
          setup: 'Inbox shows the 11am agency deadline email, the CEO Slack ping, and finance confirming the Q3 envelope at £180k.',
          expected_output: 'Triage and reply to the agency confirming you will have the brief by 11am.',
          connects_from: null,
          connects_to: 'Your reply commits you to producing the brief, which means you need the Q2 numbers first.',
          key_items: [
            'Email: Helen Carter, Bright agency, subject: Q3 final brief deadline',
            'Slack: CEO, channel #marketing, subject: Q3 paid timing',
            'Email: FD, subject: Q3 budget confirmed at £180k',
          ],
        },
        'spreadsheet-data': {
          summary: 'Q2 channel performance shows paid social outperformed paid search 2.4x on cost-per-MQL',
          setup: 'Channel ROI table for Q2: paid social, paid search, content syndication, events. Cost per MQL, MQL-to-SQL rate, attributed pipeline.',
          expected_output: 'Identify the channel mix that should drive the Q3 plan.',
          connects_from: 'You committed to the agency you would have the brief by 11am, so you need a defensible recommendation.',
          connects_to: 'The numbers point to weighting paid social. That becomes the recommendation in your brief.',
          key_items: [
            'Paid social cost per MQL: £42 vs paid search £101',
            'MQL-to-SQL conversion: paid social 18%, paid search 11%',
            'Content syndication pipeline contribution: £62k attributed',
          ],
        },
        'document-writing': {
          summary: 'Draft the Q3 campaign brief that the agency can build creative against',
          setup: 'Brief template: objective, audience, channel mix, key message, deliverables, deadlines, success metrics.',
          expected_output: 'A brief tight enough that the agency can start work without follow-up calls.',
          connects_from: 'The Q2 data tells you to weight paid social and tighten paid search to retargeting only.',
          connects_to: 'Once the brief is sent, four budget calls land needing same-day answers.',
          key_items: [
            'Objective: 240 MQLs / £180k spend / Q3 close',
            'Audience: mid-market RevOps leaders, UK and Ireland',
            'Channel mix: paid social 55%, paid search retargeting 25%, syndication 20%',
          ],
        },
        'decision-queue': {
          summary: 'Four budget calls land while the agency is starting work',
          setup: 'Each requires a yes/no with reasoning: webinar sponsorship £8k, podcast 6 episodes £12k, paid LinkedIn boost £4k, event booth at TechSummit £15k.',
          expected_output: 'Approve, reject, or defer each with a one-sentence reason.',
          connects_from: 'Your brief committed paid social as the primary channel.',
          connects_to: 'While you are approving, a competitor announcement breaks and your brief no longer matches the timeline.',
          key_items: [
            'Webinar sponsorship £8k, aligned with paid social bias',
            'Podcast £12k, 6 episodes, signal to FD on long lead time',
            'LinkedIn boost £4k, small ask, fast yes',
            'TechSummit booth £15k, opportunity cost vs paid social budget',
          ],
        },
        'crisis-simulation': {
          summary: '10:30am: a competitor announces a near-identical product launch in two weeks',
          setup: 'PR alert from monitoring: TechRival announces 13 May launch. Your launch was 27 May. CEO Slack: "Do we move?"',
          expected_output: 'Decide accelerate, hold, or change positioning, and tell the CEO and the agency what is now happening.',
          connects_from: 'Your Q3 brief was for a three-week launch window. The competitor just made that timeline obsolete.',
          connects_to: null,
          key_items: [
            'Competitor: TechRival announces 13 May launch',
            'Your launch was scheduled 27 May',
            'CEO is on Slack now waiting for your call',
          ],
        },
      },
      scenario_arc: {
        stage_1_setup: '9:02am you arrive to a flooded inbox: agency deadline at 11am, CEO question on paid timing, finance confirming £180k budget.',
        stage_2_context: 'Q2 numbers show paid social delivered 2.4x more pipeline efficiency than paid search.',
        stage_3_output: 'You write the Q3 brief weighting paid social and confirm the agency timeline.',
        stage_4_pressure: 'Four budget approval requests land while the agency starts work.',
        stage_5_resolution: '10:30am a competitor announces an identical product launch two weeks earlier than yours. The CEO is on Slack waiting for your call.',
      },
      generated_at: '2026-04-20T09:00:00Z',
    },
  },
  { id: 'demo-assess-2', role_title: 'Sales Executive', status: 'active', detected_role_type: 'admin', assessment_mode: 'standard', employment_type: 'permanent', scenario_version: 'scenario-v1.0', candidate_count: 1, created_at: '2026-04-18T10:00:00Z',
    interruption_keying: 'assessment',
    job_breakdown: { tasks: [
      'Run discovery calls with inbound leads and qualify against ICP',
      'Build and maintain a pipeline of named opportunities in the CRM',
      'Handle pricing and value objections live on the call',
      'Negotiate and close mid-market deals against a quarterly quota',
      'Hand qualified accounts over to customer success with full context',
    ], disruptions: [
      'Prospect goes silent two weeks before quarter-end with the deal partially closed',
      'Procurement enters the conversation late and requests a 25% discount',
      'A competitor counter-offer surfaces during legal review',
      'The product team announces a roadmap slip that affects an in-flight sale',
    ], decisions: [
      'Decide whether to discount or hold price when the prospect threatens to walk',
      'Decide which deals to push and which to slip to next quarter when capacity is tight',
      'Decide when to escalate a stalled deal to the sales lead versus keep working it directly',
    ], failure_points: [
      'Conceding price as the first response to objection rather than diagnosing the real concern',
      'Avoiding a difficult prospect conversation and circling back later instead of addressing it live',
      'External attribution for lost deals (market timing, prospect not ready) blocking self-coaching',
    ]},
    detected_dimensions: { dimensions: [
      { name: 'Commercial Thinking',            weight: 25, reason: 'Sales Executive outcomes are measured directly in pipeline value, conversion rate, and deal margin. Decisions that ignore the commercial impact destroy quota.' },
      { name: 'Stakeholder Management',         weight: 20, reason: 'Discovery, multi-stakeholder buying processes, and post-sale handover all hinge on managing prospect, internal, and partner relationships in parallel.' },
      { name: 'Persistence',                    weight: 20, reason: 'Sales cycles fail more often than they win. The role demands sustained engagement after rejection and refusal to disengage when a deal stalls.' },
      { name: 'Communication',                  weight: 15, reason: 'Pitches, discovery questioning, written follow-ups, and proposal narratives are the primary tools of the trade. Vague communication loses deals at every stage.' },
      { name: 'Adaptability',                   weight: 10, reason: 'Different verticals, buyer personas, and competitive contexts require live adjustment of pitch, framing, and value props.' },
      { name: 'Decision Making Under Pressure', weight: 10, reason: 'Quarter-end, procurement counter-offers, and stalled deals compress decisions into hours. Hesitation costs commission and revenue.' },
    ]},
    dimension_rubrics: { rubrics: [
      { dimension: 'Commercial Thinking',            high_anchor: 'Diagnoses the real commercial concern behind every objection (price as proxy for value, timing as proxy for urgency) and protects margin without losing the deal.', mid_anchor: 'Recognises commercial trade-offs when prompted but defaults to product features rather than value framing in discovery.', low_anchor: 'Treats every objection as a price problem and concedes margin as the first response. Cannot articulate what the deal is worth to the customer.' },
      { dimension: 'Stakeholder Management',         high_anchor: 'Reads the buying committee, identifies the economic buyer and the blockers, and adjusts approach for each. Asks good discovery questions that earn the right to keep selling.', mid_anchor: 'Builds rapport with the named contact but does not always map the wider buying group or anticipate procurement.', low_anchor: 'Sells to whoever picks up the phone. No discovery on stakeholders. Surprised when procurement or legal blocks the deal.' },
      { dimension: 'Persistence',                    high_anchor: 'Continues to engage difficult prospects with structured follow-up after a no, owns lost deals as data for the next attempt, and refuses to let stalled deals slip without diagnosis.', mid_anchor: 'Follows up consistently for the first two attempts, then drops off if the prospect goes quiet. Owns most outcomes but occasionally externalises lost deals.', low_anchor: 'Disengages quickly after rejection. Attributes lost deals to market timing or prospect readiness without acknowledging own role at qualification or close.' },
      { dimension: 'Communication',                  high_anchor: 'Writes prospect-specific follow-ups that reference the conversation explicitly, asks committal closing questions, and never sends a vague check-in email.', mid_anchor: 'Communicates warmly and clearly but uses soft closing language ("when you are ready") that extends cycles and reduces urgency.', low_anchor: 'Generic stock phrases, no personalisation, no clear ask in any written follow-up. Reads like a templated sequence.' },
      { dimension: 'Adaptability',                   high_anchor: 'Adjusts pitch, value framing, and discovery depth to match the buyer persona and competitive context within the first ten minutes of a call.', mid_anchor: 'Adapts when explicitly told the buyer profile differs but defaults to a single pitch in unprompted scenarios.', low_anchor: 'Single pitch, single discovery script. Does not adjust when the buyer signals a different priority.' },
      { dimension: 'Decision Making Under Pressure', high_anchor: 'Decides decisively at quarter-end whether to push or slip, names the trade-offs, and commits to one path with the prospect on the call.', mid_anchor: 'Reaches a decision but defers the prospect-facing communication to a follow-up email rather than handling it live.', low_anchor: 'Reflects, takes the feedback on board, and circles back later rather than addressing the challenge in the moment.' },
    ]},
    role_profile: {
      work_types: ['decisions', 'communication', 'analysis', 'coordination'],
      primary_work_types: ['decisions', 'communication'],
      seniority_band: 'mid',
      function: 'sales',
      sector_context: 'B2B SaaS scaleup, mid-market UK and Ireland',
      company_size: 'scaleup',
      employment_type: 'permanent',
      interaction_internal_external: 'external',
      ic_or_manager: 'ic',
      stakeholder_complexity: 'multiple',
    },
    shell_family: 'office',
    workspace_scenario: {
      scenario_id: 'demo-sales-q2-pipeline',
      shell_family: 'office',
      title: 'Pipeline review with quarter-end pressure',
      spine: 'It is the Monday of week 12 of Q2. Pipeline review with the CEO is at 2pm and the numbers are soft. Your three biggest deals are all in flight.',
      trigger: '9:00am: CEO calendar invite for 2pm pipeline review. 9:03am: Email from David Mehta at Granby Holdings procurement, your largest deal at £85k ARR, requesting 25% discount. 9:08am: Slack from the sales director: "Need your forecast committed by lunch."',
      selected_blocks: [
        { block_id: 'inbox', order: 1, duration_seconds: 270, content_ref: 'inbox' },
        { block_id: 'spreadsheet-data', order: 2, duration_seconds: 210, content_ref: 'spreadsheet-data' },
        { block_id: 'conversation-simulation', order: 3, duration_seconds: 330, content_ref: 'conversation-simulation' },
        { block_id: 'decision-queue', order: 4, duration_seconds: 210, content_ref: 'decision-queue' },
      ],
      block_content: {
        'inbox': {
          summary: 'CEO invite for 2pm review, procurement asking for 25% discount, sales director wanting forecast',
          setup: 'Three messages: CEO calendar invite (2pm), Granby Holdings procurement email (25% discount on £85k ARR, 11am call booked), sales director Slack (forecast by lunch).',
          expected_output: 'Reply to procurement requesting the 11am call to start with their concern, not the discount.',
          connects_from: null,
          connects_to: 'You need to know how the rest of pipeline looks before you commit a forecast or hold price on Granby.',
          key_items: [
            'CEO invite: 2pm pipeline review',
            'Granby Holdings procurement: 25% discount on £85k ARR',
            'Sales director Slack: forecast committed by lunch',
          ],
        },
        'spreadsheet-data': {
          summary: 'CRM pipeline shows ARR weighted £342k against £400k Q2 target',
          setup: 'Pipeline table: 14 deals, stage, ARR, probability, close date, blocker. Granby Holdings is the largest single deal.',
          expected_output: 'Identify which deals you can commit, which to slip to Q3, and which need executive air cover.',
          connects_from: 'You need a defensible forecast number for the sales director and CEO.',
          connects_to: 'The pipeline numbers tell you Granby has to land at full price. You cannot make quota without it.',
          key_items: [
            'Granby Holdings £85k ARR, 75% probability, blocker: procurement discount push',
            'Marlow Industries £62k ARR, 50% probability, blocker: legal review',
            'Bridgepoint £48k ARR, 90% probability, blocker: signature only',
            'Forecast range: £286k committed, £342k best case, target £400k',
          ],
        },
        'conversation-simulation': {
          summary: '11am call with David Mehta at Granby Holdings procurement: hold price, find their real concern',
          setup: 'David Mehta opens with: "Either 25% off or we walk." Your evidence: Q2 Marlow case study, integration scope agreed Friday with their CTO.',
          expected_output: 'Hold price, surface the real concern (timing, scope, internal stakeholder), commit to a path forward.',
          connects_from: 'Pipeline analysis shows Granby has to close at full price for you to make quota.',
          connects_to: 'Your forecast for the sales director assumes Granby holds at £85k. The call result is your forecast input.',
          key_items: [
            'David Mehta, Granby procurement',
            'Q2 Marlow case study: 4.2x ROI in first six months',
            'Integration scope: 6 endpoints, agreed Friday with their CTO',
            'Walk-away threshold: 8% discount with annual commit',
          ],
        },
        'decision-queue': {
          summary: 'Four pipeline calls before the 2pm CEO review',
          setup: 'Decisions: forecast number to commit, which deals to escalate to sales director, which to slip to Q3, what to flag for CEO discussion.',
          expected_output: 'Forecast committed, escalation list named, slipped deals dated, three lines for CEO.',
          connects_from: 'The Granby call outcome and pipeline analysis feed straight into these calls.',
          connects_to: null,
          key_items: [
            'Forecast: commit £315k, stretch £370k',
            'Escalate Marlow legal review to sales director',
            'Slip Northpoint and Vance to Q3',
            'Flag for CEO: Granby discount pressure, Marlow legal blocker, Bridgepoint commit',
          ],
        },
      },
      scenario_arc: {
        stage_1_setup: '9:00am you walk in to a 2pm CEO pipeline review and the largest deal in your pipe just asked for 25% off.',
        stage_2_context: 'Pipeline analysis shows you are £58k short of target with three deals to land.',
        stage_3_output: 'Live call with Granby procurement to hold price and find their real concern.',
        stage_4_pressure: 'Four pipeline calls land before lunch needing same-day answers.',
        stage_5_resolution: 'By 2pm you walk into the CEO review with a committed forecast, an escalation list, and a Granby outcome.',
      },
      generated_at: '2026-04-18T09:00:00Z',
    },
  },
  { id: 'demo-assess-3', role_title: 'Software Developer', status: 'active', detected_role_type: 'finance', assessment_mode: 'standard', employment_type: 'permanent', scenario_version: 'scenario-v1.0', candidate_count: 0, created_at: '2026-04-15T10:00:00Z',
    interruption_keying: 'assessment',
    job_breakdown: { tasks: [
      'Design and ship features against a sprint backlog',
      'Review pull requests from peers and provide structured technical feedback',
      'Debug production incidents and write up the post-incident note',
      'Maintain test coverage and refactor legacy code as part of feature work',
      'Participate in technical design discussions and challenge proposals when needed',
    ], disruptions: [
      'Production incident pages the team mid-sprint and pulls capacity off planned work',
      'A senior engineer pushes back on the proposed design with a different opinion',
      'Sprint scope changes after planning when product reprioritises',
      'A flaky test in CI blocks every merge until someone diagnoses it',
    ], decisions: [
      'Decide whether to ship a partial feature behind a flag versus delay to complete it',
      'Decide whether the right fix for a production bug is a hotfix or a deeper refactor',
      'Decide when a code review comment is a must-fix versus a nice-to-have',
    ], failure_points: [
      'Pushing changes without adequate test coverage and learning from the incident, not the review',
      'Producing code that works but cannot be read by the next engineer in six months',
      'Optimising for cleverness over clarity in shared code',
    ]},
    detected_dimensions: { dimensions: [
      { name: 'Technical Judgement',  weight: 25, reason: 'The core differentiator at this level. Choosing the right approach, recognising when an idea is wrong, and picking the appropriate tool for the problem decide whether the team ships or rebuilds.' },
      { name: 'Problem Solving',      weight: 20, reason: 'Debugging incidents, designing features, and untangling legacy code are all problem-solving tasks. Without it, the role devolves into mechanical ticket execution.' },
      { name: 'Communication',        weight: 15, reason: 'PR descriptions, design docs, code review comments, and post-incident notes are how engineering decisions persist. Unclear communication is unreviewable code.' },
      { name: 'Documentation',        weight: 15, reason: 'Readable code, decision logs, and post-incident notes are the audit trail for every technical choice. Missing documentation creates compounding maintenance cost.' },
      { name: 'Adaptability',         weight: 15, reason: 'Stacks, tools, and team conventions change. The role demands picking up new patterns without losing momentum on the current sprint.' },
      { name: 'Attention to Detail',  weight: 10, reason: 'Edge cases, error handling, and the difference between a working feature and an outage live in details that are easy to skim past.' },
    ]},
    dimension_rubrics: { rubrics: [
      { dimension: 'Technical Judgement',  high_anchor: 'Names the right approach with the trade-offs explicit, recognises when a peer proposal is wrong and says so with evidence, and chooses the simpler tool when both options work.', mid_anchor: 'Reaches a workable approach but does not always articulate why an alternative was rejected. Defers to senior peers on contested decisions even when their own read is correct.', low_anchor: 'Picks the first idea that comes up. Does not surface trade-offs. Cannot defend the choice when challenged on review.' },
      { dimension: 'Problem Solving',      high_anchor: 'Breaks an incident into a sequence of testable hypotheses, identifies the root cause and the second-order monitoring gap, and resists the temptation to ship a quick fix that papers over the deeper issue.', mid_anchor: 'Finds the immediate fix reliably but sometimes stops there rather than asking what allowed the problem to ship.', low_anchor: 'Pattern-matches without diagnosing. Restarts the service and moves on. The same incident keeps recurring.' },
      { dimension: 'Communication',        high_anchor: 'Writes a PR description and a code review comment that another engineer can act on without asking a clarifying question. Explains complex technical context to non-technical stakeholders without losing accuracy.', mid_anchor: 'Communicates clearly with peers but PR descriptions are sometimes thin. Comments on review tend to focus on style over substance.', low_anchor: 'PRs land with no description. Review comments are terse or judgmental. Non-technical stakeholders walk away unsure what was decided.' },
      { dimension: 'Documentation',        high_anchor: 'Treats every non-obvious decision as something a future engineer must be able to reconstruct. Leaves a decision log, an architecture note, or a post-incident write-up as a default.', mid_anchor: 'Documents when prompted but does not naturally write things down. Some decisions live only in chat history.', low_anchor: 'Code is the only documentation. No decision logs, no readme updates, no post-incident notes. Knowledge walks out the door when people leave.' },
      { dimension: 'Adaptability',         high_anchor: 'Picks up an unfamiliar stack or pattern and contributes useful work within a sprint without complaining about the change.', mid_anchor: 'Adapts to changes when given time but tends to fall back on familiar patterns under pressure.', low_anchor: 'Resists tooling and convention changes. Cites how the previous team did it as a reason to keep the old approach.' },
      { dimension: 'Attention to Detail',  high_anchor: 'Catches the off-by-one, the unhandled timezone, the empty-array case, and the missing rollback in design review or PR review before they ship.', mid_anchor: 'Catches the obvious issues but occasionally lets edge cases through. Notices in QA more often than in design.', low_anchor: 'Happy path only. Edge cases reach production. Reviews focus on naming and style rather than correctness.' },
    ]},
    role_profile: {
      work_types: ['decisions', 'communication', 'analysis', 'creation', 'coordination'],
      primary_work_types: ['analysis', 'decisions'],
      seniority_band: 'mid',
      function: 'software_dev',
      sector_context: 'B2B SaaS scaleup, payments platform',
      company_size: 'scaleup',
      employment_type: 'permanent',
      interaction_internal_external: 'internal',
      ic_or_manager: 'ic',
      stakeholder_complexity: 'multiple',
    },
    shell_family: 'office',
    workspace_scenario: {
      scenario_id: 'demo-software-prod-bug',
      shell_family: 'office',
      title: 'Production bug across sprint planning',
      spine: 'A weekend production bug took settlement processing offline for 14 minutes on Sunday night. Sprint planning is at 11am and the on-call engineer wants help.',
      trigger: '9:00am: Slack from on-call: "Sev-2 in settlement processor, 14 min outage Sunday 23:14, root cause not found." 9:05am: Calendar invite from EM: "Sprint planning 11am, please come ready with bug priority."',
      selected_blocks: [
        { block_id: 'task-prioritisation', order: 1, duration_seconds: 210, content_ref: 'task-prioritisation' },
        { block_id: 'reading-summarising', order: 2, duration_seconds: 270, content_ref: 'reading-summarising' },
        { block_id: 'trade-offs', order: 3, duration_seconds: 270, content_ref: 'trade-offs' },
        { block_id: 'crisis-simulation', order: 4, duration_seconds: 270, content_ref: 'crisis-simulation' },
      ],
      block_content: {
        'task-prioritisation': {
          summary: 'Sprint board view: 6 in-progress tickets, weekend bug now landed on top',
          setup: 'Board columns: Backlog, In Progress, In Review, Done. The bug ticket PAY-2287 has just been added with no priority set. Existing in-progress: PAY-2245 (search refactor), PAY-2261 (webhook retry), PAY-2270 (admin UI tidy).',
          expected_output: 'Order the work for the sprint with the bug placed and any existing tickets bumped or dropped.',
          connects_from: null,
          connects_to: 'Whatever you place at the top sets the context for what you read next.',
          key_items: [
            'PAY-2287 settlement bug, no priority set',
            'PAY-2245 search refactor, 3 days remaining',
            'PAY-2261 webhook retry, 1 day remaining',
            'PAY-2270 admin UI tidy, 2 days remaining',
          ],
        },
        'reading-summarising': {
          summary: 'Read the on-call incident note and the related logs from Sunday night',
          setup: 'Incident note: 14-minute outage 23:14 Sunday, settlement queue depth spiked to 8.4k, processor pod restarted twice, no clean root cause. Three log excerpts attached: one Stripe webhook 502 burst, one DB connection-pool warning, one queue worker OOMKilled.',
          expected_output: 'A 4-line summary the EM can paste into the planning agenda: what broke, what is known, what is unknown, and what the candidate would do next.',
          connects_from: 'You placed PAY-2287 at the top of the board, so you need to be able to defend that priority with what is in the incident note.',
          connects_to: 'The summary tells you whether this is a one-line hotfix or a full root-cause sprint, which is the trade-off you walk into next.',
          key_items: [
            'Outage 14 min from 23:14, settlement queue depth 8.4k',
            'Processor pod restarted 23:18 and 23:24, OOMKilled both times',
            'Stripe webhook 502 burst at 23:13, may be the trigger',
            'DB connection-pool warnings from 23:10 onward',
          ],
        },
        'trade-offs': {
          summary: 'Hotfix the symptom or land a proper fix that takes the rest of the sprint',
          setup: 'Option A: bump pod memory, ship today, low confidence in root cause. Option B: hold for a proper queue worker rewrite, no settlement risk over the next two weeks but two stories slip. Option C: split, ship a guarded hotfix today and book a tech-debt ticket for the rewrite.',
          expected_output: 'Pick one and write the trade-off note for the EM.',
          connects_from: 'The incident summary said root cause is unknown but the OOMKilled pattern points at the queue worker.',
          connects_to: 'Whichever option you pick, the EM is going to push back in sprint planning, so you need to be able to defend it.',
          key_items: [
            'Option A: hotfix pod memory, ship today, root cause unconfirmed',
            'Option B: queue worker rewrite, 4 days, settlement risk reduced',
            'Option C: guarded hotfix today plus tech-debt ticket for rewrite',
          ],
        },
        'crisis-simulation': {
          summary: '10:42am: settlement queue spikes again. Same pattern as last night. EM Slacks "What now?"',
          setup: 'Live alert: queue depth 6.1k and climbing, pod memory at 92%. Sprint planning starts in 18 minutes. EM is asking whether to delay planning or push through.',
          expected_output: 'Decide: ship the hotfix now, hold for planning, or call in another engineer. Tell the EM what you are doing and why.',
          connects_from: 'Your trade-off pick assumed you had time to plan. The queue spike just removed that assumption.',
          connects_to: null,
          key_items: [
            'Queue depth 6.1k, climbing',
            'Pod memory 92%',
            'Sprint planning starts in 18 minutes',
            'EM waiting for your call',
          ],
        },
      },
      scenario_arc: {
        stage_1_setup: '9:00am: Sunday-night production bug needs a priority before sprint planning at 11am.',
        stage_2_context: 'Reading the incident note shows OOMKilled queue workers and a Stripe webhook spike, but no confirmed root cause.',
        stage_3_output: 'You commit to a hotfix-vs-rewrite trade-off and write the case for the EM.',
        stage_4_pressure: '10:42am the queue spikes again. Same pattern as last night. The trade-off you just picked is being tested live.',
        stage_5_resolution: 'You decide whether to ship a guarded hotfix now, hold for planning, or pull in another engineer, and tell the EM what is happening.',
      },
      generated_at: '2026-04-15T09:00:00Z',
    },
  },
  { id: 'demo-assess-4', role_title: 'Customer Service Team Leader', status: 'active', detected_role_type: 'customer_service', assessment_mode: 'quick', employment_type: 'permanent', candidate_count: 0, created_at: '2026-04-12T10:00:00Z',
    interruption_keying: 'assessment',
    job_breakdown: { tasks: [
      'Handle escalated customer complaints that the front-line team cannot resolve',
      'Coach advisors on call quality, tone, and complaint handling',
      'Monitor live queue health and reallocate staff between channels during peaks',
      'Decide refund and goodwill authority within published thresholds',
      'Run the daily team huddle and weekly quality review',
    ], disruptions: [
      'A flagship customer escalates to social media while still on the line',
      'An advisor calls in sick during the morning peak',
      'A regulator-level complaint arrives that needs a written response within 48 hours',
      'A system outage doubles the queue with no extra capacity',
    ], decisions: [
      'Decide whether to authorise a goodwill refund above the standard threshold',
      'Decide which advisor to coach now versus defer when both miss target on the same week',
      'Decide when to escalate a complaint to the duty manager versus handle it directly',
    ], failure_points: [
      'Letting an angry customer drive a refund higher than commercial logic supports',
      'Avoiding a difficult feedback conversation with an underperforming advisor',
      'Mishandling a regulator-level complaint and breaching response timeframes',
    ]},
    detected_dimensions: { dimensions: [
      { name: 'Empathy',                         weight: 22, reason: 'Customers escalate when they feel unheard. The role lives or dies on the ability to read distress, frustration, or vulnerability and respond appropriately.' },
      { name: 'Communication',                   weight: 18, reason: 'De-escalation language, advisor coaching feedback, and written complaint responses all hang on tone and clarity. Wrong words make every situation worse.' },
      { name: 'Decision Making Under Pressure',  weight: 16, reason: 'Refund authorisation, escalation, and queue reallocation decisions land on this role within minutes. Hesitation produces worse outcomes than imperfect calls.' },
      { name: 'Prioritisation',                  weight: 14, reason: 'A regulator complaint, a peak queue, and an underperforming advisor all want attention at the same time. The role is built around triage.' },
      { name: 'Adaptability',                    weight: 15, reason: 'Different products, different customer issues, and live system or staffing disruptions require shifting priorities and approaches inside the same shift.' },
      { name: 'Compliance',                      weight: 15, reason: 'GDPR, regulator complaint timeframes, and internal refund policy define the floor. Breaches at front-line level cascade into formal regulatory exposure.' },
    ]},
    dimension_rubrics: { rubrics: [
      { dimension: 'Empathy',                         high_anchor: 'Names the underlying feeling (frustration, embarrassment, fear) before responding to the surface complaint, and adapts tone to the customer in front of them rather than running a script.', mid_anchor: 'Reads the obvious emotions but sometimes responds to the words rather than the feeling. Tone is warm but generic.', low_anchor: 'Treats every customer interaction as a transaction. Does not register or adapt to emotional state. Leans on policy language when distress is present.' },
      { dimension: 'Communication',                   high_anchor: 'De-escalates with specific, validating language; coaches advisors with concrete examples drawn from real calls; writes complaint responses that are clear, accurate, and on-brand.', mid_anchor: 'Communicates clearly with customers but softens too much in advisor feedback conversations, blunting the coaching value.', low_anchor: 'Falls back on policy language under pressure. Coaching is vague ("just be more careful"). Written responses are templated and impersonal.' },
      { dimension: 'Decision Making Under Pressure',  high_anchor: 'Authorises refunds and escalations decisively within the published authority, names the trade-offs, and documents the reason in the same shift.', mid_anchor: 'Decides clearly on familiar issues but defers novel decisions to the duty manager when authority is technically theirs to use.', low_anchor: 'Hesitates, escalates by default, or grants whatever the customer asks to make the issue go away.' },
      { dimension: 'Prioritisation',                  high_anchor: 'Triages the regulator complaint, the angry customer, and the queue health signal into a clear order with named owners and time windows. Reallocates staff in real time.', mid_anchor: 'Spots the urgent issue but works through items sequentially rather than handing some off in parallel.', low_anchor: 'Whoever shouts loudest gets the attention. Loses track of the slow-burning regulator timeframe while firefighting the live queue.' },
      { dimension: 'Adaptability',                    high_anchor: 'Switches between coaching, complaint handling, and queue triage inside the same hour without losing thread on any of them.', mid_anchor: 'Adapts when prompted but prefers a fixed daily routine. Disruptions to the routine produce visible stress.', low_anchor: 'Wedded to the published shift plan. Disruptions are treated as obstacles rather than inputs.' },
      { dimension: 'Compliance',                      high_anchor: 'Knows the regulator response window cold, recognises a policy edge case before it breaches, and refuses to grant goodwill that contradicts published criteria.', mid_anchor: 'Follows policy correctly on familiar issues but sometimes misses an edge case until prompted by a colleague.', low_anchor: 'Treats policy as a guideline. Grants whatever the customer pushes for. Misses regulator timeframes under load.' },
    ]},
    role_profile: {
      work_types: ['decisions', 'communication', 'analysis', 'coordination'],
      primary_work_types: ['communication', 'decisions'],
      seniority_band: 'manager',
      function: 'customer_service',
      sector_context: 'consumer products mid-market UK',
      company_size: 'mid_market',
      employment_type: 'permanent',
      interaction_internal_external: 'mixed',
      ic_or_manager: 'manager',
      stakeholder_complexity: 'multiple',
    },
    shell_family: 'office',
    workspace_scenario: {
      scenario_id: 'demo-cs-viral-complaint',
      shell_family: 'office',
      title: 'Viral complaint hitting Twitter mid-shift',
      spine: 'A weekend complaint went viral on Twitter overnight. The customer is still on the line with an advisor who is not handling it well, and the morning shift is short one advisor.',
      trigger: '9:00am: Slack from duty manager: "Twitter blowing up about case 84421. Sarah has the customer NOW and it is going badly." 9:02am: Advisor Tom calls in sick.',
      selected_blocks: [
        { block_id: 'inbox', order: 1, duration_seconds: 210, content_ref: 'inbox' },
        { block_id: 'conversation-simulation', order: 2, duration_seconds: 330, content_ref: 'conversation-simulation' },
        { block_id: 'decision-queue', order: 3, duration_seconds: 210, content_ref: 'decision-queue' },
        { block_id: 'crisis-simulation', order: 4, duration_seconds: 270, content_ref: 'crisis-simulation' },
      ],
      block_content: {
        'inbox': {
          summary: 'Three messages: duty manager Slack on the viral complaint, advisor sick note, head of CX wanting an update by 11am',
          setup: 'Slack channel #cs-team: duty manager on case 84421, screenshot of the Twitter thread (3.2k retweets), photo of the damaged product. Email from Tom: "Migraine, off today." Email from head of CX: "Status by 11am please."',
          expected_output: 'Acknowledge the duty manager, confirm cover for Tom, and message the head of CX with what you are about to do.',
          connects_from: null,
          connects_to: 'Once cover is sorted you have 5 minutes before you take over the live call from Sarah.',
          key_items: [
            'Slack: duty manager on case 84421, 3.2k retweets',
            'Email: Tom calling in sick',
            'Email: head of CX wanting status by 11am',
          ],
        },
        'conversation-simulation': {
          summary: 'Take over the live call from Sarah and de-escalate with the customer Marie Whitford',
          setup: 'Marie Whitford received a damaged appliance, was on hold for 27 minutes Saturday, and tweeted the photo Sunday night. She wants a full refund plus £200 compensation. Standard goodwill cap is £75.',
          expected_output: 'De-escalate, get Marie off social and back to a private channel, name the goodwill range you can authorise, agree next step.',
          connects_from: 'You took over the call from Sarah without a clean handover, so you need to acknowledge that.',
          connects_to: 'Whatever you commit to Marie has to be backed by an authority decision in the next block.',
          key_items: [
            'Marie Whitford, customer for 6 years',
            'Damaged appliance, on hold 27 minutes Saturday',
            'Twitter post 21:40 Sunday, 3.2k retweets',
            'Standard goodwill cap: £75. Authority extends to £150 with reason.',
          ],
        },
        'decision-queue': {
          summary: 'Three decisions waiting after the call: goodwill amount, advisor coaching call, head of CX update',
          setup: 'Decisions: authorise goodwill (£75 / £150 / escalate), book Sarah for coaching now or end of shift, write the head-of-CX update line.',
          expected_output: 'A decision and one-line reason for each.',
          connects_from: 'What you committed to Marie on the call sets the goodwill floor.',
          connects_to: 'While you are deciding, the duty manager flags a regulator-level complaint that arrived Friday.',
          key_items: [
            'Goodwill: £75 / £150 / escalate to head of CX',
            'Sarah coaching: 30 min now vs end of shift',
            'Head of CX one-liner due by 11am',
          ],
        },
        'crisis-simulation': {
          summary: '10:35am: regulator-level complaint surfaces with a Friday timestamp. Response window is 48 hours.',
          setup: 'Email from a customer who CC\'d the regulator. Filed Friday 16:42. Response window expires Monday 16:42, in just under 6 hours. Subject is unrelated to Marie but the optics are obvious.',
          expected_output: 'Decide: do you handle it personally now or hand to the duty manager. Either way, you need a defensible line for the head of CX.',
          connects_from: 'You are mid-shift with a viral complaint live and a coaching call pending. The regulator clock has been running since Friday.',
          connects_to: null,
          key_items: [
            'Customer email, CC: Trading Standards',
            'Filed Friday 16:42, response window expires Monday 16:42',
            'Subject unrelated to Marie but optics will be drawn',
          ],
        },
      },
      scenario_arc: {
        stage_1_setup: '9:00am: viral Twitter complaint, advisor off sick, head of CX wanting an update.',
        stage_2_context: 'You take over a live call without a clean handover and need to read the customer fast.',
        stage_3_output: 'You commit to goodwill on the call, then make three follow-up decisions on coaching, authority, and escalation.',
        stage_4_pressure: 'A regulator-level complaint with a Friday timestamp surfaces with under 6 hours on the clock.',
        stage_5_resolution: 'You decide whether to take the regulator complaint personally or hand it off, and frame the head-of-CX update.',
      },
      generated_at: '2026-04-12T09:00:00Z',
    },
  },
  { id: 'demo-assess-5', role_title: 'Assistant Management Accountant', status: 'active', detected_role_type: 'finance', assessment_mode: 'standard', employment_type: 'permanent', scenario_version: 'scenario-v1.0', candidate_count: 0, created_at: '2026-04-10T10:00:00Z',
    interruption_keying: 'assessment',
    job_breakdown: { tasks: [
      'Reconcile the main bank account daily and post any corrections',
      'Process the weekly supplier payment run and post the BACS file',
      'Raise sales invoices and chase overdue debtors',
      'Support month-end close with accruals, prepayments, and journals',
      'Maintain the fixed asset register and post monthly depreciation',
    ], disruptions: [
      'Supplier statements arriving late and not matching the ledger',
      'Sales team submitting invoice requests after cut-off',
      'Bank feed failing in Xero forcing manual statement imports',
      'External auditor queries arriving mid-payment-run',
    ], decisions: [
      'Decide whether to release a supplier payment when the statement does not reconcile',
      'Decide whether to post a sales invoice on the last day of the month when goods have not shipped',
      'Decide when to escalate an unreconciled balance versus chase it directly',
    ], failure_points: [
      'Releasing a payment run with a duplicate or wrong supplier that loses cash',
      'Closing month-end with an unreconciled balance that the Finance Manager finds after sign-off',
      'Posting revenue in the wrong period and breaking the cut-off',
    ]},
    detected_dimensions: { dimensions: [
      { name: 'Accuracy',          weight: 25, reason: 'A misposted journal or a duplicated payment is immediately visible and costly. Accuracy is the floor of the role; nothing else matters if the numbers are wrong.' },
      { name: 'Compliance',        weight: 20, reason: 'VAT, PAYE, supplier terms, and audit retention rules create a regulatory floor. Drift here produces fines and qualified audits.' },
      { name: 'Documentation',     weight: 15, reason: 'Every reconciliation, journal, and write-off needs a paper trail an external auditor can follow. Missing documentation invalidates the close.' },
      { name: 'Attention to Detail', weight: 15, reason: 'Reconciliations, cut-off, and supplier statement matching all turn on small numbers and dates. Skim-reading is how money goes missing.' },
      { name: 'Communication',     weight: 15, reason: 'Talking to suppliers, debtors, and the Finance Manager about unreconciled items is a daily task. Vague communication leaves problems unresolved.' },
      { name: 'Risk Awareness',    weight: 10, reason: 'Recognising when a payment looks wrong, when a supplier statement smells like fraud, or when a journal would breach cut-off is the leading indicator before mistakes ship.' },
    ]},
    dimension_rubrics: { rubrics: [
      { dimension: 'Accuracy',          high_anchor: 'Catches discrepancies in the bank reconciliation, supplier statement match, and month-end journals before they leave the department. First-time-right is the default.', mid_anchor: 'Catches the obvious errors but lets occasional duplicates or wrong nominal codes through. Picks them up at month-end review.', low_anchor: 'Errors recur. Bank rec discrepancies sit unresolved. Supplier statements are reconciled with offsetting wrong entries.' },
      { dimension: 'Compliance',        high_anchor: 'Knows VAT cut-off, audit retention, and supplier credit terms cold. Refuses to post a journal that would breach the period or release a payment that breaches policy.', mid_anchor: 'Follows policy correctly when prompted but does not always spot edge cases proactively.', low_anchor: 'Posts what the Finance Manager asks without checking against policy. Misses VAT cut-off dates without flagging.' },
      { dimension: 'Documentation',     high_anchor: 'Every journal carries a backing schedule. Every supplier statement match has a dated note. Every write-off has a recorded reason and approver.', mid_anchor: 'Most journals are documented, but reconciliations sometimes lack the working paper. Trail is recoverable but not effortless.', low_anchor: 'Journals posted with no narrative. Reconciliations are mental rather than written. Auditor cannot reconstruct what was done.' },
      { dimension: 'Attention to Detail', high_anchor: 'Catches the rounding error, the wrong VAT rate, the duplicated supplier reference, and the last-day-of-month accrual before they ship.', mid_anchor: 'Catches the obvious issues but lets occasional small errors through. Picks them up the following month.', low_anchor: 'Skims the schedules. Misses cut-off boundaries. Same error appears in multiple periods.' },
      { dimension: 'Communication',     high_anchor: 'Writes a supplier query, a debtor chase, and a Finance Manager update that each contain the named figure, the date, the issue, and the requested action.', mid_anchor: 'Communicates clearly when the issue is straightforward but writes generic chasing language when the situation is awkward.', low_anchor: 'Forwards problems without analysis. Chasing emails are vague. Finance Manager has to re-derive the issue from scratch each time.' },
      { dimension: 'Risk Awareness',    high_anchor: 'Spots the supplier payment that looks wrong, the journal that would breach cut-off, and the reconciling item that smells like fraud before they reach approval.', mid_anchor: 'Recognises the standard risks but occasionally lets an unusual pattern through without questioning it.', low_anchor: 'Processes the work as instructed without questioning. Risk surfaces only when someone else flags it.' },
    ]},
    role_profile: {
      work_types: ['analysis', 'communication', 'coordination', 'decisions'],
      primary_work_types: ['analysis', 'coordination'],
      seniority_band: 'mid',
      function: 'finance',
      sector_context: 'mid-market manufacturing, UK group',
      company_size: 'mid_market',
      employment_type: 'permanent',
      interaction_internal_external: 'internal',
      ic_or_manager: 'ic',
      stakeholder_complexity: 'multiple',
    },
    shell_family: 'office',
    workspace_scenario: {
      scenario_id: 'demo-finance-month-end-variance',
      shell_family: 'office',
      title: 'Month-end variance the FD wants explained',
      spine: 'It is the Monday of close week. The FD flagged a £42k unreconciled variance on Friday afternoon and wants the answer by 11am.',
      trigger: '9:00am: Email from FD: "Need the variance explanation before our 11am call." 9:05am: A supplier statement arrives by post that does not match the ledger.',
      selected_blocks: [
        { block_id: 'inbox', order: 1, duration_seconds: 270, content_ref: 'inbox' },
        { block_id: 'task-prioritisation', order: 2, duration_seconds: 210, content_ref: 'task-prioritisation' },
        { block_id: 'reading-summarising', order: 3, duration_seconds: 270, content_ref: 'reading-summarising' },
        { block_id: 'trade-offs', order: 4, duration_seconds: 270, content_ref: 'trade-offs' },
      ],
      block_content: {
        'inbox': {
          summary: 'FD wants the variance explained by 11am, supplier statement does not reconcile, sales has invoice requests after cut-off',
          setup: 'Three messages: FD email asking for the £42k variance answer, supplier statement from Hartwell Components showing balance £18.4k vs ledger £14.2k, sales rep email with two invoice requests dated Friday 17:30 (after cut-off).',
          expected_output: 'Reply to the FD confirming you will have the answer by 11am, hold the late invoices for the sales rep, set the supplier statement aside as the lead.',
          connects_from: null,
          connects_to: 'You have committed to 11am. The supplier statement and the close week tasks now have to share that window.',
          key_items: [
            'Email: FD, subject: "Need variance explanation before 11am call"',
            'Post: Hartwell Components statement, balance £18.4k vs ledger £14.2k',
            'Email: sales rep, two invoice requests at 17:30 Friday after cut-off',
          ],
        },
        'task-prioritisation': {
          summary: 'Six close-week tasks plus the variance, ordered by what blocks the FD call',
          setup: 'Close-week list: bank rec, supplier reconciliation, depreciation journal, prepayment release, accruals, fixed asset sign-off. Plus the variance investigation. The FD call is at 11am.',
          expected_output: 'Order the work, defer anything that does not block the 11am call, name what slips to tomorrow.',
          connects_from: 'You committed to the FD that the variance explanation lands by 11am.',
          connects_to: 'The supplier statement reading is now the top non-deferrable task.',
          key_items: [
            'Variance investigation, blocks the 11am call',
            'Hartwell supplier reconciliation, leading suspect for the variance',
            'Bank rec, can run in parallel',
            'Depreciation journal, can slip to tomorrow',
          ],
        },
        'reading-summarising': {
          summary: 'Read the Hartwell statement against the ledger and identify the £4.2k difference',
          setup: 'Statement shows two invoices the ledger does not have (£3.8k January, £1.6k March) and one credit note the ledger has but the statement does not (£1.2k February).',
          expected_output: 'A 3-line summary the FD can take to the call: where the variance came from, why it happened, what the suggested fix is.',
          connects_from: 'You set the supplier statement aside as the leading suspect for the £42k variance.',
          connects_to: 'The Hartwell line accounts for £4.2k. You still need to explain the rest of the £42k. The trade-off is whether you raise it now or work it through after 11am.',
          key_items: [
            'Statement invoices missing from ledger: £3.8k Jan, £1.6k March',
            'Ledger credit note not on statement: £1.2k Feb',
            'Net difference: £4.2k of the £42k variance accounted for',
            '£37.8k still unexplained',
          ],
        },
        'trade-offs': {
          summary: 'Tell the FD now you only have part of the answer, or push the call to 12pm',
          setup: 'Option A: take the 11am call with £4.2k explained and £37.8k unknown. Option B: push the call to 12pm with the FD\'s direct line, work the rest through. Option C: split, send a written 3-line update at 10:50 and propose 12pm follow-up.',
          expected_output: 'Pick one and write the message you would send the FD now.',
          connects_from: 'The Hartwell variance only explains £4.2k. You committed to 11am with the full answer.',
          connects_to: null,
          key_items: [
            'Option A: 11am call with partial answer',
            'Option B: push to 12pm, work it through',
            'Option C: written update at 10:50, then 12pm call',
          ],
        },
      },
      scenario_arc: {
        stage_1_setup: '9:00am: FD wants the £42k variance explained by 11am, supplier post just arrived with a mismatch, late invoices waiting.',
        stage_2_context: 'You order close-week tasks behind the variance and pick the supplier statement as the leading suspect.',
        stage_3_output: 'You produce a 3-line summary: £4.2k of the variance is accounted for by the Hartwell statement.',
        stage_4_pressure: 'The supplier reading only covers £4.2k of the £42k. You committed to 11am with the full answer.',
        stage_5_resolution: 'You decide whether to take the 11am call partial, push to 12pm, or send a written update first, and write the message to the FD.',
      },
      generated_at: '2026-04-10T09:00:00Z',
    },
  },
]

export const DEMO_CANDIDATES = [
  {
    id: 'demo-c1',
    name: 'Sophie Chen',
    email: 's.chen@demorecruit.com',
    status: 'completed',
    invited_at: '2026-04-01T09:00:00Z',
    completed_at: '2026-04-02T14:22:00Z',
    rating: 5,
    assessments: { id: 'demo-assess-1', role_title: 'Marketing Manager', job_description: '', skill_weights: {}, assessment_mode: 'advanced', employment_type: 'permanent' },
    results: [{ overall_score: 92, risk_level: 'Very Low', percentile: 'Top 5%', pressure_fit_score: 88, pass_probability: 94 }],
  },
  {
    id: 'demo-c2',
    name: 'Marcus Williams',
    email: 'm.williams@demorecruit.com',
    status: 'completed',
    invited_at: '2026-04-02T11:15:00Z',
    completed_at: '2026-04-03T09:50:00Z',
    rating: 3,
    assessments: { id: 'demo-assess-1', role_title: 'Marketing Manager', job_description: '', skill_weights: {}, assessment_mode: 'standard', employment_type: 'permanent' },
    results: [{ overall_score: 74, risk_level: 'Low', percentile: 'Top 28%', pressure_fit_score: 71, pass_probability: 76 }],
  },
  {
    id: 'demo-c3',
    name: 'Priya Patel',
    email: 'p.patel@demorecruit.com',
    status: 'completed',
    invited_at: '2026-03-31T14:00:00Z',
    completed_at: '2026-04-01T16:40:00Z',
    rating: 3,
    assessments: { id: 'demo-assess-2', role_title: 'Sales Executive', job_description: '', skill_weights: {}, assessment_mode: 'standard', employment_type: 'permanent' },
    results: [{ overall_score: 61, risk_level: 'Medium', percentile: 'Top 47%', pressure_fit_score: 58, pass_probability: 63 }],
  },
  {
    id: 'demo-c4',
    name: "James O'Brien",
    email: 'j.obrien@demorecruit.com',
    status: 'completed',
    invited_at: '2026-04-03T10:30:00Z',
    completed_at: '2026-04-03T15:55:00Z',
    rating: 2,
    assessments: { id: 'demo-assess-2', role_title: 'Sales Executive', job_description: '', skill_weights: {}, assessment_mode: 'advanced', employment_type: 'temporary' },
    results: [{ overall_score: 35, risk_level: 'High', percentile: 'Bottom 22%', pressure_fit_score: 32, pass_probability: 30 }],
  },
  {
    id: 'demo-c5',
    name: 'Elena Rodriguez',
    email: 'e.rodriguez@demorecruit.com',
    status: 'completed',
    invited_at: '2026-04-04T08:45:00Z',
    completed_at: '2026-04-04T11:10:00Z',
    rating: 4,
    assessments: { id: 'demo-assess-3', role_title: 'Software Developer', job_description: '', skill_weights: {}, assessment_mode: 'advanced', employment_type: 'permanent' },
    results: [{ overall_score: 85, risk_level: 'Low', percentile: 'Top 12%', pressure_fit_score: 82, pass_probability: 88 }],
  },
  {
    id: 'demo-c6',
    name: 'Tom Fletcher',
    email: 't.fletcher@demorecruit.com',
    status: 'pending',
    invited_at: '2026-04-05T09:00:00Z',
    completed_at: null,
    rating: null,
    assessments: { id: 'demo-assess-1', role_title: 'Marketing Manager', job_description: '', skill_weights: {}, employment_type: 'temporary' },
    results: [],
  },
  {
    id: 'demo-c7',
    name: 'Aisha Johnson',
    email: 'a.johnson@demorecruit.com',
    status: 'pending',
    invited_at: '2026-04-05T13:30:00Z',
    completed_at: null,
    rating: null,
    assessments: { id: 'demo-assess-2', role_title: 'Sales Executive', job_description: '', skill_weights: {}, employment_type: 'temporary' },
    results: [],
  },
  {
    id: 'demo-c8',
    name: 'Ryan Murphy',
    email: 'r.murphy@demorecruit.com',
    status: 'scoring_failed',
    invited_at: '2026-04-04T15:20:00Z',
    completed_at: '2026-04-04T16:55:00Z',
    rating: null,
    assessments: { id: 'demo-assess-3', role_title: 'Software Developer', job_description: '', skill_weights: {}, employment_type: 'permanent' },
    results: [],
  },
  {
    id: 'demo-c9',
    name: 'David Thompson',
    email: 'd.thompson@demorecruit.com',
    status: 'archived',
    invited_at: '2026-03-20T10:00:00Z',
    completed_at: '2026-03-21T14:20:00Z',
    rating: 3,
    assessments: { id: 'demo-assess-1', role_title: 'Marketing Manager', job_description: '', skill_weights: {}, employment_type: 'permanent' },
    results: [{ overall_score: 58, risk_level: 'Medium', percentile: 'Top 52%', pressure_fit_score: 54, pass_probability: 60 }],
  },
  {
    id: 'demo-c10',
    name: 'Ryan Thompson',
    email: 'r.thompson@demorecruit.com',
    status: 'completed',
    invited_at: '2026-04-02T08:30:00Z',
    completed_at: '2026-04-03T11:45:00Z',
    rating: 4,
    assessments: { id: 'demo-assess-4', role_title: 'Customer Service Team Leader', job_description: '', skill_weights: {}, assessment_mode: 'standard', employment_type: 'permanent' },
    results: [{ overall_score: 71, risk_level: 'Medium', percentile: 'Top 35%', pressure_fit_score: 68, pass_probability: 73 }],
  },
  {
    id: 'demo-c11',
    name: 'Alex Turner',
    email: 'a.turner@demorecruit.com',
    status: 'completed',
    invited_at: '2026-04-08T08:00:00Z',
    completed_at: '2026-04-08T08:07:00Z',
    rating: 4,
    assessments: { id: 'demo-assess-4', role_title: 'Customer Service Advisor', job_description: '', skill_weights: {}, assessment_mode: 'rapid', employment_type: 'permanent' },
    results: [{ overall_score: 71, risk_level: 'Low', percentile: 'Top 32%', pressure_fit_score: 68, pass_probability: 74 }],
  },
]

export function getDemoCandidatesFull() {
  return DEMO_CANDIDATES.filter(c => c.status === 'completed').map(c => {
    const full = DEMO_RESULTS[c.id]
    if (!full) return c
    // Stamp audit-trail provenance on every demo result so the audit panel
    // populates if a demo candidate is ever exercised through the PDF code
    // path. The values mirror lib/constants PD_RUBRIC_VERSION and
    // PD_MODEL_DEFAULT.
    const auditDefaults = {
      scoring_rubric_version: 'rubric-v1.0',
      model_version: 'claude-sonnet-4-5',
      created_at: c.completed_at || '2026-04-02T14:22:00Z',
    }
    return { ...c, results: [{ ...c.results[0], ...auditDefaults, ...full }] }
  })
}

export function getDemoBenchmarkData() {
  const map = {}
  for (const [candId, r] of Object.entries(DEMO_RESULTS)) {
    const cand = DEMO_CANDIDATES.find(c => c.id === candId)
    if (!cand || !r.scores) continue
    for (const [skill, score] of Object.entries(r.scores)) {
      if (!map[skill]) map[skill] = []
      map[skill].push({ name: cand.name, id: cand.id, assessmentId: cand.assessments.id, score })
    }
  }
  return map
}

// Benchmark page slices candidates by these dimension names. The list is
// drawn from the dynamic master list (lib/dimensions.js) and only includes
// dimensions that appear across multiple demo assessments so the benchmark
// page has more than one candidate per skill.
export const DEMO_BENCHMARK_SKILLS = [
  'Communication',
  'Stakeholder Management',
  'Decision Making Under Pressure',
  'Adaptability',
]

// ── Full results for each completed candidate ──────────────────────────────

export const DEMO_RESULTS = {

  /* ── Sophie Chen, 92, Very Low ── */
  'demo-c1': {
    overall_score: 92,
    risk_level: 'Very Low',
    percentile: 'Top 5%',
    pressure_fit_score: 88,
    pass_probability: 94,
    candidate_type: 'Strategic Executor with High Composure|Consistently structured and decisive under pressure. Handles complex stakeholder situations with calm authority.',
    confidence_level: 'High',
    trajectory: 'Improving',
    seniority_fit_score: 88,
    risk_reason: 'Exceptional response quality across all four scenarios. No integrity flags, high consistency, and evidence of deep strategic thinking throughout. Scores in the 88-94 range across every assessed dimension place this candidate comfortably in the top 5% of Marketing Manager candidates assessed.',
    ai_summary: `Sophie Chen is one of the strongest Marketing Manager candidates we have assessed. Her responses demonstrate a sophisticated understanding of brand strategy, stakeholder alignment, and data-led decision-making that is typically associated with candidates operating at Head of Marketing level. She writes with precision and authority, and every response includes specific, defensible reasoning rather than generic frameworks.

In the stakeholder conflict scenario (Scenario 2), Sophie identified competing priorities between the sales and product teams without prompting, proposed a structured escalation process, and suggested a shared KPI framework , all within a coherent narrative. She quoted her own thinking directly: "I'd want to understand what each team is actually optimising for before I try to resolve anything." This level of systems thinking is rare at this career stage and signals someone who builds durable solutions rather than temporary fixes.

Her data analysis response (Scenario 4) was particularly impressive. Rather than defaulting to vanity metrics, she anchored her measurement framework around pipeline contribution and cost-per-acquisition, referencing cohort analysis and attribution modelling as standard tools in her workflow. She wrote: "I'd set a 90-day target of 15% improvement in MQL-to-SQL conversion, report on it weekly, and if we're not tracking by week six, I'd adjust the lead qualification criteria." This indicates genuine analytical maturity that most Marketing Managers develop only after several years in the role.

The one watch-out , a tendency toward over-planning before committing to action , is very minor and easily managed with a structured 30-60-90 day onboarding plan that includes early quick wins. She acknowledged this pattern herself in her response, which is a strong signal of self-awareness. This trait is more risk in fast-moving consumer environments than in B2B or mid-market contexts.

Strong hire. Sophie is likely to exceed expectations within the first six months and is a credible candidate for Head of Marketing progression within 18 to 24 months. The evidence across all four scenarios consistently points to a candidate who combines commercial acuity with the interpersonal intelligence to deliver in complex, cross-functional environments.`,
    integrity: {
      response_quality: 'Genuine',
      quality_notes: 'All four responses were substantive, specific, and written in a consistent personal voice throughout. Language complexity and stylistic patterns are uniform, and each response includes specific examples that would be difficult to fabricate without direct experience.',
      consistency_rating: 'High',
      consistency_notes: 'Values and priorities expressed across scenarios align closely. Decision-making style is consistent whether under social pressure or time pressure.',
      time_analysis: 'Scenario 1 (5m 12s): Normal. Scenario 2 (4m 47s): Normal. Scenario 3 (5m 45s): Normal. Scenario 4 (4m 58s): Normal. All response times indicate genuine, considered engagement.',
      red_flags: [],
    },
    pressure_fit: {
      decision_speed_quality: {
        score: 91,
        verdict: 'Strength',
        narrative: 'Sophie demonstrated decisiveness that goes beyond simply making a choice. In the competing-priorities scenario, she ranked options explicitly, committed to her first decision before seeking additional input, and articulated a clear rationale for the sequence she chose. She used language like "I would commit to X first because the commercial risk is asymmetric" rather than hedging with "I might consider" or "it would depend." This is a meaningful signal in a senior marketing role where indecision creates downstream misalignment across multiple teams. She did not revisit or qualify her decision once made, which indicates genuine confidence rather than performed confidence. In their first 90 days, this suggests they will likely establish clear marketing priorities publicly and early, communicate decisions proactively to avoid ambiguity, and move initiatives forward without waiting for consensus that may never come.',
      },
      composure_under_conflict: {
        score: 86,
        verdict: 'Strength',
        narrative: 'When presented with a frustrated internal stakeholder, Sophie\'s first move was to acknowledge the emotional register of the situation before addressing the substantive disagreement. She wrote: "I would start by genuinely listening to understand what\'s driving the frustration , not to placate them, but because the frustration is usually telling me something useful about what\'s broken in the process." This response signals emotional maturity and the ability to separate the person from the problem. She then reframed the conversation around shared commercial goals rather than defending her position, which is notably more sophisticated than most Marketing Manager candidates who either avoid conflict or match the other person\'s emotional temperature. She proposed a specific resolution pathway rather than deferring to management. In their first 90 days, this suggests they will likely de-escalate early tensions with sales or product teams effectively, building the cross-functional trust that is critical in the first quarter of any senior marketing hire.',
      },
      prioritisation_under_load: {
        score: 88,
        verdict: 'Strength',
        narrative: 'Sophie\'s triage framework was explicit and reproducible. She separated urgent-and-important from urgent-but-deferrable using named criteria, and proactively identified which stakeholder she would communicate a delay to and why that specific person needed to be informed first. The key insight in her response was her recognition that "prioritisation is partly a communication problem , if the right people know about the trade-offs, they can help you make the right call." This systems-level awareness of how information flows through an organisation is unusual at this career stage. She did not simply list priorities; she explained dependencies, estimated effort-to-impact ratios, and considered the downstream consequences of each choice. In their first 90 days, this suggests they will likely build clear, transparent communication norms around priority decisions quickly, preventing the ambiguity that wastes team time in the first quarter.',
      },
      ownership_accountability: {
        score: 87,
        verdict: 'Strength',
        narrative: 'Sophie\'s language patterns throughout were markedly first-person and active. When describing a past campaign that underperformed, she used "I decided," "I misjudged the channel mix," and "I changed the approach after week three" , never deflecting to the team, the brief, or external market factors. She also framed accountability prospectively, articulating what she would monitor, what the trigger for intervention would be, and how she would communicate a course correction to senior stakeholders. This level of forward-looking ownership is a reliable predictor of how a candidate will handle the inevitable setbacks of any new role. She treated past failures as data rather than as events to explain away. In their first 90 days, this suggests they will likely own their early mistakes transparently, course-correct quickly rather than waiting for a formal review, and set a strong accountability norm for the teams they manage.',
      },
    },
    scores: {
      'Commercial Thinking': 90,
      'Stakeholder Management': 93,
      'Communication': 91,
      'Adaptability': 88,
      'Decision Making Under Pressure': 90,
    },
    score_narratives: {
      'Commercial Thinking': 'References attribution modelling, cohort analysis, and cost-per-acquisition as standard tools. Measurement frameworks are outcome-focused rather than activity-focused. In Scenario 4, she proposed a 90-day target tied to pipeline contribution and cost-per-acquisition rather than vanity metrics, with weekly cadence and a named intervention trigger.',
      'Stakeholder Management': 'Showed exceptional skill in navigating cross-functional tension in Scenario 2. Her approach was structured, showed genuine political awareness, and proposed a resolution that gave both parties a visible win. This is the dimension most correlated with long-term success in senior marketing roles.',
      'Communication': 'Articulates complex marketing concepts clearly and adjusts her style to the audience. Drafted a three-option note to the CEO ranked by revenue and reputational risk with a clear primary recommendation, rather than an open question. Tone balanced urgency with reassurance under pressure.',
      'Adaptability': 'Re-planned the launch in real time when the supply issue surfaced. Held the date, converted the first ten days into a founder-story teaser, and built a contingency path that protected the brand without losing momentum. No rigidity around the original plan.',
      'Decision Making Under Pressure': 'Reached a clear, defensible call within hours of the supply issue surfacing. Spelled out the trade-offs explicitly (delay vs. partial reveal vs. hold) and committed to one path with named owners and a review point. No paralysis, no hedging.',
    },
    generic_detection: {
      score: 12,
      flags: [],
      evidence_per_flag: {},
    },
    scoring_confidence: {
      level: 'high',
      reason: 'Strong response depth across all four scenarios. No integrity flags. Generic-language score of 12.',
      confidence_reason: 'Detailed role context provided, strong response depth, no integrity flags. Low risk of rebate period dispute or client dissatisfaction; safe to submit to client with the assessment as supporting evidence.',
      confidence_reason_variants: {
        agency_permanent:  'Detailed role context provided, strong response depth, no integrity flags. Low risk of rebate period dispute or client dissatisfaction; safe to submit to client with the assessment as supporting evidence.',
        agency_temporary:  'Detailed role context provided, strong response depth, no integrity flags. Low risk of no-show or assignment friction; SSP exposure looks manageable across the first week.',
        employer_permanent:'Detailed role context provided, strong response depth, no integrity flags. Low risk of probation failure under ERA 2025 protections; the assessment forms a defensible record for the line manager.',
        employer_temporary:'Detailed role context provided, strong response depth, no integrity flags. Low supervision overhead expected; immediate productivity should be in line with the brief.',
      },
    },
    strengths: [
      {
        strength: 'Systems-level strategic thinking',
        explanation: 'Sophie consistently zooms out to identify upstream causes rather than treating symptoms. Her solution to the brand inconsistency scenario addressed both the process failure and the cultural misalignment that caused it, rather than just fixing the immediate problem.',
        evidence: 'The real problem isn\'t the rogue post , it\'s that we don\'t have a clear enough brand voice guide that junior team members can apply without asking for sign-off on every piece.',
      },
      {
        strength: 'Data-driven accountability with specific targets',
        explanation: 'She frames marketing activities in terms of business outcomes and holds herself to measurable, time-bound standards. The specificity of her targets ("15% improvement in MQL-to-SQL conversion by week six") is rare at this level.',
        evidence: 'I\'d set a 90-day target of 15% improvement in MQL-to-SQL conversion, report on it weekly, and if we\'re not tracking toward it by week six, I\'d adjust the lead qualification criteria.',
      },
      {
        strength: 'Constructive stakeholder challenge with evidence',
        explanation: 'Rather than deferring to senior stakeholders, Sophie demonstrates the confidence to respectfully push back with data and a clear rationale. She does this without making it personal.',
        evidence: 'I\'d take the conversation back to the brief. If the direction has changed, the timeline needs to change too , I\'d rather have that conversation early than deliver something off-brief on time.',
      },
    ],
    watchouts: [
      {
        watchout: 'Tendency to over-plan before committing to action',
        severity: 'Low',
        explanation: 'In Scenario 3, Sophie\'s response included an unusually detailed planning phase before any action was taken. In fast-moving environments with shifting priorities, this could slow execution. She acknowledged this tendency herself, which is a positive signal.',
        evidence: 'I\'d want to spend the first two weeks mapping all stakeholders, reviewing the last twelve months of data, and building out a project plan before touching anything.',
        action: 'Set clear action milestones in the 30-60-90 onboarding plan to encourage early wins alongside strategic planning. Frame speed of execution as a valued behaviour in early feedback conversations.',
        verification_question_variants: {
          agency_permanent: vq(
            'Before we send you to the client, tell me about a time the planning window collapsed and you had to commit to a marketing decision in days rather than weeks. Walk me through what you decided and how you protected your reputation if it had gone wrong.',
            ['Names a specific campaign or launch and the date pressure', 'Decision was made and shipped, not just outlined', 'Acknowledges the trade-off they accepted', 'Explains how they would defend it to a client team'],
            ['Talks about what they would do rather than what they did', 'Decision was deferred to a manager or postponed', 'No named stakeholders or numbers in the answer', 'Plan exists only in slides, never in a live campaign'],
            'How long was it from brief to live, and what would you have changed if you had had another week?',
          ),
          agency_temporary: vq(
            'On a short marketing assignment a brief lands on Monday and the client wants something live by Friday. Tell me about a time you have actually done that and what you cut to make the date.',
            ['Specific assignment with a tight client deadline', 'Names the channels they kept and the ones they dropped', 'Describes the moment they committed', 'Comes back to the client outcome, not the plan'],
            ['Talks about ideal process rather than the assignment', 'Cannot describe what was cut', 'Default answer is "I would brief the team"', 'No client-facing outcome named'],
            'When you came off that assignment, what feedback did the client give about the speed of delivery?',
          ),
          employer_permanent: vq(
            'We need someone who can make a marketing call on day five with incomplete data. Tell me about a time you had to make that exact kind of call. We will document this answer because the line manager will not always be available in the early weeks.',
            ['Decision was committed to with named owners', 'Trade-offs are explicit (what was cut, what was kept)', 'Specific timeline named in days, not weeks', 'Reflects on what they would change with more time'],
            ['Default to "I would build a 30 day plan first"', 'No named decision actually shipped', 'Risk owned by someone else in the story', 'Generic frameworks rather than specific call'],
            'If the data had told you the opposite three weeks later, how would you have communicated the course correction?',
          ),
          employer_temporary: vq(
            'For this assignment we need a campaign tweak shipped inside the first week with no oversight. Tell me about a time you have actually done that without a long planning phase.',
            ['Names a tweak that went live in days', 'No "I would have done X" hedging', 'Owns both the call and the result', 'Confident on what success looked like'],
            ['Wants two weeks of audit before doing anything', 'Talks about strategy, not execution', 'Cannot describe a specific tweak that shipped', 'Defers ownership to a planner or agency'],
            'What was the smallest thing you shipped in week one that delivered measurable lift?',
          ),
        },
        verification_question: {
          framed_for: 'employer_permanent',
          question: 'We need someone who can make a marketing call on day five with incomplete data. Tell me about a time you had to make that exact kind of call. We will document this answer because the line manager will not always be available in the early weeks.',
          strong_answer_signs: ['Decision was committed to with named owners', 'Trade-offs are explicit (what was cut, what was kept)', 'Specific timeline named in days, not weeks', 'Reflects on what they would change with more time'],
          weak_answer_signs: ['Default to "I would build a 30 day plan first"', 'No named decision actually shipped', 'Risk owned by someone else in the story', 'Generic frameworks rather than specific call'],
          follow_up_probe: 'If the data had told you the opposite three weeks later, how would you have communicated the course correction?',
        },
      },
    ],
    onboarding_plan: [
      {
        week: 1,
        title: 'Stakeholder Listening Tour',
        objective: 'Build a clear picture of the current marketing landscape and establish Sophie\'s credibility with key internal partners before she makes any changes.',
        activities: [
          'Schedule 1:1s with Sales, Product, Customer Success, and Finance leads , Sophie\'s stakeholder intelligence means she will conduct these with exceptional effectiveness. Brief her to listen first and map tensions.',
          'Provide access to the last 12 months of marketing data, campaign reports, and brand assets. Ask for a written summary of observations at end of week , not recommendations yet.',
          'Introduction to the marketing team. Sophie should understand everyone\'s current priorities and pain points before setting her own agenda.',
        ],
        checkpoint: 'Can articulate the three biggest current marketing challenges and the key stakeholder relationships that will define her success in the role, without prompting.',
        involves: ['Line manager', 'Sales lead', 'Product lead', 'Customer Success lead', 'HR , ERA 2025 day-one induction'],
        notes: 'CIPD guidance on new manager onboarding recommends a structured listening phase of at least 5 working days before any strategic decisions are made. This is particularly important for senior hires who may be tempted to act quickly to demonstrate value.',
      },
      {
        week: 2,
        title: 'Audit and Data Baseline',
        objective: 'Establish a rigorous baseline of current marketing performance so that Sophie\'s first strategic decisions are evidence-based rather than intuition-based.',
        activities: [
          'Audit all active campaigns: channel performance, spend, conversion rates, and attribution. Sophie should produce a written summary with her initial hypotheses about what is and isn\'t working.',
          'Review brand consistency across all customer touchpoints , website, email, social, collateral. Identify the gaps that require immediate attention vs. longer-term rebuilding.',
          'Meet with the analytics team or agency to understand current measurement infrastructure and any known gaps in data quality.',
        ],
        checkpoint: 'Has produced a written audit summary covering at least three channels with specific performance data and at least two hypotheses for improvement.',
        involves: ['Line manager', 'Marketing analyst or agency', 'Brand team'],
        notes: 'Providing analytics access on day one is a day-one right under ERA 2025. Ensure all data access is granted before week two begins.',
      },
      {
        week: 3,
        title: 'First Quick Win Delivery',
        objective: 'Counterbalance Sophie\'s planning tendency by requiring a delivered output this week , something small, visible, and impactful that establishes early credibility.',
        activities: [
          'Identify one tactical improvement from the week two audit that Sophie can own and deliver in full this week , a campaign tweak, a brand fix, or a process change. It must be shipped, not proposed.',
          'Run one cross-functional meeting with Sales and Marketing to align on a shared definition of a qualified lead. Sophie should chair this meeting and produce a one-page summary of the agreed definition.',
          'Begin drafting the 90-day strategic roadmap , this should be in outline only this week, with full completion in week five.',
        ],
        checkpoint: 'Has delivered at least one tangible marketing improvement that is live and visible to the team. Has produced a one-page lead definition document agreed by Sales.',
        involves: ['Line manager', 'Sales lead', 'Marketing team'],
        notes: 'The CIPD 30-60-90 day framework recommends a visible early win in the first 30 days to establish credibility with the team and with leadership.',
      },
      {
        week: 4,
        title: 'Cross-Functional Alignment',
        objective: 'Establish Sophie\'s position as the strategic marketing lead across the business, not just within the marketing team.',
        activities: [
          'Present the current-state marketing assessment to the leadership team , what is working, what is not, and the single biggest opportunity Sophie has identified. Keep it to 20 minutes maximum.',
          'Agree on Q2 marketing priorities with Sales and Product. Sophie should drive this alignment, not receive it. Use the shared lead definition from week three as the foundation.',
          'Set individual KPIs for the marketing team in collaboration with the line manager. These should be connected to revenue outcomes, not activity metrics.',
        ],
        checkpoint: 'Has presented a current-state assessment to the leadership team and received sign-off on Q2 marketing priorities. Marketing team KPIs are documented.',
        involves: ['Line manager', 'Leadership team', 'Sales lead', 'Product lead', 'HR'],
        notes: 'CIPD guidance recommends that new senior hires present their initial findings and proposed direction within 30 days to avoid the drift that occurs when leadership does not understand what the new hire is working on.',
      },
      {
        week: 5,
        title: 'Strategic Roadmap Presentation and 30-Day Review',
        objective: 'Complete Sophie\'s formal 30-day probationary review and present her full 90-day strategic marketing roadmap to the leadership team.',
        activities: [
          'Prepare and present the full 90-day marketing roadmap , strategy, priorities, resource requirements, and success metrics. This is where Sophie\'s systems thinking will shine.',
          'Formal 30-day probationary review with line manager: review early performance against the onboarding KPIs, gather structured feedback from key stakeholders, and document agreed development areas.',
          'Finalise the team structure and any immediate hiring or agency decisions that need to be made in the next 30 days.',
        ],
        checkpoint: 'Roadmap has been presented and approved in principle by the leadership team. 30-day review is documented with agreed actions and clear progress against onboarding KPIs.',
        involves: ['Line manager', 'HR , ERA 2025 probationary review', 'Leadership team'],
        notes: 'ERA 2025 requires a documented probationary review at 30 days for all new hires on contracts of 6 months or more. Ensure this is completed and signed off before the end of week five.',
      },
      {
        week: 6,
        title: 'Independent Campaign Ownership and 60-Day Planning',
        objective: 'Sophie takes full independent ownership of her first major campaign and sets the agenda for the next 30 days without requiring line manager oversight.',
        activities: [
          'Launch the first campaign that Sophie has planned and owned end-to-end, with a clear measurement framework and a defined review date.',
          'Conduct a structured retrospective on the first five weeks: what went well, what she would do differently, and what she needs from the business in weeks 7-12.',
          'Set the 60-day plan with the line manager , specific campaign targets, team development priorities, and any structural changes she wants to implement.',
        ],
        checkpoint: 'Has launched at least one independently planned campaign with a documented measurement framework. Has produced a 60-day plan agreed with the line manager.',
        involves: ['Line manager', 'Marketing team', 'Analytics team'],
        notes: 'CIPD probation guidance recommends a formal 60-day check-in to assess whether the new hire is on track for a successful probation outcome. Document this meeting.',
      },
    ],
    interview_questions: [
      'The CEO asks you to reforecast the Q2 marketing budget on day three before you\'ve finished your audit. How do you approach that conversation and what do you tell them about the reliability of your numbers? (Follow-up probe: Where do you cut first when the budget gets compressed mid-quarter?)',
      'How do you measure whether a marketing campaign is contributing to revenue? Walk me through what you\'d put in a monthly performance report for the CFO. (Follow-up probe: What do you say when your metrics look good but Sales is reporting flat pipeline?)',
      'Sales wants more leads, Product wants brand spend redirected to the launch. You have a fixed budget and both want more of it. How do you make that call and communicate it? (Follow-up probe: How do you hold that position when one side escalates to the CEO?)',
      'You inherit a team with three live campaigns already running. What do you change first and how do you make that decision without disrupting work already in flight? (Follow-up probe: How quickly do you move on something you think is wrong before you fully understand why it was done that way?)',
    ],
    cv_comparison: [
      '5+ years of marketing experience across multiple sectors',
      'Strong track record of cross-functional campaign delivery',
      'Excellent communicator with proven stakeholder management skills',
      'Data-driven approach to strategy and performance measurement',
    ],
    predictions: {
      pass_probation: 92,
      top_performer: 76,
      churn_risk: 7,
      underperformance_risk: 5,
      _panels: makePanelPredictionVariants('Marketing Manager', { tone: 'strong' }),
      _verification: {
        pass_probation: {
          linked_to: 'Pass probation',
          variants: {
            agency_permanent: vq(
              'Our prediction puts her at 92% pass probation. Walk us through a time you cleared probation in a marketing role, what the line manager was looking for, and what you did in weeks one to four to make it visible.',
              ['Names specific objectives signed off in the first 30 days', 'Describes early wins seen by the line manager', 'Acknowledges what could have derailed it', 'References the documentation kept for review'],
              ['Generic answer about being a hard worker', 'Cannot remember probation objectives', 'Probation passed by default, not by design', 'Blames a previous manager for any difficulty'],
              'If you had been pulled into a 30-day review tomorrow with the line manager challenging your performance, what evidence would you bring?',
            ),
            agency_temporary: vq(
              'The placement equivalent here is the first week of assignment. Tell me about a time on a temp marketing assignment when the client decided in week one whether to keep you on. What did you do that made the call easy?',
              ['Names the specific output the client saw in week one', 'Confirms client extended the assignment', 'Owns what they did, not what the team did', 'Specific feedback received from the on-site contact'],
              ['No clear week-one deliverable', 'Worker hoped the client would notice something', 'Vague memory of how the assignment ended', 'Cannot name what the on-site manager fed back'],
              'What was the moment in that first week where you knew the client had decided?',
            ),
            employer_permanent: vq(
              'We are documenting this in the hiring file under ERA 2025. Tell me about a permanent marketing role where you completed probation, what was on the success scorecard, and what you would do differently here in the first 90 days.',
              ['Recalls specific KPIs and review dates', 'Describes the cadence of feedback with the line manager', 'Pre-empts probable failure modes for this role', 'Owns one weakness honestly'],
              ['Treats probation as a formality', 'No examples of structured feedback received', 'Cannot name a probation-related KPI', 'Deflects every weakness onto external factors'],
              'If we had to write a 30-day review tomorrow, which of your behaviours would land on the development side of the page and why?',
            ),
            employer_temporary: vq(
              'There is no probation here, just a sign-off at the end of week one. Tell me about a recent assignment where the client manager confirmed you in week one and what you delivered to make that decision obvious.',
              ['First-week deliverable was tangible and visible', 'Names what the on-site manager said when they signed off', 'Worked without daily supervision', 'Aligned to a single clear brief, not a vague mandate'],
              ['Would expect a heavy onboarding before producing', 'Cannot name a deliverable from week one', 'Required day-to-day direction', 'Talks about plans rather than output'],
              'What would the on-site manager have said about the visible work after five working days?',
            ),
          },
          verification_question: {
            framed_for: 'employer_permanent',
            question: 'We are documenting this in the hiring file under ERA 2025. Tell me about a permanent marketing role where you completed probation, what was on the success scorecard, and what you would do differently here in the first 90 days.',
            strong_answer_signs: ['Recalls specific KPIs and review dates', 'Describes the cadence of feedback with the line manager', 'Pre-empts probable failure modes for this role', 'Owns one weakness honestly'],
            weak_answer_signs: ['Treats probation as a formality', 'No examples of structured feedback received', 'Cannot name a probation-related KPI', 'Deflects every weakness onto external factors'],
            follow_up_probe: 'If we had to write a 30-day review tomorrow, which of your behaviours would land on the development side of the page and why?',
          },
        },
        top_performer: {
          linked_to: 'Become top performer',
          variants: {
            agency_permanent: vq(
              'We have her at 76% top performer. Tell us about a marketing role where you outperformed the brief and what evidence the client used to know.',
              ['Quantified the outperformance with a number', 'Names the comparator (peers, baseline, target)', 'Owns the contributing decisions, not the team', 'Came back to commercial impact'],
              ['Generic claim of being top of the class', 'No comparator and no number', 'Credit goes to the team or the agency', 'Activity metrics rather than outcomes'],
              'What stopped you from going further than that, and what would have unlocked it?',
            ),
            agency_temporary: vq(
              'Top performer on a short marketing assignment usually means the client asks the agency to extend or rebook. Tell me about an assignment where that happened and what you did to earn it.',
              ['Client asked for an extension or rebook', 'Names the work that made the difference', 'Describes a moment of unprompted ownership', 'Confirms the agency saw the same signal'],
              ['Assignment ended on schedule with no mention', 'Cannot remember the client outcome', 'Took direction only, never proposed', 'No evidence the agency was told'],
              'When the agency next called you for a similar assignment, what did the client say about you?',
            ),
            employer_permanent: vq(
              'We need to see signs you will outperform, not just survive probation. Tell me about a marketing role where you did more than the role description and how it became visible to leadership.',
              ['Names a specific contribution beyond the brief', 'Leadership was made aware in writing or in a forum', 'Connected the work to revenue or pipeline', 'Owned the choice to go further'],
              ['Effort framed as input rather than output', 'Leadership unaware of the contribution', 'No commercial linkage', 'Performance noticed only by peers, not management'],
              'When you walked out of your last role, what specific evidence of overperformance did you take with you?',
            ),
            employer_temporary: vq(
              'Top performer on this assignment looks like the client asking for you on the next brief. Tell me about an assignment where that happened and what specifically made them call you back.',
              ['Client requested the candidate by name on a follow-on', 'Specific output beyond the brief named', 'Worked without supervision uplift', 'Came back to client outcome, not effort'],
              ['No follow-on request was ever made', 'Talks about effort rather than the call-back signal', 'Required ongoing supervision', 'Cannot recall any feedback after the assignment'],
              'When was the last time a client booked you for a second assignment without being asked?',
            ),
          },
          verification_question: {
            framed_for: 'employer_permanent',
            question: 'We need to see signs you will outperform, not just survive probation. Tell me about a marketing role where you did more than the role description and how it became visible to leadership.',
            strong_answer_signs: ['Names a specific contribution beyond the brief', 'Leadership was made aware in writing or in a forum', 'Connected the work to revenue or pipeline', 'Owned the choice to go further'],
            weak_answer_signs: ['Effort framed as input rather than output', 'Leadership unaware of the contribution', 'No commercial linkage', 'Performance noticed only by peers, not management'],
            follow_up_probe: 'When you walked out of your last role, what specific evidence of overperformance did you take with you?',
          },
        },
        churn_risk: {
          linked_to: 'Leave within 6 months',
          variants: {
            agency_permanent: vq(
              'Her churn risk is 7%, which is low, but we still need to test it. Walk us through what would actually pull you out of a permanent role inside the first six months. Be honest, the agency is the one carrying the rebate exposure.',
              ['Specific, situational triggers named', 'Acknowledges the pull factors honestly', 'Has thought about how they would raise concerns first', 'Owns the choice rather than blaming employers'],
              ['Says "nothing would make me leave"', 'Triggers are vague or all about pay', 'No process for raising concerns first', 'History of short tenures unexplained'],
              'If those triggers showed up in week eight, what would you do before deciding to leave?',
            ),
            agency_temporary: vq(
              'Most assignment churn we see is week-one no-shows and assignment friction. Tell us about a time you had a reason to walk off a temp assignment and what you did instead.',
              ['Named a real friction event from a past assignment', 'Stayed and resolved it through the consultant', 'Confirms attendance through to the end', 'Was honest about how close it got'],
              ['Has walked off without notice before', 'Has not seen a difficult assignment through', 'Blames every issue on previous agencies', 'Cannot describe how they raise issues'],
              'When you have hit a tough day on assignment, who is the first person you contact?',
            ),
            employer_permanent: vq(
              'We need to test her low churn signal directly. Tell me about a permanent role you nearly left in the first six months, why you stayed, and what we should know about your pull factors here.',
              ['Acknowledges a real near-miss from past tenure', 'Stayed for a substantive reason, not inertia', 'Names what would actually trigger a move', 'Has surfaced concerns through the line manager before'],
              ['Says they have never been close to leaving', 'Pull factors are entirely about money', 'No history of raising issues through line management', 'Cannot describe what would cause a move'],
              'If the role we are offering you turned out to be different from what we discussed, what would you do in the first month?',
            ),
            employer_temporary: vq(
              'Mid-assignment drop-off is the main thing we need to avoid. Tell me about an assignment you saw through to the end despite something going wrong, and what kept you in the seat.',
              ['Named a specific issue mid-assignment and stayed', 'Worked it out with the on-site manager', 'Saw assignment to its agreed end date', 'No-shows are not in the work history'],
              ['Has dropped an assignment early before', 'Cannot describe an end-of-assignment moment', 'No structure for raising issues with the on-site contact', 'Open work-history gaps unexplained'],
              'What would have to happen on this assignment for you to call it quits before the end date?',
            ),
          },
          verification_question: {
            framed_for: 'employer_permanent',
            question: 'We need to test her low churn signal directly. Tell me about a permanent role you nearly left in the first six months, why you stayed, and what we should know about your pull factors here.',
            strong_answer_signs: ['Acknowledges a real near-miss from past tenure', 'Stayed for a substantive reason, not inertia', 'Names what would actually trigger a move', 'Has surfaced concerns through the line manager before'],
            weak_answer_signs: ['Says they have never been close to leaving', 'Pull factors are entirely about money', 'No history of raising issues through line management', 'Cannot describe what would cause a move'],
            follow_up_probe: 'If the role we are offering you turned out to be different from what we discussed, what would you do in the first month?',
          },
        },
        underperformance_risk: {
          linked_to: 'Underperformance risk',
          variants: {
            agency_permanent: vq(
              'Her underperformance risk is 5%. Walk us through a time the early signs of underperformance appeared in your own work and how you spotted them before someone else did.',
              ['Self-spotted the signal early', 'Names specific data they were watching', 'Course-corrected with a named action', 'Reported the situation to manager proactively'],
              ['Underperformance was first flagged by someone else', 'No leading indicators named', 'Reaction was defensive', 'Story ends with the manager fixing it'],
              'What is the leading indicator you would watch in the first 30 days here that would tell you the role was not landing?',
            ),
            agency_temporary: vq(
              'On assignment, underperformance shows up as the supervisor logging quality issues in week one. Tell me about an assignment where that nearly happened and how you turned it around.',
              ['Named the on-site quality signal', 'Adjusted output inside the same shift or day', 'Confirmed the supervisor fed back positively after', 'Owns the dip honestly'],
              ['Did not notice the dip until told', 'Required reassignment to a different role', 'Cannot name the supervisor feedback', 'No example of mid-assignment course correction'],
              'How quickly do you usually spot an output drop, and who do you tell first?',
            ),
            employer_permanent: vq(
              'We document this for ERA 2025 because it is a defensible signal at probation. Tell me about a role where you were on the edge of underperforming, what you did, and what your line manager would say about how you handled it.',
              ['Specific situation, not hypothetical', 'Owns the contribution to the dip', 'Named the action they took', 'Manager would corroborate the recovery'],
              ['Cannot recall a near-miss', 'Blames the role rather than the work', 'Action was passive (waiting for a review)', 'Line manager unlikely to confirm the story'],
              'If your line manager called you out on a quality dip in week six, what is the first thing you would do?',
            ),
            employer_temporary: vq(
              'Underperformance on this assignment translates to extra supervision. Tell me about an assignment where the on-site manager had to step in and what you did about it.',
              ['Names the situation and the supervisor intervention', 'Reduced supervision overhead inside the assignment', 'Confirms the supervisor signed it off', 'No pattern of repeated incidents'],
              ['Required heavy supervision throughout', 'Cannot describe the supervisor stepping in', 'Pattern of similar incidents across assignments', 'Blames training or systems'],
              'What does normal independence look like for you by day three of an assignment?',
            ),
          },
          verification_question: {
            framed_for: 'employer_permanent',
            question: 'We document this for ERA 2025 because it is a defensible signal at probation. Tell me about a role where you were on the edge of underperforming, what you did, and what your line manager would say about how you handled it.',
            strong_answer_signs: ['Specific situation, not hypothetical', 'Owns the contribution to the dip', 'Named the action they took', 'Manager would corroborate the recovery'],
            weak_answer_signs: ['Cannot recall a near-miss', 'Blames the role rather than the work', 'Action was passive (waiting for a review)', 'Line manager unlikely to confirm the story'],
            follow_up_probe: 'If your line manager called you out on a quality dip in week six, what is the first thing you would do?',
          },
        },
      },
    },
    execution_reliability: 88,
  },

  /* ── Marcus Williams, 74, Low ── */
  'demo-c2': {
    overall_score: 74,
    risk_level: 'Low',
    percentile: 'Top 28%',
    pressure_fit_score: 71,
    pass_probability: 76,
    candidate_type: 'Collaborative Communicator with Moderate Drive|Works well with teams and communicates clearly but may need pushing to take initiative on difficult tasks.',
    confidence_level: 'High',
    trajectory: 'Stable',
    seniority_fit_score: 72,
    risk_reason: 'Solid overall performance with genuine strengths in campaign execution and stakeholder rapport. Main gap is analytical depth , responses on measurement and data-led decision-making leaned on intuition rather than structured frameworks. This is coachable but requires explicit development focus in onboarding.',
    ai_summary: `Marcus Williams is a competent Marketing Manager candidate with clear strengths in campaign execution and relationship management. His responses show a practical, action-oriented mindset and a good instinct for brand voice that would translate well to most marketing team environments. He writes with energy and conviction, and his stakeholder scenarios in particular reveal someone with genuine experience navigating internal complexity.

His strongest responses were in the stakeholder management and communication scenarios. In Scenario 2, he demonstrated genuine warmth and a pragmatic approach to navigating disagreements, writing: "Before I escalate anything formally, I\'d want to grab a coffee with the sales lead and understand what\'s actually driving the frustration. Nine times out of ten it\'s a communication gap, not a strategic disagreement." This instinct , to diagnose before acting , is a hallmark of effective cross-functional operators and will serve him well in the first 90 days.

The main area of development for Marcus is analytical depth. His data-related response (Scenario 4) leaned heavily on gut feel and experience over structured measurement frameworks. He described managing channel performance by looking at "what\'s driving the most engagement and doubling down on that," without referencing attribution, contribution to revenue, or specific KPI frameworks. This is not disqualifying at this level, but it does suggest he would benefit from structured support on measurement and working alongside a strong marketing analyst.

His pressure-fit scores are solid across the board, with decision speed and composure being particular strengths. The one inconsistency , more cautious in Scenario 2 than in Scenario 4 on a similar type of risk decision , is minor and may reflect contextual reasoning rather than inconsistency. Worth probing in interview.

Hire with structured onboarding. Marcus has the interpersonal skills, execution instinct, and campaign experience to succeed in this role. The analytical gap is real but addressable with the right support in the first 60 days. Pair with a data-oriented analyst from day one and set explicit measurement KPIs in the 30-day review to build this capability early.`,
    integrity: {
      response_quality: 'Likely Genuine',
      quality_notes: 'Responses are substantive and specific, with a consistent conversational voice. Slight length variation between scenarios suggests natural rather than uniform effort distribution. No integrity concerns.',
      consistency_rating: 'Medium',
      consistency_notes: 'Core values and approach are consistent. Minor inconsistency in risk tolerance , more cautious in Scenario 2 than Scenario 4 on a similar type of decision. Low concern.',
      time_analysis: 'Scenario 1 (4m 28s): Normal. Scenario 2 (2m 22s): Fast , slightly brief for scenario complexity, which aligns with the shorter response length observed. Scenario 3 (5m 10s): Normal. Scenario 4 (4m 45s): Normal.',
      red_flags: [],
    },
    pressure_fit: {
      decision_speed_quality: {
        score: 77,
        verdict: 'Strength',
        narrative: 'Marcus made clear decisions without excessive hedging across most scenarios. In the ambiguous prioritisation scenario, he committed to a course of action and articulated his reasoning before seeking consensus , an important distinction between confidence and recklessness. He used decisive language ("I would do X") rather than hedging language ("I might consider") in three of four scenarios. The exception was Scenario 2, where he was more cautious, though this may reflect appropriate context-sensitivity rather than inconsistency. His decisiveness is particularly evident when he has prior experience in the domain , decisions about campaign execution and stakeholder communication were notably more confident than decisions about data-led interventions. In their first 90 days, this suggests they will likely move initiatives forward with appropriate speed in their areas of strength while potentially seeking more validation than necessary in data or analytics decisions.',
      },
      composure_under_conflict: {
        score: 74,
        verdict: 'Moderate',
        narrative: 'Marcus handled the difficult stakeholder scenario reasonably well, relying on rapport, warmth, and relationship-building instinct rather than a structured escalation process. This approach works effectively in environments where trust already exists, but may be less reliable in adversarial or unfamiliar relationships where rapport has not yet been built. He did not become defensive or avoidant , both common failure modes , but he also did not propose a specific resolution pathway or timeline, leaving the outcome somewhat open-ended. He wrote: "I\'d want to rebuild the relationship before we tackle the strategic disagreement" , sound in principle but potentially slow in practice. In their first 90 days, this suggests they will likely handle existing team conflicts with warmth and effectiveness, but may need coaching on how to address tension with new stakeholders where relationship capital hasn\'t yet been established.',
      },
      prioritisation_under_load: {
        score: 68,
        verdict: 'Moderate',
        narrative: 'Marcus identified the right high-level priorities in the multi-demand scenario, but his reasoning was largely intuitive rather than structured. He named what needed to happen first but could not clearly explain the criteria behind the sequence , responding with "you can usually sense what\'s most urgent" rather than a repeatable framework. He did not consider dependencies or the downstream cost of delays, which is a notable gap at Marketing Manager level where prioritisation decisions affect multiple teams. He also did not mention delegation as a tool, suggesting he may be prone to over-loading himself rather than using team capacity effectively. This is coachable with explicit focus. In their first 90 days, this suggests they will likely rely on experience and instinct for prioritisation decisions, which will work well in familiar domains but may create bottlenecks in fast-moving or complex situations.',
      },
      ownership_accountability: {
        score: 72,
        verdict: 'Moderate',
        narrative: 'Marcus generally takes ownership and uses first-person language when describing his role in outcomes. The one instance that stands out is his attribution of a past campaign failure partly to "unclear briefs from the client" , not a red flag on its own, but a pattern worth monitoring. In high-performing marketers, accountability tends to be unconditional: they own the outcome regardless of the brief quality, because they see it as their responsibility to clarify ambiguity before execution. Marcus\'s response suggests he is still developing this unconditional ownership mindset. He did not repeat this pattern in other scenarios, which is encouraging. In their first 90 days, this suggests they will likely demonstrate good personal accountability in most situations, with the potential for occasional external attribution in high-pressure moments , something to watch in early performance conversations.',
      },
    },
    scores: {
      'Commercial Thinking': 68,
      'Stakeholder Management': 80,
      'Communication': 78,
      'Adaptability': 75,
      'Decision Making Under Pressure': 72,
    },
    score_narratives: {
      'Commercial Thinking': 'The main development area. Response relied on descriptive metrics (impressions, engagement rate) without connecting them to pipeline, revenue, or cost-per-acquisition. Would benefit from structured measurement coaching in the first 60 days and paired working with a marketing analyst.',
      'Stakeholder Management': 'Genuine strength. His response to the cross-functional conflict scenario was warm, pragmatic, and focused on long-term relationship capital. He correctly identified that trust is more valuable than winning a short-term argument, evidence of real experience navigating internal politics.',
      'Communication': 'Clear and confident communicator. Strong instinct for tone and audience, though responses occasionally lacked precision on technical marketing concepts. His Scenario 1 email was well-structured and appropriately urgent without being alarmist, a skilled tonal choice.',
      'Adaptability': 'Solid integrated thinking and good awareness of channel mix when the brief shifted mid-scenario. He pivoted his original plan but defaulted to a familiar channel mix rather than testing a new approach, suggesting he is more comfortable adjusting tactics than reframing strategy.',
      'Decision Making Under Pressure': 'Reached a clear decision quickly under time pressure. The one watch-out is his attribution of a past campaign failure partly to unclear briefs from the client, which suggests he is still developing fully unconditional ownership of decisions made in ambiguity.',
    },
    scoring_confidence: {
      level: 'medium',
      reason: 'Adequate response depth, but generic-language patterns and inconsistent style across scenarios capped scoring confidence at MEDIUM.',
      confidence_reason: 'Adequate response depth, but moderate generic-language patterns and inconsistency in answer style across scenarios. Recommend additional verification before submitting to client to protect the fee through the rebate period.',
      confidence_reason_variants: {
        agency_permanent:  'Adequate response depth, but moderate generic-language patterns and inconsistency in answer style across scenarios. Recommend additional verification before submitting to client to protect the fee through the rebate period.',
        agency_temporary:  'Adequate response depth, but moderate generic-language patterns and inconsistency in answer style across scenarios. Recommend closer monitoring during the first week of assignment to confirm attendance and client satisfaction with the worker output.',
        employer_permanent:'Adequate response depth, but moderate generic-language patterns and inconsistency in answer style across scenarios. Recommend documented interview verification before offer to anchor the probation case under ERA 2025 and reduce line manager workload.',
        employer_temporary:'Adequate response depth, but moderate generic-language patterns and inconsistency in answer style across scenarios. Recommend close supervision in the first week of assignment to confirm capability before extending.',
      },
    },
    generic_detection: {
      score: 48,
      flags: ['buzzword_heavy', 'inconsistent_style', 'missing_concrete_actions'],
      evidence_per_flag: {
        buzzword_heavy: "I'd want to leverage cross-functional alignment to drive stakeholder buy-in and own the narrative end-to-end.",
        inconsistent_style: 'Scenario 1 used short, conversational prose ("Honestly, I\'d just pick up the phone first") / Scenario 3 switched to a formal bullet-pointed structure with corporate phrasing that does not appear elsewhere.',
        missing_concrete_actions: 'In Scenario 4 he wrote "I would want to consider all the relevant inputs and explore a few options" without naming a single specific action, owner, or deadline.',
      },
    },
    strengths: [
      {
        strength: 'Natural stakeholder rapport and political intelligence',
        explanation: 'Marcus builds trust quickly and instinctively adapts his communication style to the person he\'s talking to. In Scenario 2, he correctly diagnosed the root cause as a communication gap rather than a strategic disagreement , a sophisticated read.',
        evidence: 'Before I escalate anything formally, I\'d want to grab a coffee with the sales lead and understand what\'s actually driving the frustration. Nine times out of ten it\'s a communication gap, not a strategic disagreement.',
      },
      {
        strength: 'Bias toward action and pragmatic execution',
        explanation: 'He resists over-engineering and prioritises getting things done. In a fast-moving marketing team, this bias toward action is a genuine asset , he will ship campaigns while others are still in planning.',
        evidence: 'I\'d rather launch a good campaign that we can iterate on than spend six weeks perfecting something that might miss the window entirely.',
      },
    ],
    watchouts: [
      {
        watchout: 'Analytical depth below seniority expectations',
        severity: 'Medium',
        explanation: 'At Marketing Manager level, building and owning measurement frameworks is typically expected. Marcus\'s approach relies on descriptive metrics and intuition rather than structured attribution or ROI modelling. This limits his ability to advocate for marketing investment at board level.',
        evidence: 'For channel performance, I\'d look at what\'s driving the most engagement and double down on that , usually you can sense what\'s working fairly quickly.',
        action: 'Pair with a marketing analyst from day one and agree shared KPIs that connect marketing activity to revenue outcomes. Consider a structured data literacy session in weeks two to three to build confidence with attribution tools.',
        ...makeWatchoutVerification({
          agency_permanent: {
            q: 'The report flags analytical depth below the Marketing Manager bar. Walk us through the last attribution model you actually built or commissioned, what decisions it changed, and how you defended those numbers to a finance lead.',
            strong: ['Names a specific attribution or ROI model', 'Describes the decision the model changed', 'Defended the numbers in a finance forum', 'Owns where the model was weak'],
            weak: ['Defaults to engagement metrics', 'Cannot name a model they have built', 'Numbers were always produced by someone else', 'No example of pushing back with data'],
            probe: 'When the CFO asked you for the cost per qualified lead, what did you tell them and what was your supporting working?',
          },
          agency_temporary: {
            q: 'On a short marketing assignment, what is the smallest measurement framework you put in place to prove the work mattered? Walk me through a recent example.',
            strong: ['Specific framework set up inside the assignment', 'Numbers shared back to the on-site contact', 'Worked without a dedicated analyst', 'Named the metric that defined success'],
            weak: ['Did not set up any tracking on the assignment', 'Relied entirely on existing dashboards', 'No numbers came out of the work', 'Cannot describe what success looked like'],
            probe: 'If the on-site contact asked you for a one-line ROI on day five, what would you have said?',
          },
          employer_permanent: {
            q: 'The report flags an analytical-depth gap. We need this answered for the probation file under ERA 2025. Tell me about the last time you owned an attribution model end to end, what it changed in the business, and what you would build inside the first 60 days here.',
            strong: ['Owned a measurement framework end to end', 'Names the decision the model changed', 'Pre-empts what they would build here in 60 days', 'Acknowledges where their analytical work has limits'],
            weak: ['Owns nothing past surface metrics', 'Cannot describe a model they built', 'No plan for the first 60 days', 'Defends gaps as "the analyst\'s job"'],
            probe: 'If the CFO asked you to defend marketing spend in board pack, what evidence would you build to anchor the case?',
          },
          employer_temporary: {
            q: 'For this assignment we will not have an analyst. Tell me about a time you ran the numbers yourself on a piece of marketing work and what you learned from doing it.',
            strong: ['Built and ran the analysis personally', 'Came back with the implication, not just the data', 'Did it inside an assignment timeframe', 'No reliance on a dedicated analyst'],
            weak: ['Always partnered with an analyst', 'Cannot describe a self-run analysis', 'Confuses dashboards with insight', 'No personal output from the data'],
            probe: 'What would you do on day three if the data feed broke and you had to estimate channel performance from scratch?',
          },
        }, 'employer_permanent'),
      },
      {
        watchout: 'Incomplete accountability in ambiguous situations',
        severity: 'Low',
        explanation: 'Mostly takes ownership, but one response attributed a campaign outcome to "unclear briefs" without acknowledging what he could have done to clarify the brief before delivery. Low risk but worth monitoring in the first performance review.',
        evidence: null,
        action: 'Set clear individual targets (not team-level) in the 30-day review to establish personal accountability norms early. Frame accountability as a leadership behaviour in onboarding conversations.',
        ...makeWatchoutVerification({
          agency_permanent: {
            q: 'Tell me about a campaign that did not land and the brief was ambiguous. What did you do BEFORE the work was approved, not after, to clarify what success looked like?',
            strong: ['Pushed back on the brief in writing', 'Named the assumption they were testing', 'Action taken before launch, not after', 'Owns the contribution to the miss'],
            weak: ['Story starts after the campaign failed', 'Brief blamed without owning what they could control', 'No record of pushing back', 'External attribution dominates'],
            probe: 'If the brief came in vague tomorrow, what is the first thing you would do before agreeing to deliver?',
          },
          agency_temporary: {
            q: 'On assignment, an unclear brief is your problem, not the client\'s. Tell me about an assignment where the brief was thin and you tightened it before producing.',
            strong: ['Tightened the brief inside the assignment', 'Got sign-off from the on-site contact', 'No miss attributed to ambiguity', 'Specific brief change named'],
            weak: ['Started work without clarification', 'Blamed unclear brief for an output miss', 'No record of brief refinement', 'Required ongoing direction'],
            probe: 'What is the question you ask first when an assignment brief lands?',
          },
          employer_permanent: {
            q: 'The report flags a small accountability watch-out around ambiguous situations. We document this for the probation file. Tell me about a campaign that missed the mark, where the brief was unclear, and what you did inside your control before the work shipped.',
            strong: ['Owns specific decisions inside the failure', 'Action taken before launch, not after', 'No deflection to external factors', 'Reflects on what they would do differently'],
            weak: ['Brief blamed entirely', 'No proactive clarification', 'Cannot describe a moment of choice', 'Story stays in the abstract'],
            probe: 'In your first 30 days here, how would you handle a brief that arrived unclear from the leadership team?',
          },
          employer_temporary: {
            q: 'For a short assignment we cannot afford a brief misread. Tell me about a time you got an assignment brief that was thin and how you closed the gap before you started producing.',
            strong: ['Pinged a question back to the on-site contact early', 'Defined success in writing before producing', 'No reliance on a long onboarding', 'Owns ambiguity as their problem to close'],
            weak: ['Produced first and clarified later', 'Blames thin briefs in past assignments', 'No habit of writing back the success criteria', 'Required day-by-day direction'],
            probe: 'What would you ask before saying yes to this assignment if the brief arrived in two lines?',
          },
        }, 'employer_permanent'),
      },
    ],
    onboarding_plan: [
      {
        week: 1,
        title: 'Stakeholder Introductions and Landscape Mapping',
        objective: 'Leverage Marcus\'s natural rapport-building to establish strong relationships with key internal partners and understand the political landscape before making any decisions.',
        activities: [
          'Structured 1:1 introductions with Sales, Product, Customer Success, and Finance leads. Marcus should lead these conversations to establish himself , brief him to listen for the current perception of marketing and existing friction points.',
          'Introduction to the marketing team with a focus on understanding each person\'s current priorities, blockers, and working style. Marcus will build these relationships quickly; channel that energy into intelligence-gathering.',
          'Review all active campaigns and the current marketing calendar. Produce a simple summary of what is in-flight, what is paused, and what is planned.',
        ],
        checkpoint: 'Can name the three biggest current cross-functional tensions involving marketing and the two stakeholders whose buy-in is most critical to his success.',
        involves: ['Line manager', 'Sales lead', 'Customer Success lead', 'HR , ERA 2025 day-one induction'],
        notes: 'ERA 2025 requires all day-one employment rights to be communicated on the first day. Ensure Marcus receives his written statement of particulars and any probation documentation before the end of day one.',
      },
      {
        week: 2,
        title: 'Data and Analytics Immersion',
        objective: 'Address the primary assessed gap , analytical depth , by immersing Marcus in the current data infrastructure and building a shared measurement baseline with the analytics function.',
        activities: [
          'Deep-dive session with the marketing analyst or analytics team to review the current measurement stack: which tools are in use, what data is available, and where the known gaps are. Marcus should document what he learns.',
          'Review the last six months of campaign performance data with the analyst present. Specifically: how is success currently defined, and how does current reporting connect (or fail to connect) marketing activity to revenue outcomes?',
          'Agree on a set of shared KPIs with Sales that both teams will track. Marcus should drive this conversation , use his stakeholder skills to get Sales buy-in on metrics that matter to marketing.',
        ],
        checkpoint: 'Has produced a written summary of the current analytics stack and identified at least two specific gaps between current measurement practice and best practice. Has agreed at least three shared marketing-sales KPIs.',
        involves: ['Line manager', 'Marketing analyst', 'Sales lead'],
        notes: 'CIPD guidance on new hire development recommends addressing identified skill gaps within the first 30 days. A structured analytics immersion in week two directly addresses the gap identified in this assessment.',
      },
      {
        week: 3,
        title: 'First Active Campaign Ownership',
        objective: 'Give Marcus full ownership of an active campaign end-to-end to demonstrate his execution strengths and build early team credibility.',
        activities: [
          'Assign Marcus full ownership of one active campaign , including budget management, channel decisions, and performance reporting. This should be a campaign where his execution instinct will have immediate impact.',
          'Set a specific, measurable performance target for this campaign (not activity metrics , an outcome metric like leads generated, cost per lead, or pipeline contribution). Marcus should agree this target before the campaign runs.',
          'Weekly campaign review with the line manager , not to direct, but to observe Marcus\'s thinking and coach on the analytical dimension if needed.',
        ],
        checkpoint: 'Has independently made at least two campaign decisions (channel allocation, messaging, or targeting) with a documented rationale tied to data, not intuition.',
        involves: ['Line manager', 'Marketing team', 'Analytics team'],
        notes: 'N/A',
      },
      {
        week: 4,
        title: 'Measurement Framework Review and KPI Sign-off',
        objective: 'Establish a repeatable measurement framework that Marcus owns and that connects marketing activity to revenue outcomes , addressing the primary gap identified in this assessment.',
        activities: [
          'Marcus presents his proposed measurement framework to the line manager and analytics team: which metrics will be tracked weekly, monthly, and quarterly, and how each connects to a revenue outcome.',
          '30-day stakeholder feedback session: gather structured feedback from Sales, Product, and the marketing team on Marcus\'s first four weeks. Focus on communication clarity and cross-functional effectiveness.',
          'Review the campaign performance from week three against the agreed target. Marcus should present the results and his interpretation , coach on attribution and root-cause analysis if the narrative is still intuition-based.',
        ],
        checkpoint: 'Has produced and presented a documented measurement framework. Stakeholder feedback is positive on communication and relationship-building. Campaign performance has been reviewed with a data-led narrative.',
        involves: ['Line manager', 'Analytics team', 'Sales lead', 'HR , 30-day probation check-in'],
        notes: 'ERA 2025 recommends a formal probationary check-in at 30 days. This should be documented and signed off by both Marcus and his line manager.',
      },
      {
        week: 5,
        title: '30-Day Review and Strategic Planning',
        objective: 'Complete the formal 30-day probationary review and agree the marketing strategy for the next 60 days, with Marcus driving the agenda.',
        activities: [
          'Formal 30-day probationary review with the line manager. Review performance against onboarding KPIs, provide structured feedback, and document agreed development actions , particularly around analytical capability.',
          'Marcus presents his 60-day marketing strategy: priorities, campaigns, team development, and budget allocation. This should be data-informed , check that he is using the measurement framework developed in week four to justify decisions.',
          'Agree on a personal development plan for the analytical gap: structured training, paired working with the analyst, or both. Set a clear 60-day target for improvement.',
        ],
        checkpoint: 'Formal 30-day review is documented and signed. 60-day marketing strategy has been presented and approved. Development plan for analytical capability is agreed and in writing.',
        involves: ['Line manager', 'HR , ERA 2025 probationary review documentation'],
        notes: 'ERA 2025 statutory probation review must be documented and communicated within 30 working days for all contracts of 6 months or more. Ensure paperwork is completed this week.',
      },
      {
        week: 6,
        title: 'Independent Leadership and 60-Day Planning',
        objective: 'Marcus takes full independent ownership of the marketing function with minimal line manager oversight, and demonstrates measurable progress on the analytical gap.',
        activities: [
          'Marcus chairs his first full marketing team meeting as the lead , setting the agenda, reviewing performance, and making decisions without requiring line manager presence.',
          'Review of the analytical development plan: has Marcus shown measurable improvement in connecting campaign decisions to data? Compare his current reporting to week two as a baseline.',
          'Set goals for months two and three. Marcus should propose these himself, with the line manager reviewing for appropriate ambition and alignment with business priorities.',
        ],
        checkpoint: 'Has chaired a full team meeting independently. Can demonstrate measurable improvement in data-led decision-making compared to week two baseline. Month two and three goals are agreed.',
        involves: ['Line manager', 'Marketing team', 'Analytics team'],
        notes: 'CIPD probation guidance recommends a formal 60-day progress review to assess trajectory and identify any support needed before the full probation review at 90 days.',
      },
    ],
    interview_questions: [
      'How do you measure whether a marketing campaign is actually contributing to pipeline, not just generating traffic and clicks? Walk me through the metrics you report to leadership each month. (Follow-up probe: Which attribution model do you use and why?)',
      'Sales says marketing leads are low quality. How do you handle that conversation and what do you do about it? (Follow-up probe: How do you get Sales to follow up on leads they\'ve already dismissed?)',
      'You\'re managing three campaigns simultaneously and a new priority comes in from the CEO mid-quarter. What do you drop, what do you protect, and how do you communicate the trade-off? (Follow-up probe: How do you tell the stakeholder whose project got pushed that they need to wait?)',
      'Tell me about a campaign that missed its targets. What happened and what was your specific role in the outcome? (Follow-up probe: What would you have done differently in the briefing or planning stage?)',
    ],
    cv_comparison: [
      'Experienced marketing professional with a collaborative working style',
      'Strong communicator with cross-departmental stakeholder experience',
      'Track record of delivering campaigns to deadline in fast-paced environments',
    ],
    predictions: {
      pass_probation: 78,
      top_performer: 45,
      churn_risk: 16,
      underperformance_risk: 21,
      _panels: makePanelPredictionVariants('Marketing Manager', { tone: 'mixed' }),
      _verification: makePredictionsVerification('Marketing Manager', 'employer_permanent'),
    },
    execution_reliability: 72,
    training_potential: 68,
    training_potential_narrative: 'Showed clear improvement between Scenario 2 and Scenario 4 and acknowledged his analytical gap without prompting. Will respond well to a structured 30-60-90 plan with paired analyst support.',
  },

  /* ── Priya Patel, 61, Medium ── */
  'demo-c3': {
    overall_score: 61,
    risk_level: 'Medium',
    percentile: 'Top 47%',
    pressure_fit_score: 58,
    pass_probability: 63,
    candidate_type: 'Careful and Thorough but Struggles Under Pressure|Produces detailed work when given time but quality drops noticeably when deadlines stack up.',
    confidence_level: 'Medium',
    trajectory: 'Stable',
    seniority_fit_score: 55,
    risk_reason: 'Mixed performance across scenarios. Genuine strengths in client communication and persistence, offset by concerning gaps in objection handling, pipeline discipline, and composure under closing pressure. The objection-handling gap in particular is a significant risk for a Sales Executive role in competitive environments.',
    ai_summary: `Priya Patel presents a mixed profile for the Sales Executive role. Her clearest strength is client communication , she writes with warmth and clarity and demonstrates genuine interest in understanding client needs before presenting solutions. In Scenario 1, she wrote: "I wouldn\'t go into that call with a prepared pitch. I\'d spend the first fifteen minutes asking about what\'s changed in their business and what they\'re trying to solve right now." This discovery-first instinct is genuinely valuable and not universally present in Sales Executive candidates.

However, her performance on the negotiation and closing scenarios raised meaningful concerns. In the objection-handling scenario (Scenario 3), she became somewhat defensive when the prospect challenged her on pricing. Her response focused on justifying the product rather than reframing the value proposition or moving the conversation forward , a pattern that can cost deals in competitive environments. She did not attempt to understand the underlying concern before responding, which is a standard negotiation best practice at this level.

Her pipeline management response showed reasonable awareness of CRM disciplines but lacked the precision expected at Sales Executive level. She described managing her pipeline "intuitively" rather than referencing specific stage-exit criteria or velocity metrics. In Scenario 4, when asked how she identifies at-risk deals, she responded: "I can usually tell from the tone of the last conversation." This intuitive approach works with a warm pipeline but will struggle at scale.

The pressure-fit scores tell a consistent story: Priya operates with confidence in early-stage, relationship-building contexts and loses some composure when deals face direct pressure or when she is required to commit to a close. This is a learnable pattern but requires conscious and structured development.

Proceed with caution , specific risks identified. Priya has the raw material to become a strong Sales Executive, but hiring her for a role that requires significant new business acquisition, competitive deal-making, or high-volume closing will require an explicit, structured development programme from day one. If the role is more account management and relationship-led, the risk profile is considerably lower.`,
    integrity: {
      response_quality: 'Likely Genuine',
      quality_notes: 'Responses are genuine and personally written. Two responses were shorter than expected for scenario complexity , this contributed to the Medium confidence rating rather than any authenticity concern. Language and style are consistent throughout.',
      consistency_rating: 'Medium',
      consistency_notes: 'Good consistency in communication style and values. Some inconsistency in confidence level , self-assured in early-stage scenarios but noticeably more hesitant in closing and negotiation contexts.',
      time_analysis: 'Scenario 1 (4m 55s): Normal. Scenario 2 (2m 38s): Fast , shorter response aligned with observed length. Scenario 3 (4m 2s): Normal. Scenario 4 (24m 10s): Extended , response time was atypically long, suggesting careful consideration or distraction.',
      red_flags: [],
    },
    pressure_fit: {
      decision_speed_quality: {
        score: 62,
        verdict: 'Moderate',
        narrative: 'Priya made reasonable decisions across most scenarios but consistently hedged with qualifiers that signal incomplete commitment. Phrases like "I would probably approach it this way" and "I think I\'d start by" appeared in three of four scenarios. In a sales context, this language pattern matters , prospects read hesitancy in salespeople and it can undermine trust at critical moments in a deal cycle. She did make clear decisions in Scenario 1 (discovery approach) where she was on familiar ground, but reverted to hedged language in Scenario 3 (objection handling) where the stakes were higher. This pattern , decisiveness in comfort zones, hesitancy under pressure , is a meaningful predictor of how she will perform in late-stage, high-pressure deal situations. In their first 90 days, this suggests they will likely handle early pipeline stages confidently but may need coaching support to commit to closing conversations and to use more decisive language when it matters most.',
      },
      composure_under_conflict: {
        score: 55,
        verdict: 'Moderate',
        narrative: 'When a prospect challenged her value proposition directly in Scenario 3, Priya\'s initial response was to defend the product\'s features rather than acknowledge the prospect\'s concern and reframe the conversation. She wrote: "The price point is based on everything that\'s included in the package , the integrations, the support, the onboarding." This is a justification response, not a reframe , and it is the most common failure mode in sales objection handling. Her composure improved in the second half of her response, where she attempted to understand the prospect\'s perspective, but the initial defensive instinct is the pattern that will show up in live selling situations. Under sustained pressure from a sophisticated buyer, this pattern is likely to extend deal cycles or result in unnecessary concessions. In their first 90 days, this suggests they will likely need structured coaching on objection handling before being given solo responsibility for competitive deals. Call review sessions with a senior rep will be particularly valuable in this period.',
      },
      prioritisation_under_load: {
        score: 60,
        verdict: 'Moderate',
        narrative: 'In the pipeline management scenario, Priya identified the right categories of deals to prioritise (deals that are close to closing, accounts with an upcoming renewal) but could not articulate the specific criteria she uses to make those prioritisation decisions. She described her process as "keeping a mental list of where each deal is and how it\'s feeling," which suggests her prioritisation is experience-based rather than systematic. At scale , managing 20 or more accounts , this approach will create blind spots and missed opportunities. She did not reference velocity, time-in-stage, or any specific pipeline metrics, and did not mention what triggers an escalation or a conversation with her manager. In their first 90 days, this suggests they will likely manage a small pipeline effectively through intuition and effort, but will need explicit training on systematic pipeline management before taking on a full quota-bearing role.',
      },
      ownership_accountability: {
        score: 56,
        verdict: 'Moderate',
        narrative: 'Priya takes responsibility in most scenarios, but one response was notable: when describing a lost deal, she attributed the outcome primarily to "market timing" and "the prospect not being ready" without acknowledging what she might have done differently at the qualification or objection stage. In sales roles, this pattern of external attribution for lost deals is a meaningful warning signal , it suggests the candidate may struggle to self-diagnose and improve their own technique over time. She did not repeat this pattern in other scenarios, and her language in early-stage scenarios was consistently first-person and active ("I would," "I\'ll"). The attribution gap appears specifically around outcomes she perceived as outside her control. In their first 90 days, this suggests they will likely demonstrate good day-to-day accountability but may need coaching to develop the habit of conducting structured deal retrospectives on losses, regardless of the apparent external cause.',
      },
    },
    scores: {
      'Commercial Thinking': 58,
      'Stakeholder Management': 74,
      'Persistence': 50,
      'Communication': 72,
      'Adaptability': 60,
      'Decision Making Under Pressure': 55,
    },
    score_narratives: {
      'Commercial Thinking': 'Reasonable awareness of CRM hygiene and stage management. Could not define specific stage-exit criteria for her pipeline, suggesting her approach is more habitual than systematic. References pipeline value and conversion correctly when prompted, but defaults to product features in unprompted writing. Will struggle at scale without an explicit commercial framework.',
      'Stakeholder Management': 'Clear strength. Priya writes with warmth and genuine curiosity, asks good discovery questions, and positions herself as a partner rather than a vendor. In Scenario 1, she refused to lead with a pitch, a discipline that builds trust with prospects and is a strong foundation for long-term account relationships.',
      'Persistence': 'Mixed. She maintains contact with prospects over time without becoming aggressive and her follow-up is value-led rather than transactional. The gap is in handling rejection live: when challenged, she falls back on defending the product rather than reframing the value, which is the first behaviour high-performing salespeople drop after their first quarter.',
      'Communication': 'Strong instincts for tone and discovery questioning. Hedged language ("I would probably," "I think I would") appeared across three scenarios and softens her closing asks. Her written follow-up examples were specific and prospect-aware, but her closing language ("when you are ready," "no pressure") would extend deal cycles and reduce urgency.',
      'Adaptability': 'Adjusts her discovery approach when given a different buyer profile, but tends to default to a single pitch under time pressure. Showed reasonable flexibility when the scenario shifted from inbound to outbound, but did not reframe her value props for the new context.',
      'Decision Making Under Pressure': 'Hesitant in closing scenarios. Did not attempt a trial close in the appropriate scenario and reverted to hedged language in Scenario 3 (objection handling) where the stakes were higher. The pattern (decisive in comfort zones, hesitant under pressure) is a meaningful predictor of how she will perform in late-stage, high-pressure deal situations.',
    },
    scoring_confidence: {
      level: 'medium',
      reason: 'Good performance overall, but hedged language and weaker objection-handling specificity reduced confidence to MEDIUM.',
      confidence_reason: 'Good performance overall, but answers in the objection-handling scenario were less specific and hedging language reduced confidence. Recommend additional verification before submitting to client to protect the fee through the rebate period.',
      confidence_reason_variants: {
        agency_permanent:  'Good performance overall, but answers in the objection-handling scenario were less specific and hedging language reduced confidence. Recommend additional verification before submitting to client to protect the fee through the rebate period.',
        agency_temporary:  'Good performance overall, but answers in the objection-handling scenario were less specific. Recommend closer monitoring during the first week of assignment to confirm attendance and client satisfaction with the worker output.',
        employer_permanent:'Good performance overall, but answers in the objection-handling scenario were less specific and hedging language reduced confidence. Recommend documented interview verification before offer to anchor the probation case under ERA 2025 and reduce line manager workload.',
        employer_temporary:'Good performance overall, but answers in the objection-handling scenario were less specific. Recommend close supervision in the first week of assignment to confirm capability before extending.',
      },
    },
    generic_detection: {
      score: 38,
      flags: ['vague_language'],
      evidence_per_flag: {
        vague_language: "I would probably approach it this way ... I'd want to keep a mental list of where each deal is and how it's feeling.",
      },
    },
    strengths: [
      {
        strength: 'Genuine client curiosity and discovery-first instinct',
        explanation: 'Priya consistently leads with questions rather than pitches and demonstrates authentic interest in the client\'s situation. This builds trust and surfaces information that drives more effective proposals. It is a genuine differentiator in relationship-led sales roles.',
        evidence: 'I wouldn\'t go into that call with a prepared pitch. I\'d spend the first fifteen minutes asking about what\'s changed in their business and what they\'re trying to solve right now.',
      },
      {
        strength: 'Persistence without pressure , value-led follow-up',
        explanation: 'She maintains contact with prospects over time without becoming aggressive or transactional. Her follow-up strategy is focused on adding value, which builds long-term relationships and positions her as a trusted advisor rather than a quota chaser.',
        evidence: 'I\'d send them something useful , an industry report, a case study that\'s genuinely relevant , before I\'d send a "just checking in" email. I want to be the salesperson they actually want to hear from.',
      },
    ],
    watchouts: [
      {
        watchout: 'Defensive response to pricing and value challenges',
        severity: 'High',
        explanation: 'When a prospect challenged the value proposition, Priya focused on defending the product\'s features rather than understanding the underlying concern and reframing the value. This is the primary risk factor for a Sales Executive role in competitive environments.',
        evidence: 'The price point is based on everything that\'s included in the package , the integrations, the support, the onboarding. When you look at what you\'re getting, it\'s actually very competitive.',
        action: 'Enrol in structured objection-handling training within the first 30 days. Use recorded call reviews to identify the pattern in live situations. Assign a senior sales mentor who can coach in real-time on live deals.',
        ...makeWatchoutVerification({
          agency_permanent: {
            q: 'Tell us about the last time a prospect pushed back hard on price. We need to know exactly what you said because if this lands at the client, it costs us the placement and the fee. What was the diagnosis before you defended anything?',
            strong: ['Diagnosed the concern before responding', 'Reframed the value rather than defending features', 'Held margin or reframed the buyer\'s priority', 'Specific deal and named outcome'],
            weak: ['Talks about discounting', 'Defended features as the first move', 'No diagnosis, only response', 'Lost the deal and blamed the prospect'],
            probe: 'When you have walked away from a deal on price, what told you the line was firm enough to walk?',
          },
          agency_temporary: {
            q: 'On a temp sales assignment, you cannot defer hard objections to a senior. Tell us about an assignment where you handled a price objection live and what the on-site manager said about your approach.',
            strong: ['Handled a price objection inside the assignment', 'Confirms on-site manager observed and signed off', 'No deferral or escalation', 'Specific deal outcome named'],
            weak: ['Always escalated price talk on assignment', 'Required real-time supervision through objections', 'Cannot describe a live moment', 'No client feedback on style'],
            probe: 'In an assignment where the supervisor is busy, what is your default response when the prospect says "this is too expensive"?',
          },
          employer_permanent: {
            q: 'The report flags defensive responses to pricing. We are documenting this answer for the probation file under ERA 2025. Walk me through the last time a prospect challenged value, what you actually said, and what your sales manager would corroborate.',
            strong: ['Specific deal, prospect quote, and response named', 'Reframed value before defending features', 'Owns the moment they nearly slipped', 'Sales manager would confirm the recovery'],
            weak: ['Defaults to feature defence', 'Cannot recall a specific exchange', 'Story does not include the prospect\'s actual words', 'Sales manager unlikely to recall the recovery'],
            probe: 'If a prospect in week six told you the price was 25% above their budget, what is your first sentence after they finish?',
          },
          employer_temporary: {
            q: 'For this assignment we need someone who can hold a value conversation without supervision. Tell me about a recent assignment where a prospect pushed on price and you handled it live.',
            strong: ['Held the value framing live, with no escalation', 'On-site manager did not need to intervene', 'Specific deal and result named', 'No reliance on a senior to close'],
            weak: ['Always passed the price talk to a senior', 'Required heavy supervision', 'Cannot describe handling it live', 'Story ends with someone else closing'],
            probe: 'What does your default opening sentence look like when a prospect says "send your best price"?',
          },
        }, 'employer_permanent'),
      },
      {
        watchout: 'Hesitant closing language in late-stage deals',
        severity: 'Medium',
        explanation: 'Uses non-committal language at closing stages that can unintentionally reduce urgency and extend deal cycles. The pattern is learnable but requires conscious correction.',
        evidence: 'I\'d probably leave the ball in their court at that stage , let them come to me when they\'re ready.',
        action: 'Provide specific closing techniques and trial-close questions to practise. Include a closing language audit in call review sessions for the first two months.',
        ...makeWatchoutVerification({
          agency_permanent: {
            q: 'Tell us about a late-stage deal you closed yourself. We need to hear the words you used at the close because soft closing language is what would put the placement at risk.',
            strong: ['Used a direct, committal close', 'Specific phrase quoted from the call', 'Deal closed inside the quarter', 'Owns the moment of the close'],
            weak: ['Uses soft language like "when you are ready"', 'Cannot recall the closing phrase', 'Deal slipped and was blamed on the prospect', 'No example of a committal close'],
            probe: 'What is your standard closing question on a late-stage deal, word for word?',
          },
          agency_temporary: {
            q: 'On a temp sales assignment the close has to happen inside the assignment window. Tell us about an assignment where you closed a deal yourself before the placement ended.',
            strong: ['Specific assignment, specific close', 'Worked under the assignment time pressure', 'No reliance on a senior to close', 'Confirms commission paid or deal credited'],
            weak: ['Closes always handled by the on-site team', 'No personal closing example from an assignment', 'Cannot describe the moment of close', 'Required handover for the close'],
            probe: 'When the assignment was ending and a deal was open, what did you do in the last 48 hours?',
          },
          employer_permanent: {
            q: 'The report flags hesitant closing language. We document this for the probation file. Tell me about your last three closes, the words you used, and what you would change about your default closing language here.',
            strong: ['Quotes specific closing language', 'Owns where the language could be tighter', 'Names the deals and the outcomes', 'Pre-empts what they would adjust'],
            weak: ['No quotes available', 'Defends soft language as a stylistic choice', 'Cannot describe a tight close', 'No reflection on how language affects urgency'],
            probe: 'In the first 30 days here, what would you change about how you ask for the order?',
          },
          employer_temporary: {
            q: 'On this assignment closes need to land without coaching. Tell me about a recent assignment where you closed live and the exact words you used.',
            strong: ['Closing phrase quoted verbatim', 'No supervisor intervention needed', 'Confirms close was credited to them', 'Specific assignment timeframe'],
            weak: ['Required supervisor to take over the close', 'Closing language is consistently soft', 'No quoted phrase', 'Confused by what counts as a close'],
            probe: 'What does your closing line sound like when the supervisor is on a different call?',
          },
        }, 'employer_permanent'),
      },
    ],
    onboarding_plan: [
      {
        week: 1,
        title: 'Shadowing and Product Orientation',
        objective: 'Build Priya\'s product knowledge and expose her to best-practice objection handling and closing techniques through observation before she has any solo client contact.',
        activities: [
          'Shadow two senior sales reps through a full deal cycle, from first discovery call to close. Focus specifically on objection-handling moments and closing techniques , Priya should take notes on the specific language used.',
          'Complete full product training with the product or customer success team. She should be able to articulate the value proposition in three different ways by the end of the week , not feature-led but outcome-led.',
          'Review the company\'s sales playbook and pipeline stage definitions. Priya should map these to her existing mental model and note any differences from her previous role.',
        ],
        checkpoint: 'Can articulate the product\'s value proposition in outcome-based language without referring to features. Has observed at least two complete sales conversations including one objection-handling moment.',
        involves: ['Line manager', 'Senior sales reps (x2)', 'Product team', 'HR , ERA 2025 day-one induction'],
        notes: 'ERA 2025 requires all day-one rights to be communicated on the first day. Ensure Priya receives her written statement of particulars and probation terms before the end of day one.',
      },
      {
        week: 2,
        title: 'Supervised Discovery Calls',
        objective: 'Build Priya\'s confidence in the part of the process where she is strongest , early-stage discovery , while building product familiarity and ICP knowledge before introducing pressure-stage scenarios.',
        activities: [
          'Conduct discovery calls only , no pitching, no closing, no objection handling. Priya should lead each call with a senior rep present for support. Debrief after each call on what questions were most effective.',
          'Complete ICP (Ideal Customer Profile) training: which types of organisations are the best fit, what signals indicate readiness to buy, and what disqualification criteria should trigger an early stage exit.',
          'First 1:1 with the sales manager to set personal performance targets for the 30-day review. Targets should be activity-based (calls made, discovery calls completed) rather than revenue-based in weeks one to four.',
        ],
        checkpoint: 'Has led at least five discovery calls independently (with observer present). Can accurately identify whether a prospect matches the ICP without prompting from her manager.',
        involves: ['Line manager', 'Senior sales rep (as observer)', 'Sales manager'],
        notes: 'CIPD guidance on sales onboarding recommends separating skills development phases , discovery skills before negotiation and closing skills , to build competence sequentially rather than all at once.',
      },
      {
        week: 3,
        title: 'Objection Handling Training and Role-Play',
        objective: 'Address the primary assessed gap , objection handling , through structured training and practised role-play before Priya encounters live objections solo.',
        activities: [
          'Structured objection-handling training session with the sales manager: the LAER framework (Listen, Acknowledge, Explore, Respond). Role-play at least five common objections including the pricing objection identified in the assessment.',
          'Listen back to recorded sales calls featuring senior reps handling objections. Priya should identify and note the specific language patterns used , particularly how reps acknowledge before responding.',
          'First full sales calls (discovery to pitch) with a senior rep present for support. After each call, the senior rep provides real-time coaching specifically on any defensive responses observed.',
        ],
        checkpoint: 'In a role-play exercise assessed by the sales manager, Priya can handle a pricing objection using the LAER framework without reverting to feature justification. Observer confirms no defensive responses in the first two full sales calls.',
        involves: ['Sales manager', 'Senior sales rep', 'Line manager'],
        notes: 'N/A',
      },
      {
        week: 4,
        title: 'First Solo Pipeline and Pipeline Framework',
        objective: 'Introduce Priya to independent pipeline management with a structured framework that addresses the systematic gap identified in the assessment.',
        activities: [
          'Priya builds her first pipeline independently, with CRM entries for all active prospects at the correct stage. The sales manager reviews the pipeline and coaches on any misclassifications.',
          'Agree on specific stage-exit criteria for each pipeline stage , Priya should write these down and share with the sales manager. This builds the systematic pipeline approach that was absent in the assessment.',
          'First solo pipeline review with the sales manager: review each deal, identify at-risk accounts using specific criteria (time-in-stage, last activity date, prospect engagement score), and agree next actions.',
        ],
        checkpoint: 'Has a fully populated CRM pipeline with all prospects correctly staged. Can articulate the specific criteria for moving a deal from stage to stage without referring to notes.',
        involves: ['Sales manager', 'CRM administrator'],
        notes: 'CIPD guidance on sales performance management recommends that pipeline discipline is established as a norm in the first 30 days, before the salesperson\'s own habits are fully formed.',
      },
      {
        week: 5,
        title: '30-Day Review and Closing Technique Development',
        objective: 'Complete the formal 30-day probationary review and introduce structured closing techniques to address the hesitant closing language identified in the assessment.',
        activities: [
          'Formal 30-day probationary review with the line manager. Review activity KPIs, objection-handling improvement (assessed against the week three checkpoint), and pipeline discipline. Document agreed development actions.',
          'Closing techniques training session: trial closes, assumptive closes, and urgency-creation language. Role-play with the sales manager. Priya should practise at least three different closing approaches.',
          'Call review session: listen back to one of Priya\'s own calls from this week. Priya self-assesses first, then the sales manager provides structured feedback specifically on closing language and urgency creation.',
        ],
        checkpoint: 'Formal 30-day review is documented. In a role-play, Priya can attempt a trial close at an appropriate point in the conversation without hesitating. Call review feedback shows measurable improvement in closing language vs week two.',
        involves: ['Line manager', 'Sales manager', 'HR , ERA 2025 probationary review'],
        notes: 'ERA 2025 requires a documented probationary review at 30 days for contracts of 6 months or more. Ensure this is completed and signed before the end of week five.',
      },
      {
        week: 6,
        title: 'First Full Solo Deals and 60-Day Planning',
        objective: 'Priya handles her first complete deal cycles with minimal supervision, demonstrating measurable improvement in the two primary gaps: objection handling and closing language.',
        activities: [
          'Priya manages at least two full deal cycles independently this week , from discovery to close attempt. The sales manager is available for coaching but does not observe unless requested.',
          'Deal retrospective on any closed or lost deals from this week: Priya leads a structured review of what happened at each stage, with specific focus on objection-handling and closing moments.',
          'Set 60-day and 90-day individual sales targets with the line manager. These should now include revenue targets in addition to activity targets.',
        ],
        checkpoint: 'Has managed at least two full deal cycles independently. Deal retrospective shows evidence of LAER framework use in at least one live objection-handling situation. 60-day and 90-day revenue targets are agreed.',
        involves: ['Line manager', 'Sales manager'],
        notes: 'CIPD probation guidance recommends a 60-day check-in to assess whether the new hire is on track for a successful probation outcome. Document the meeting and any agreed actions.',
      },
    ],
    interview_questions: [
      'A prospect says your price is 30% higher than the competition. What do you say to them and how does that conversation go? (Follow-up probe: At what point do you involve your manager in a pricing discussion?)',
      'You\'ve had three calls with a prospect who seems engaged but won\'t commit. How do you move them forward? (Follow-up probe: What do you do when a deal you expected this quarter slips to next?)',
      'Walk me through how you manage your pipeline. How many deals are active right now and how do you know which ones are genuinely progressing? (Follow-up probe: What\'s your trigger for having a close-or-kill conversation with a prospect?)',
      'Tell me about a deal you lost. What went wrong and what would you do differently? (Follow-up probe: Was there a moment you knew it was slipping and didn\'t act on it quickly enough?)',
    ],
    cv_comparison: [
      'Self-starter with strong communication and interpersonal skills',
      'Experience managing projects from brief to delivery under tight deadlines',
      'Comfortable working under pressure and adapting to change',
    ],
    predictions: {
      pass_probation: 62,
      top_performer: 26,
      churn_risk: 34,
      underperformance_risk: 38,
      _panels: makePanelPredictionVariants('Sales Executive', { tone: 'mixed' }),
      _verification: makePredictionsVerification('Sales Executive', 'employer_permanent'),
    },
    execution_reliability: 81,
    training_potential: 79,
    training_potential_narrative: 'Self-aware about her negotiation gap and explicitly asked clarifying questions during Scenario 3. High developability if paired with a structured coaching cadence in the first 60 days.',
  },

  /* ── James O'Brien, 35, High ── */
  'demo-c4': {
    overall_score: 35,
    risk_level: 'High',
    percentile: 'Bottom 22%',
    pressure_fit_score: 32,
    pass_probability: 30,
    candidate_type: "Confident Talker who Avoids Accountability|Presents well initially but consistently deflects responsibility when things go wrong.",
    confidence_level: 'Low',
    trajectory: 'Declining',
    seniority_fit_score: 28,
    risk_reason: 'Multiple integrity signals including extremely fast response times on two scenarios and highly generic language suggesting minimal genuine engagement. Core sales competencies are significantly below the required standard across all four assessed dimensions. Overall score of 35 represents a high probability of probation failure.',
    ai_summary: `James O'Brien's assessment results do not support progression for the Sales Executive role. The combination of authenticity concerns, below-benchmark skill scores across all four dimensions, and very low pressure-fit performance creates a high risk of probation failure if hired. This recommendation is based on the assessment evidence alone and should be considered alongside any other information gathered during the recruitment process.

The integrity analysis identified two scenarios (Scenarios 1 and 3) where response times were unusually low , 71 seconds and 84 seconds respectively, for scenarios with a minimum complexity warranting three to five minutes. The language used across all four responses was notably generic, relying on stock phrases like "customer-centric approach" and "pipeline hygiene" without the specific context, named examples, or decision-making logic that characterises genuine sales experience. This pattern is consistent with responses that were generated or heavily assisted rather than written from experience.

On the substance of his responses, the fundamental sales competencies assessed , objection handling, value-based selling, and pipeline discipline , were all below the threshold for this role. His approach to closing was entirely passive ("I\'d leave the ball in their court and wait for them to come back"), and his negotiation response showed a consistent pattern of immediate price concession as the first response to resistance: "I\'d probably look at what we could do on the price to make it work for them." This is a significant commercial risk that will compress margins on every deal.

The pressure-fit scores are the lowest we have observed in this role type. All four dimensions , decision speed, composure under conflict, prioritisation, and ownership , are below 40. In the conflict scenarios, James consistently chose to defer, reflect, and circle back rather than addressing the challenge directly. This pattern of avoidance, combined with the commercial risk of immediate price concession, creates a profile that is unlikely to succeed in a competitive sales environment.

Not recommended at this stage. The evidence across all four scenarios consistently indicates a candidate who is either not ready for this role level or whose responses do not accurately represent their capabilities. If the panel wishes to proceed, the interview questions below are designed specifically to probe whether genuine sales experience exists beneath the surface-level responses observed here. A structured work trial or sales simulation prior to offer would be strongly recommended.`,
    integrity: {
      response_quality: 'Possibly AI-Assisted',
      quality_notes: 'Two of four responses were completed in under 90 seconds , atypically fast for scenario complexity. Language patterns are generic and lack the specific examples, proper nouns, and personal voice typically associated with genuine experience. Internal inconsistency between Scenario 2 and Scenario 4 on stated values.',
      consistency_rating: 'Low',
      consistency_notes: 'Significant inconsistency between Scenario 1 and Scenario 3 on the same type of stakeholder challenge. Values described in Scenario 2 contradict behaviours described in Scenario 4.',
      time_analysis: 'Scenario 1 (1m 11s): Rushed , significantly under the 3-5 minute minimum for this scenario complexity. Responses at this speed are unlikely to reflect genuine deliberation. Scenario 2 (4m 3s): Normal. Scenario 3 (1m 24s): Rushed , second scenario completed in under 90 seconds. Scenario 4 (1m 52s): Fast , below expected engagement time.',
      red_flags: [
        'Scenario 1 completed in 71 seconds (complexity warranted 3-5 minutes minimum)',
        'Scenario 3 completed in 84 seconds',
        'Heavy use of buzzword-heavy language without specific examples to support claims',
        'Internal inconsistency between stated values in Scenario 2 and decisions made in Scenario 4',
      ],
    },
    pressure_fit: {
      decision_speed_quality: {
        score: 36,
        verdict: 'Concern',
        narrative: 'James\'s responses to ambiguous decision scenarios were surface-level and did not demonstrate genuine decision-making logic. Decisions were stated without supporting reasoning , he described what he would do without explaining why, which is the critical differentiator between a considered decision and a guessed one. In Scenario 1, he wrote "I\'d prioritise the highest-value accounts first" without identifying which accounts those were, what made them high-value, or what he would do with lower-value accounts in the meantime. This absence of reasoning is consistent with responses that were generated quickly rather than considered carefully , a pattern reinforced by the sub-90-second response time on this scenario. Decisive sales professionals justify their decisions with evidence and context; James provided neither. In their first 90 days, this suggests they will likely struggle to make confident, defensible decisions in novel or high-pressure situations and may over-rely on manager direction to resolve ambiguity.',
      },
      composure_under_conflict: {
        score: 30,
        verdict: 'Concern',
        narrative: 'James consistently avoided the core challenge in both conflict scenarios rather than engaging with it directly. In Scenario 3, when a prospect directly challenged his pricing and value proposition, he wrote: "I\'d probably take some time to reflect on the feedback and come back with a revised proposal , I don\'t want to push back in the moment." This is a textbook avoidance response and represents the single largest risk in a Sales Executive role. Effective salespeople address objections in the moment, not in a follow-up email. The pattern of "reflect and circle back" appeared in two of four scenarios, which suggests it is a habitual response to conflict rather than a situational one. In Scenario 2, he similarly proposed to "take the feedback on board and come back with a plan" rather than addressing the concern directly. In their first 90 days, this suggests they will likely avoid difficult prospect conversations, extend deal cycles through deferred conflict, and require significant coaching before they can handle a sophisticated buyer directly.',
      },
      prioritisation_under_load: {
        score: 34,
        verdict: 'Concern',
        narrative: 'James\'s response to the multi-demand prioritisation scenario used generic framework language ("urgent versus important matrix") without applying it to the specific situation presented. He named the framework but made no concrete prioritisation decisions within the scenario , he did not identify which of the named tasks were urgent, which were important, or what order he would address them in. This is a meaningful gap: the ability to name a framework is not the same as the ability to use it. When asked directly to rank the competing demands, his response was: "I\'d work through them systematically to make sure nothing was missed." This tells us nothing about the actual prioritisation logic he would apply. In their first 90 days, this suggests they will likely manage a small, simple workload adequately but will struggle significantly when competing demands arise or when they need to make explicit trade-offs about where to spend their time.',
      },
      ownership_accountability: {
        score: 28,
        verdict: 'Concern',
        narrative: 'Multiple instances of passive language and external attribution appeared across James\'s responses. Two notable examples: "The deal fell through due to market conditions" appeared in Scenario 2 without any acknowledgement of what he might have done differently. "The team wasn\'t aligned" was cited as the reason for a missed target in Scenario 4, again without any personal accountability. In high-performing salespeople, attribution for losses is almost always directed inward , they focus on what they could have done at qualification, discovery, or objection-handling to change the outcome. James\'s pattern of external attribution suggests either a lack of self-awareness or a lack of genuine sales experience to draw on. In combination with the other concerns, this reinforces the integrity flag rather than resolving it. In their first 90 days, this suggests they will likely struggle to self-diagnose and improve their technique independently, requiring intensive manager oversight to identify performance issues before they compound.',
      },
    },
    scores: {
      'Commercial Thinking': 32,
      'Stakeholder Management': 44,
      'Persistence': 28,
      'Communication': 40,
      'Adaptability': 35,
      'Decision Making Under Pressure': 30,
    },
    scoring_confidence: {
      level: 'low',
      reason: 'Two scenarios under 90 seconds. High generic-language score (78) with multiple flags. Confidence forced to LOW.',
      confidence_reason: 'Two scenarios completed in under 90 seconds; high generic-language score with multiple flags including inconsistent style. Recommend a supervisor sign-off and a tight first-week check-in to limit no-show and SSP exposure on this assignment.',
      confidence_reason_variants: {
        agency_permanent:  'Two scenarios completed in under 90 seconds; high generic-language score with multiple flags including inconsistent style. Recommend additional verification before submitting to client to protect against rebate exposure and protect the fee.',
        agency_temporary:  'Two scenarios completed in under 90 seconds; high generic-language score with multiple flags including inconsistent style. Recommend a supervisor sign-off and a tight first-week check-in to limit no-show and SSP exposure on this assignment.',
        employer_permanent:'Two scenarios completed in under 90 seconds; high generic-language score with multiple flags including inconsistent style. Recommend documented verification at interview to protect against probation challenge under ERA 2025; capture the reasoning in the hiring file.',
        employer_temporary:'Two scenarios completed in under 90 seconds; high generic-language score with multiple flags including inconsistent style. Recommend the line manager cover the first week directly to manage assignment delivery risk.',
      },
    },
    generic_detection: {
      score: 78,
      flags: ['vague_language', 'buzzword_heavy', 'inconsistent_style', 'missing_concrete_actions'],
      evidence_per_flag: {
        vague_language: "I'd prioritise the highest-value accounts first ... I'd work through them systematically to make sure nothing was missed.",
        buzzword_heavy: 'Stock phrases like "customer-centric approach" and "pipeline hygiene" appeared without specific examples, named clients, or decision logic to support them.',
        inconsistent_style: "Scenario 1 (1m 11s) read as terse and rushed / Scenario 2 (4m 3s) was structured and articulate. The two were almost certainly produced under different conditions.",
        missing_concrete_actions: "When asked to rank competing demands he wrote 'I'd work through them systematically' without naming a single task, owner, or order.",
      },
    },
    score_narratives: {
      'Commercial Thinking': 'Significantly below threshold. Immediate price concession was his first response to objection in Scenario 3 ("I would probably look at what we could do on the price to make it work for them"), with no attempt to diagnose whether price was the real concern or a proxy for value, urgency, or competitive pressure. This pattern, if it reflects real behaviour, will compress deal margins on every negotiation.',
      'Stakeholder Management': 'The strongest area, though still below threshold. Some evidence of attempting to understand client needs, but communication is generic and lacks the personalisation expected at Sales Executive level. Responses used customer-centric language without the specific examples or named contexts that indicate genuine client experience.',
      'Persistence': 'The biggest single concern. James consistently avoided the core challenge in conflict scenarios rather than engaging with it directly. The pattern of "reflect and circle back" appeared in two of four scenarios, which suggests it is a habitual response to conflict rather than a situational one. In sales, persistence under rejection is the first behaviour high-performers develop; its absence here is the strongest individual signal in the assessment.',
      'Communication': 'Generic at every level. Stock phrases ("customer-centric approach", "pipeline hygiene") replaced specifics; written follow-up examples were templated rather than prospect-aware; closing language was entirely non-committal ("I would leave the ball in their court and wait for them to come back") and would extend deal cycles significantly.',
      'Adaptability': 'Used framework language without applying it. Named the urgent-versus-important matrix in the prioritisation scenario but did not actually rank the named tasks against it. In a different scenario, he proposed the same generic framework with no adjustment for the new context. Adaptability requires reframing under new conditions; James produced the same template each time.',
      'Decision Making Under Pressure': 'Avoidance-led across the board. "I would probably take some time to reflect on the feedback and come back with a revised proposal, I do not want to push back in the moment." This is a textbook avoidance response and represents the single largest risk in a Sales Executive role. Effective salespeople address objections in the moment, not in a follow-up email.',
    },
    strengths: [
      {
        strength: 'Awareness of customer-first language and selling philosophy',
        explanation: 'James consistently frames responses using customer-centric language, suggesting an understanding of the expected selling philosophy even if the execution evidence is limited.',
        evidence: 'I always start by understanding what the client actually needs before presenting anything , the solution has to match their situation.',
      },
    ],
    watchouts: [
      {
        watchout: 'Possible AI-assisted responses , integrity concern',
        severity: 'High',
        explanation: 'Two scenarios completed significantly faster than the established baseline for genuine responses. Combined with generic, buzzword-heavy language lacking personal examples and internal inconsistency between scenarios, there is a meaningful concern about response authenticity.',
        evidence: null,
        action: 'If progressing to interview, open with a request for a specific deal story: "Tell me about the last deal you closed , walk me through every stage from first contact to signature." Probe for names, dates, and specifics that would be impossible to fabricate.',
        ...makeWatchoutVerification({
          agency_permanent: {
            q: 'The assessment integrity flagged possible AI-assisted answers. We cannot send you to the client without testing this. Walk us through the last deal you personally closed: prospect name, dates, every stage, and the words you used at the close.',
            strong: ['Names dates, prospects, and amounts unprompted', 'Story is internally consistent across stages', 'Specific words used in objection-handling moments', 'Volunteers what nearly went wrong'],
            weak: ['Generic, buzzword-heavy answer', 'No specific names or dates', 'Story changes between phases', 'Uses textbook frameworks rather than lived detail'],
            probe: 'What was the prospect\'s exact pushback, and what did you say in the next sentence?',
          },
          agency_temporary: {
            q: 'Before we put you on assignment, we need to see authenticity. Tell me about the last sales call you actually ran on a temp assignment, the prospect, and the exact moment the call turned.',
            strong: ['Names assignment, prospect, and date', 'Specific call moment with quoted words', 'Confirms what the on-site manager observed', 'Volunteers detail without prompting'],
            weak: ['Cannot name a specific assignment', 'Defaults to generic "I always do X" answers', 'No on-site manager would corroborate', 'Detail evaporates under follow-up'],
            probe: 'When was your last assignment, where, and who was the on-site contact?',
          },
          employer_permanent: {
            q: 'We document this for ERA 2025 because the assessment integrity check is unresolved. Tell me about the last deal you closed yourself, with prospect names, dates, the objection that came up, and the exact words you used.',
            strong: ['Specific, verifiable detail throughout', 'Story holds up under repeated probing', 'Volunteers the bits that did not go well', 'References named colleagues who could corroborate'],
            weak: ['Story drifts under follow-up', 'No verifiable specifics', 'Names sound invented', 'Defaults to abstract methodology'],
            probe: 'Who at your previous employer would I call to confirm the deal you just described?',
          },
          employer_temporary: {
            q: 'For this assignment we need confidence the work is yours. Tell me about the last assignment you ran live, the on-site contact, and what they said about you at the end.',
            strong: ['Specific assignment, dates, on-site contact', 'Story consistent under follow-up probes', 'On-site contact would corroborate', 'Volunteers a moment that nearly went wrong'],
            weak: ['No specific assignment named', 'Story shifts when probed', 'Cannot describe the on-site sign-off', 'Detail dries up after the first answer'],
            probe: 'If I called the on-site contact tomorrow, what would they say about your last week on assignment?',
          },
        }, 'employer_temporary'),
      },
      {
        watchout: 'Immediate price concession under objection pressure',
        severity: 'High',
        explanation: 'In the negotiation scenario, James\'s first response to a pricing challenge was to offer a discount. This pattern , if it reflects real behaviour , creates significant commercial risk and will compress margins on every deal.',
        evidence: 'I\'d probably look at what we could do on the price to make it work for them , there\'s usually some flexibility if the deal is important enough.',
        action: 'If hired, set a strict commercial policy requiring manager approval for any discount over 5%. Monitor deal margin in the first 90 days closely and review every discounted deal in pipeline reviews.',
        ...makeWatchoutVerification({
          agency_permanent: {
            q: 'The report shows price concession as the first response to objection. We need to verify that pattern before we send you to the client. Tell us about a deal where the prospect pushed on price and you held the line. What did you actually say?',
            strong: ['Held margin in a real deal', 'Diagnosed the concern before responding', 'Specific deal and quoted exchange', 'Confirms client was happy at the end'],
            weak: ['Defaults to discount language', 'Cannot describe holding the line', 'Story always ends with a margin compromise', 'No diagnostic step'],
            probe: 'What was the smallest concession that has unblocked a deal for you, and what did you get back for it?',
          },
          agency_temporary: {
            q: 'On a sales assignment, every discount you give is the agency\'s margin and the client\'s. Tell us about an assignment where price pressure came up and you handled it without dropping the price.',
            strong: ['Specific assignment and prospect interaction', 'No discount given', 'Confirmed by the on-site contact', 'Reframed the value live'],
            weak: ['Discounted on assignment without sign-off', 'Cannot describe a no-discount close', 'Required the senior to step in', 'Defaults to "what can we do?" framing'],
            probe: 'If a prospect on assignment said "match the competitor or we are out", what is your default first sentence?',
          },
          employer_permanent: {
            q: 'We are documenting this for the probation file. Tell me about a deal where you held price under direct pressure, the words you used, and what your sales manager said about it afterwards.',
            strong: ['Specific deal, specific words, named manager', 'Held margin under pressure', 'Manager corroborated the discipline', 'Owns where the close was harder than expected'],
            weak: ['Cannot name a held-line deal', 'Manager would not confirm the story', 'Discount is always the first move', 'Story has no quoted words'],
            probe: 'If you arrived in week six and a prospect demanded 15%, what is your decision tree before you say anything?',
          },
          employer_temporary: {
            q: 'For this assignment, discounts have to come from the on-site manager, not from you. Tell me about a recent assignment where price pressure came up and how you handled it without compromising the deal.',
            strong: ['Held the price live', 'Looped on-site manager only when truly needed', 'Specific assignment and prospect described', 'No supervision uplift required'],
            weak: ['Granted price moves without authority', 'Required constant supervisor intervention', 'Cannot describe the moment of pressure', 'Story includes an unauthorised discount'],
            probe: 'Who has the authority to grant a discount on this assignment, and what would you say while you waited for the answer?',
          },
        }, 'employer_temporary'),
      },
      {
        watchout: 'Passive avoidance of conflict and difficult conversations',
        severity: 'Medium',
        explanation: 'Pattern of deferring, reflecting, and circling back rather than addressing challenges directly. In a sales role, the ability to have difficult conversations in the moment is non-negotiable.',
        evidence: 'I\'d probably take some time to reflect on the feedback and come back with a revised proposal , I don\'t want to push back in the moment.',
        action: 'Not suitable for roles requiring significant prospecting, negotiation, or stakeholder challenge without intensive coaching. If hired, pair with a structured escalation protocol for all objection-handling situations.',
        ...makeWatchoutVerification({
          agency_permanent: {
            q: 'The report shows a tendency to defer rather than address challenges live. We need to know how you actually behave in the room because reflecting and circling back is not how you protect a deal. Tell us about a difficult prospect conversation you handled live.',
            strong: ['Handled the difficult moment live', 'Specific exchange and outcome', 'No deferral or circling back', 'Owns the moment of pressure'],
            weak: ['Default response is "let me think and come back"', 'Cannot describe a live confrontation', 'Stories always involve a pause', 'Pushback is always handled in writing'],
            probe: 'When a prospect challenges your proposal in front of three of their colleagues, what is your default first response?',
          },
          agency_temporary: {
            q: 'On assignment, you cannot reflect overnight. Tell us about a temp assignment where the prospect pushed back hard and you handled it inside the same call.',
            strong: ['Live handling on assignment', 'No deferral to the on-site manager', 'Specific call and outcome', 'Confirmed by the supervisor on the day'],
            weak: ['Always asked for time to reflect', 'Required supervisor to intervene', 'Cannot describe a live confrontation', 'Story is always "I came back the next day"'],
            probe: 'If the prospect on assignment said "this proposal is wrong", what is your first sentence?',
          },
          employer_permanent: {
            q: 'For ERA 2025 we need this answer documented. Tell me about a difficult sales conversation you handled in the room, the exact words you used, and what your manager would say about how you handled it.',
            strong: ['Specific live conversation with quoted words', 'Owns the discomfort, not just the outcome', 'Manager would corroborate', 'Reflects on what they would do differently'],
            weak: ['No quoted exchange', 'Conversations always handled by email afterwards', 'Manager unlikely to recall the moment', 'Defends pause-and-reflect as best practice'],
            probe: 'If a prospect tells you in week six "your product is not what we need", what do you say next?',
          },
          employer_temporary: {
            q: 'On this assignment, hard conversations have to be handled live. Tell me about a recent assignment where you ran a tough conversation in real time without escalating to the on-site manager.',
            strong: ['Live handling on assignment', 'No reliance on supervisor in the moment', 'Specific exchange named', 'Worked within the assignment timeframe'],
            weak: ['Always escalated tough talks', 'Required supervisor in the room', 'Cannot describe a live moment', 'Defaults to "I would email a follow-up"'],
            probe: 'When the on-site manager is unavailable, what is your default approach to a prospect pushback?',
          },
        }, 'employer_temporary'),
      },
    ],
    onboarding_plan: [
      {
        week: 1,
        title: 'Supervised Shadow-Only Status',
        objective: 'Establish whether James\'s assessed capabilities reflect genuine gaps or a mismatch between his experience and the assessment format, before any independent client contact is permitted.',
        activities: [
          'Shadow-only status for all client interactions , James observes every call, meeting, and email exchange but does not participate. He should take detailed notes on objection-handling, closing language, and pipeline conversations.',
          'Structured observation debrief with the sales manager after each shadowed call: what did he notice, what would he have done differently, and what questions does he have? His ability to learn from observation is diagnostic.',
          'Structured interview with the sales manager (not a performance review , a diagnostic conversation): walk through a specific deal from his CV in detail. Probe for names, dates, and decisions. This will clarify whether the integrity concerns from the assessment are founded.',
        ],
        checkpoint: 'Sales manager can confirm whether James\'s knowledge and reasoning in the diagnostic conversation matches what his CV and the assessment suggest. Decision to proceed or not is made at the end of week one.',
        involves: ['Line manager', 'Sales manager', 'HR , ERA 2025 probationary terms confirmed on day one'],
        notes: 'ERA 2025 day-one rights must be communicated immediately. Given the assessment concerns, it is recommended that the probation terms explicitly include specific performance milestones with clear pass/fail criteria from the outset.',
      },
      {
        week: 2,
        title: 'Sales Fundamentals Programme',
        objective: 'Assess whether core sales competencies can be developed through structured training, and determine whether continued investment is appropriate.',
        activities: [
          'Structured sales fundamentals training programme covering value-based selling, objection-handling frameworks (specifically LAER), and pipeline stage discipline. This is not product training , it is selling methodology.',
          'Role-play sessions with the sales manager on pricing objections specifically. James must demonstrate that he can acknowledge before responding and can avoid an immediate discount offer. Assess receptivity to coaching.',
          'Written reflection at end of week: what has James learned this week that changes how he would approach the scenarios from the assessment? This tests self-awareness and learning capacity.',
        ],
        checkpoint: 'In a role-play assessed by the sales manager, James can handle a pricing objection without immediately offering a discount. The sales manager confirms positive receptivity to coaching feedback.',
        involves: ['Sales manager', 'Line manager'],
        notes: 'N/A',
      },
      {
        week: 3,
        title: 'Role-Play Assessment and Competency Decision Point',
        objective: 'Conduct a formal role-play assessment to determine whether core sales competencies are present but underdeveloped, or absent , this determines whether continued investment is justified.',
        activities: [
          'Formal role-play assessment covering all four scenarios from the original assessment: discovery, objection handling, pipeline prioritisation, and closing. The sales manager scores each dimension against agreed criteria.',
          'Assessment debrief: the sales manager shares the role-play scores with James and the line manager. A clear decision must be made: is the trajectory sufficient to justify continued investment in this hire?',
          'If continuing: agree specific, measurable week four targets. If not continuing: initiate the performance improvement or exit process in accordance with ERA 2025 probationary terms.',
        ],
        checkpoint: 'Formal role-play assessment completed and scored. Decision documented in writing by the sales manager and line manager. Either a clear development path or an exit process is initiated by end of week three.',
        involves: ['Sales manager', 'Line manager', 'HR'],
        notes: 'Under ERA 2025, probationary dismissal must follow a fair process even in the first two years of employment. Document all assessments, provide clear feedback, and ensure James has been given a genuine opportunity to demonstrate improvement before any exit decision.',
      },
      {
        week: 4,
        title: 'Formal 30-Day Probationary Review',
        objective: 'Complete the formal 30-day probationary review and set clear, measurable pass/fail criteria for the remainder of the probation period.',
        activities: [
          'Formal 30-day review with the line manager and HR present. Review: diagnostic conversation findings from week one, training programme completion from week two, role-play assessment results from week three.',
          'Set specific 60-day pass/fail criteria: these must be observable, measurable behaviours (can handle a pricing objection without discounting, can manage a pipeline of 10 accounts systematically, can close a trial commitment). These criteria should be shared with James in writing.',
          'Assign James his first supervised pipeline , no solo client contact yet, but he begins managing a set of accounts under the direct supervision of the sales manager, who reviews every communication before it is sent.',
        ],
        checkpoint: 'Formal 30-day review is documented and signed by James, the line manager, and HR. 60-day pass/fail criteria are in writing and agreed.',
        involves: ['Line manager', 'Sales manager', 'HR , ERA 2025 probationary review'],
        notes: 'ERA 2025 requires that probationary reviews are documented and that the employee is given a fair opportunity to respond to any concerns raised. Ensure James has the opportunity to provide his own assessment of his progress before the meeting concludes.',
      },
      {
        week: 5,
        title: 'First Supervised Client Contact',
        objective: 'Assess whether James can apply the skills developed in weeks two to four in a live client context, under direct supervision.',
        activities: [
          'First solo client calls , discovery calls only. The sales manager listens in to every call and provides immediate, specific feedback after each one. No pitching or objection handling in this phase.',
          'Weekly pipeline review: James reviews his supervised pipeline with the sales manager, who assesses whether his deal reasoning matches the stage criteria established in week four.',
          'Call recording review: James listens to his own calls and self-assesses against the criteria established in the role-play assessment. Compare self-assessment accuracy to sales manager assessment.',
        ],
        checkpoint: 'Sales manager confirms that James\'s discovery calls demonstrate genuine customer curiosity and appropriate questioning. Pipeline reasoning in weekly review is consistent with agreed stage criteria.',
        involves: ['Sales manager', 'Line manager'],
        notes: 'N/A',
      },
      {
        week: 6,
        title: '60-Day Probationary Assessment',
        objective: 'Conduct a formal 60-day assessment against the pass/fail criteria agreed in week four and make a documented decision about the hire\'s future in the role.',
        activities: [
          'Formal 60-day assessment meeting with the line manager, sales manager, and HR. Review progress against every criterion agreed in the week four review. Evidence must be specific and documented.',
          'James presents his own case for why he should continue in the role: what has he improved, what evidence can he provide, and what does he commit to in the next 30 days?',
          'Decision and documentation: if criteria are met, set 90-day targets and continue. If criteria are not met, initiate the appropriate exit or extension process under ERA 2025.',
        ],
        checkpoint: 'Formal 60-day assessment is documented. A clear, evidence-based decision has been made about James\'s future in the role. Both pass and exit pathways are fully documented.',
        involves: ['Line manager', 'Sales manager', 'HR , ERA 2025 extended probation or exit process'],
        notes: 'ERA 2025 permits probationary periods to be extended once by written agreement if the employer can demonstrate that a fair assessment has not yet been possible. If extending, this must be agreed in writing before the original probation period expires.',
      },
    ],
    interview_questions: [
      'Walk me through the last deal you closed. What was the value, how long did it take, and what were the main objections you overcame? (Follow-up probe: What exactly did you say when the prospect pushed back on price?)',
      'A prospect objects to your pricing in the first call. What do you say before you consider offering any discount? (Follow-up probe: Word for word: a prospect opens with "your price is too high." What do you say next?)',
      'You\'re on a live call and a prospect challenges you with something you weren\'t expecting. How do you handle it in the moment? (Follow-up probe: Give me a specific example of a tough objection you handled well on the spot.)',
      'How do you manage a pipeline of 20 accounts? What do you look at every week and how do you know which deals are real? (Follow-up probe: What\'s your personal rule for when a deal is no longer worth pursuing?)',
    ],
    cv_comparison: [
      'Strong team player with excellent communication and interpersonal skills',
      'Resilient and results-focused with a proactive attitude',
      'Experience in fast-paced sales environments with a track record of hitting targets',
    ],
    predictions: {
      pass_probation: 27,
      top_performer: 6,
      churn_risk: 65,
      underperformance_risk: 74,
      _panels: makePanelPredictionVariants('Sales Executive', { tone: 'weak' }),
      _verification: makePredictionsVerification('Sales Executive', 'employer_temporary'),
    },
    execution_reliability: 58,
  },

  /* ── Elena Rodriguez, 85, Low ── */
  'demo-c5': {
    overall_score: 85,
    risk_level: 'Low',
    percentile: 'Top 12%',
    pressure_fit_score: 82,
    pass_probability: 88,
    candidate_type: 'Independent Problem Solver with Strong Ownership|Takes full responsibility for outcomes and works effectively without close supervision.',
    confidence_level: 'High',
    trajectory: 'Improving',
    seniority_fit_score: 80,
    risk_reason: 'Strong across all assessed dimensions with genuine technical maturity. Minor watch-out around translating technical blockers into business-impact language for non-technical stakeholders , easily addressed with explicit onboarding focus in the first 30 days.',
    ai_summary: `Elena Rodriguez is a strong Software Developer candidate who performed well across all assessed dimensions. Her responses demonstrate genuine technical maturity , not just in problem-solving, but in the way she approaches ambiguity, communicates with stakeholders, and takes ownership of delivery quality. She writes with clarity and specificity, and every response includes concrete reasoning rather than abstract principles.

Her most impressive response was in the production incident scenario (Scenario 1), where she correctly prioritised understanding the scope of the incident over immediately attempting a fix. She wrote: "Before touching anything, I\'d want to know: is this isolated to one service, or is it propagating? I\'d check the dependency graph and recent deployment history before I even considered a rollback." This is a hallmark of experienced engineers who have been burned by premature solutions, and it is a response that is very difficult to generate convincingly without direct incident experience. She also proactively identified who needed to be kept informed and at what cadence, without being prompted.

On collaboration, Elena showed a balance of technical conviction and interpersonal intelligence. In Scenario 3, she pushed back constructively on a technically unsound suggestion from a product manager, writing: "I\'d tell them I understand why that approach seems appealing, and I can see what they\'re trying to solve , but there\'s a reliability risk I\'d want us to address first. Can we spend twenty minutes walking through it together?" This response demonstrates that she can hold a technical position without making it adversarial , a key differentiator for developers working in cross-functional environments.

The main development area is translating technical blockers into business-impact language for non-technical stakeholders. In Scenario 4, her explanation of a database constraint used accurate technical language that assumed significant domain knowledge in the audience. This is a correctable pattern, and her self-awareness and learning orientation suggest she will respond well to direct coaching.

Strong hire. Elena is likely to make a visible impact within the first 60 days and is a credible candidate for senior developer or tech lead progression within 12 to 18 months. The technical communication gap is minor and easily addressed with an explicit focus in the onboarding plan. Pair her with a product manager who will provide direct feedback on communication clarity from day one.`,
    integrity: {
      response_quality: 'Genuine',
      quality_notes: 'All four responses are detailed, specific, and technically accurate. Elena includes concrete examples with plausible system names, error patterns, and decision logic that would be difficult to construct without genuine engineering experience. No integrity concerns.',
      consistency_rating: 'High',
      consistency_notes: 'Values and decision-making patterns are highly consistent across all four scenarios. Approach to ambiguity, stakeholder communication, and technical trade-offs is uniform throughout.',
      time_analysis: 'Scenario 1 (6m 28s): Normal. Scenario 2 (5m 42s): Normal. Scenario 3 (6m 55s): Normal. Scenario 4 (6m 7s): Normal. All response times indicate deliberate, considered engagement with each scenario.',
      red_flags: [],
    },
    pressure_fit: {
      decision_speed_quality: {
        score: 84,
        verdict: 'Strength',
        narrative: 'In high-stakes scenarios, Elena follows a clear mental model: scope first, identify options second, commit third. She is not reckless , she gathers just enough information to make a defensible decision , but she is not a deliberator who requires complete certainty before acting. In the production incident scenario, she committed to a rollback decision within the scenario timeframe rather than escalating indefinitely or waiting for more data. She wrote: "Once I\'ve confirmed the deployment is the likely cause, I\'m not going to wait for a 100% certainty , the cost of being wrong about the rollback is lower than the cost of every additional minute of downtime." This risk-adjusted thinking under pressure is a strong signal of senior engineering maturity. In their first 90 days, this suggests they will likely make timely, defensible decisions during incidents and technical uncertainties, and will document their reasoning in a way that builds team confidence rather than creating anxiety.',
      },
      composure_under_conflict: {
        score: 82,
        verdict: 'Strength',
        narrative: 'Elena handled the disagreement with a product stakeholder in Scenario 3 with composure and exceptionally clear reasoning. She did not become defensive, dismiss the product manager\'s intent, or capitulate to avoid conflict. Instead, she reframed the conversation around the shared goal , shipping a reliable feature , and proposed a specific, time-bounded next step ("Can we spend twenty minutes walking through it together?"). This is a sophisticated conflict resolution approach that most developers do not demonstrate until they are operating at senior level. The clarity and firmness of her response ("there\'s a reliability risk I\'d want us to address first") was paired with empathy for the product manager\'s perspective, which is exactly the balance that makes technical disagreements productive rather than damaging. In their first 90 days, this suggests they will likely build strong working relationships across engineering, product, and design, and will handle technical disagreements in a way that increases rather than decreases cross-functional trust.',
      },
      prioritisation_under_load: {
        score: 83,
        verdict: 'Strength',
        narrative: 'Elena\'s approach to multi-priority scenarios is explicit, structured, and explicitly communicated. In Scenario 2, she named the criteria she used to sequence work: user impact (how many people are affected), reversibility (can this be undone easily?), and dependencies (does anything else block on this?). She also acknowledged that prioritisation decisions need to be communicated, not just made: "I\'d tell the team what I\'m not doing this sprint and why, so they can flag if I\'ve missed something." This level of transparency is unusual but highly effective in practice , it prevents silent priority conflicts and builds team trust. She also explicitly delegated one item to a colleague rather than attempting to own everything, which is a sign of someone who understands leverage. In their first 90 days, this suggests they will likely establish clear, transparent prioritisation norms on their team quickly and will communicate trade-offs in a way that prevents the confusion that often accompanies new hires managing competing demands.',
      },
      ownership_accountability: {
        score: 80,
        verdict: 'Strength',
        narrative: 'Elena\'s language patterns throughout were consistently first-person and active. When describing a past technical failure in Scenario 4, she wrote: "I pushed the change without adequate test coverage, the incident caught it, and I changed my review process as a result." There is no external attribution , the failure is owned, the lesson is extracted, and the behavioural change is named. This approach to past failures as data rather than as events to explain away is a reliable predictor of high performance over time. She did not dwell on the failure or over-qualify it, suggesting a psychologically grounded relationship with accountability. She also framed accountability prospectively in her responses , articulating what she would monitor and how she would know if something was going wrong before it became a problem. In their first 90 days, this suggests they will likely own their mistakes transparently and course-correct quickly, setting a strong accountability norm for the immediate team around them.',
      },
    },
    scores: {
      'Technical Judgement': 88,
      'Problem Solving': 88,
      'Communication': 80,
      'Documentation': 84,
      'Adaptability': 82,
      'Attention to Detail': 87,
    },
    generic_detection: {
      score: 14,
      flags: [],
      evidence_per_flag: {},
    },
    scoring_confidence: {
      level: 'high',
      reason: 'Strong technical response depth, consistent style, no integrity flags. Generic-language score of 14.',
      confidence_reason: 'Detailed role context provided, strong technical response depth, no integrity flags. Low risk of probation failure under ERA 2025 protections; the assessment forms a defensible record for the line manager.',
      confidence_reason_variants: {
        agency_permanent:  'Detailed role context provided, strong technical response depth, no integrity flags. Low risk of rebate period dispute or client dissatisfaction; safe to submit to client with the assessment as supporting evidence.',
        agency_temporary:  'Detailed role context provided, strong technical response depth, no integrity flags. Low risk of no-show or assignment friction; SSP exposure looks manageable across the first week.',
        employer_permanent:'Detailed role context provided, strong technical response depth, no integrity flags. Low risk of probation failure under ERA 2025 protections; the assessment forms a defensible record for the line manager.',
        employer_temporary:'Detailed role context provided, strong technical response depth, no integrity flags. Low supervision overhead expected; immediate productivity should be in line with the brief.',
      },
    },
    score_narratives: {
      'Technical Judgement': 'Names the trade-offs explicitly when proposing a design. In the architecture scenario she ruled out the sharded-cache approach with specific reasons (operational cost, debug complexity at incident time) rather than just preferring the simpler option. Where peers proposed approaches she disagreed with, she said so on review with evidence rather than deferring.',
      'Problem Solving': 'Strong systematic approach to debugging and root-cause analysis. In the incident scenario, she correctly identified that the monitoring gap was a second-order problem to solve after the immediate issue was resolved, good prioritisation under pressure. Her diagnostic reasoning was explicit and followed a logical sequence.',
      'Communication': 'Communicates technical concepts clearly to technical peers. Main development area is translating technical issues into business-impact language for non-technical stakeholders, her Scenario 4 response assumed too much technical context in the audience. With explicit coaching, this is quickly addressable.',
      'Documentation': 'Treats post-incident notes and architecture decisions as default outputs of the work, not optional extras. Her Scenario 4 write-up included a one-page decision log naming the alternatives considered and why each was rejected, a sign she has been burned before by knowledge walking out the door.',
      'Adaptability': 'Picked up the unfamiliar service in the scenario and contributed useful diagnostic work without complaining about the change in stack. When the brief shifted mid-scenario, she adjusted approach rather than defending the original plan. No nostalgia for "how my last team did it".',
      'Attention to Detail': 'Shows genuine respect for code review as a craft discipline rather than a gatekeeping process. Her response to the "untested code" scenario was firm on standards but empathetic in approach. Caught the off-by-one and the missing rollback path on the design before either reached a PR.',
    },
    strengths: [
      {
        strength: 'Incident response instinct: scope before acting',
        explanation: 'Under production pressure, Elena\'s first instinct is to understand the scope of the problem before attempting a fix. This reduces the risk of making an incident worse and is a hallmark of engineers with real incident experience.',
        evidence: 'Before touching anything, I\'d want to know: is this isolated to one service, or is it propagating? I\'d check the dependency graph and recent deployment history before I even considered a rollback.',
      },
      {
        strength: 'Technical conviction without technical arrogance',
        explanation: 'She holds technical positions confidently without making disagreements adversarial or dismissive. This makes her effective in cross-functional environments and avoids the friction that can slow product teams down.',
        evidence: 'I\'d tell them I understand why that approach seems appealing, and I can see what they\'re trying to solve , but there\'s a reliability risk I\'d want us to address first. Can we spend twenty minutes walking through it together?',
      },
      {
        strength: 'Proactive stakeholder communication during uncertainty',
        explanation: 'She identified who needed to be informed during the incident scenario without being prompted , including the customer success team and the on-call manager at specific cadences. This is a behaviour that requires real incident experience to demonstrate convincingly.',
        evidence: 'I\'d send a holding message to the customer success team immediately so they have something to tell any affected customers, even if all I can say is that we\'re investigating and have a team on it.',
      },
    ],
    watchouts: [
      {
        watchout: 'Technical communication to non-technical stakeholders assumes too much context',
        severity: 'Low',
        explanation: 'When explaining a technical blocker in Scenario 4, Elena used accurate but highly technical language without translating it into business-impact terms. In practice, this can leave product managers or business stakeholders confused and undermine trust.',
        evidence: 'The issue is that the current architecture doesn\'t support the transaction isolation level we\'d need for this to be consistent , it\'s a fundamental distributed systems constraint.',
        action: 'In onboarding, explicitly discuss the expectation that technical explanations to non-technical stakeholders lead with the business impact ("this will occasionally cause duplicate charges for users") before the technical cause. Pair with a product manager who will give direct, real-time feedback on communication style.',
        ...makeWatchoutVerification({
          agency_permanent: {
            q: 'The report flags technical communication that assumes too much context. Tell us about the last time you explained a complex technical issue to a non-technical product owner. What did you actually say in the first sentence?',
            strong: ['Led with business impact, not the technical cause', 'Specific example with a quoted opening', 'Confirmed the listener understood', 'Reflects on what they would adjust'],
            weak: ['Defaults to architectural language', 'Cannot recall the listener\'s reaction', 'No example of pre-empting confusion', 'Treats translation as the listener\'s problem'],
            probe: 'When the product owner pushes back on a timeline because of a technical concern, what is your default first sentence?',
          },
          agency_temporary: {
            q: 'On a contract assignment, you cannot rely on a long handover to translate concepts. Tell me about an assignment where you had to explain a technical risk to the on-site product manager and how you opened the conversation.',
            strong: ['Specific assignment and product manager named', 'Opened with business impact', 'Worked without a senior engineer interpreter', 'Confirmed comprehension on the call'],
            weak: ['Required a senior engineer to translate', 'Cannot describe the moment of explanation', 'Defaults to acronyms and frameworks', 'No on-site contact would corroborate'],
            probe: 'If the on-site product manager looked confused on day three, what is your follow-up sentence?',
          },
          employer_permanent: {
            q: 'For ERA 2025 we document this. Tell me about the last time a non-technical stakeholder needed a technical decision explained, what you said, and how you would handle it differently in this team.',
            strong: ['Specific example with quoted opening', 'Owns where translation could have been better', 'Pre-empts how they would adjust here', 'Names the stakeholder and the outcome'],
            weak: ['Defends technical-first explanations', 'Cannot describe a stakeholder reaction', 'No reflection on translation', 'Story stays inside engineering vocabulary'],
            probe: 'In the first 30 days here, how would you handle a product manager asking why a feature is delayed?',
          },
          employer_temporary: {
            q: 'On this assignment we do not have a senior engineer to translate for you. Tell me about a contract where you had to explain a technical issue directly to a business stakeholder live and what you led with.',
            strong: ['Worked solo without a translator', 'Opened with the impact, not the cause', 'Confirms business stakeholder understood', 'Specific assignment context'],
            weak: ['Required senior engineer support', 'Translation always handled by someone else', 'Cannot describe a live moment', 'Defaults to deeply technical language'],
            probe: 'What would you say in the first 30 seconds if a non-technical lead asks why a release is held up?',
          },
        }, 'employer_permanent'),
      },
    ],
    onboarding_plan: [
      {
        week: 1,
        title: 'Environment Setup and Architecture Deep-Dive',
        objective: 'Get Elena fully set up, oriented on the codebase architecture, and introduced to the team , she will self-direct effectively here and will arrive with specific, well-formed questions.',
        activities: [
          'Full development environment setup and access provisioning. Elena should have access to all internal docs, the codebase, staging environment, and monitoring tools by end of day one. Assign a named senior engineer as her technical buddy for the week.',
          'Architecture walkthrough with the senior engineer: key services, data flows, deployment pipeline, and known technical debt. Elena should ask questions throughout , her questions in this session are diagnostic data about her level and orientation.',
          'Team introductions and rituals: attend standup, sprint planning, and any relevant design or architecture discussions. Observe only this week , no required contribution, but she should note what she would have said and discuss with her buddy.',
        ],
        checkpoint: 'Can describe the high-level architecture and the key dependencies between services without referring to notes. Has identified at least two questions about the codebase that she will investigate in week two.',
        involves: ['Line manager', 'Senior engineer (buddy)', 'Engineering team', 'HR , ERA 2025 day-one induction'],
        notes: 'ERA 2025 requires all day-one employment rights to be communicated on the first day. Ensure Elena receives her written statement of particulars and any probation documentation before the end of day one.',
      },
      {
        week: 2,
        title: 'First Codebase Contribution',
        objective: 'Elena ships her first real contribution to the codebase , something small but meaningful, with full test coverage. Her delivery focus means she will want to ship something quickly; channel that energy into something with visible impact.',
        activities: [
          'Assign a well-scoped first task , a bug fix or a small feature , that is meaningful but not blocking. The task should touch core parts of the codebase to accelerate her architectural understanding.',
          'Full code review process for her first PR: Elena\'s PR should be reviewed by at least two senior engineers with constructive, detailed feedback. This establishes the team\'s code quality standards from day one.',
          'Pair programming session with her technical buddy on a section of the codebase she finds unfamiliar. This is as much about Elena asking questions as it is about her coding.',
        ],
        checkpoint: 'First PR has been submitted, reviewed, and merged. PR includes adequate test coverage , her buddy confirms this meets the team\'s standard without being reminded. Elena can describe what the merged code does and why it works.',
        involves: ['Line manager', 'Senior engineer (buddy)', 'Code reviewers (x2)'],
        notes: 'CIPD guidance on new hire onboarding recommends that the first deliverable is challenging enough to be meaningful but scoped tightly enough to be completed successfully. Success in week two builds confidence and credibility with the team.',
      },
      {
        week: 3,
        title: 'Cross-Functional Communication Practice',
        objective: 'Address the primary assessed gap , technical communication to non-technical stakeholders , through a structured cross-functional exercise with explicit coaching from the product team.',
        activities: [
          'Attend the cross-functional sprint review and product planning session. Elena should contribute at least one technical update about the work she shipped in week two, written in plain English and reviewed by her buddy before the meeting.',
          'Written technical explanation exercise: Elena writes a plain-English explanation of a technical concept or current technical constraint for a non-technical audience. Her buddy and her product manager both review it and provide separate feedback.',
          'Debrief with the product manager: structured feedback specifically on Elena\'s communication style. Does she lead with impact before cause? Does she avoid jargon? This is the single most valuable feedback session in her first 30 days.',
        ],
        checkpoint: 'Product manager confirms that Elena\'s written technical update was understood without follow-up clarification questions. Elena can articulate the difference between her technical explanation and the business-impact version with examples.',
        involves: ['Line manager', 'Product manager', 'Senior engineer (buddy)', 'Engineering team'],
        notes: 'CIPD guidance on new hire development recommends that identified skill gaps are addressed with explicit, targeted activities within the first 30 days , before the pattern becomes entrenched.',
      },
      {
        week: 4,
        title: 'First Code Review as Reviewer',
        objective: 'Assess Elena\'s approach to mentoring and standards-setting by giving her a reviewer role , this is important data for her team-fit and long-term growth trajectory.',
        activities: [
          'Elena reviews a PR from a junior developer , her feedback should be constructive, specific, and focused on the code rather than the coder. Her buddy reviews her review and provides meta-feedback on its quality.',
          'First 1:1 with the line manager focused on Elena\'s experience so far: what is working, what is unclear, and what she needs more of. This is not a performance review , it is a two-way orientation conversation.',
          'Technical deep-dive into an area of the codebase Elena has not yet worked in. She should produce a brief written summary of what she learned , reinforcing the documentation and knowledge-sharing habits expected of senior developers.',
        ],
        checkpoint: 'Code review feedback is documented and received positively by the junior developer. Elena\'s 1:1 conversation is substantive , she arrives with specific questions and observations rather than waiting to be asked.',
        involves: ['Line manager', 'Senior engineer (buddy)', 'Junior developer (code review recipient)'],
        notes: 'N/A',
      },
      {
        week: 5,
        title: '30-Day Review and Communication Follow-Up',
        objective: 'Complete the formal 30-day review and assess progress on the technical communication gap , the primary development area from this assessment.',
        activities: [
          'Formal 30-day probationary review with the line manager. Review: codebase contributions, code review quality, architectural understanding, and , critically , progress on the technical communication gap. Use the product manager\'s feedback from week three as the baseline.',
          'Second cross-functional communication exercise: Elena presents a technical update at the sprint review without prior coaching or review. Assess whether the week three feedback has been integrated.',
          'Agree on a 60-day development plan: what will Elena be independently responsible for in the next 30 days, what standards will her work be held to, and what does a successful 90-day probation look like?',
        ],
        checkpoint: 'Formal 30-day review is documented. Product manager confirms measurable improvement in Elena\'s cross-functional communication since week three. 60-day plan is agreed and in writing.',
        involves: ['Line manager', 'HR , ERA 2025 probationary review', 'Product manager'],
        notes: 'ERA 2025 requires a documented probationary review at 30 days for contracts of 6 months or more. Ensure this is completed and signed before the end of week five.',
      },
      {
        week: 6,
        title: 'Autonomous Feature Ownership and 60-Day Planning',
        objective: 'Elena takes full ownership of a feature from planning to deployment, demonstrating that she can work independently across the full delivery cycle.',
        activities: [
          'Elena is assigned a feature with full ownership: technical design, implementation, testing, documentation, and deployment. She makes all technical decisions and communicates progress to product and engineering leads independently.',
          'Technical design review: Elena presents her proposed implementation approach to the senior engineers before coding begins. This practice should become a habit for all significant features going forward.',
          'Set 60-day goals with the line manager: what features will Elena own in months two and three, what are her performance targets, and what does progression toward senior developer look like from here?',
        ],
        checkpoint: 'Feature has been designed, implemented, and deployed independently with adequate test coverage and documentation. Design review was conducted before implementation and the feedback was integrated. 60-day plan is agreed.',
        involves: ['Line manager', 'Senior engineers', 'Product manager'],
        notes: 'CIPD guidance on probationary review recommends a formal 60-day check-in to assess trajectory and confirm the hire is on track before the final 90-day review.',
      },
    ],
    interview_questions: [
      'A production service goes down mid-afternoon. Walk me through what you do in the first 30 minutes, specifically how you communicate with the business while you\'re still diagnosing. (Follow-up probe: What\'s the first message you send and who does it go to?)',
      'Your product manager wants to ship a feature you\'ve flagged as a reliability risk. How do you handle that conversation and where\'s your line? (Follow-up probe: What do you do if they decide to proceed anyway?)',
      'How do you explain a technical blocker to a non-technical stakeholder who needs to decide whether to delay a launch? (Follow-up probe: How do you know whether your explanation actually landed?)',
      'You\'re three days before the sprint deadline and the test coverage is below your standard. What do you do? (Follow-up probe: How do you decide when "good enough" is acceptable?)',
    ],
    cv_comparison: [
      'Commercially minded engineer with experience in client-facing and cross-functional roles',
      'Track record of delivering quality code under deadline pressure',
      'Strong communicator who translates technical complexity for non-technical stakeholders',
      'Proven ability to take ownership and deliver independently',
    ],
    predictions: {
      pass_probation: 87,
      top_performer: 63,
      churn_risk: 10,
      underperformance_risk: 12,
      _panels: makePanelPredictionVariants('Software Developer', { tone: 'strong' }),
      _verification: makePredictionsVerification('Software Developer', 'employer_permanent'),
    },
    execution_reliability: 85,
  },

  /* ── Ryan Thompson, 71, Medium, Customer Service Team Leader ── */
  'demo-c10': {
    overall_score: 71,
    risk_level: 'Medium',
    percentile: 'Top 35%',
    pressure_fit_score: 68,
    pass_probability: 73,
    candidate_type: 'Friendly and Reliable but Avoids Confrontation|Handles routine customer queries well but struggles when complaints escalate or team members need direct feedback.',
    confidence_level: 'High',
    trajectory: 'Stable',
    seniority_fit_score: 70,
    risk_reason: 'Strong customer-facing instincts and a calm manner with frustrated callers, but consistent avoidance of difficult conversations with team members. Hire with a structured plan that builds explicit feedback skills before he is asked to performance-manage independently.',
    ai_summary: `Ryan Thompson is a warm, dependable Customer Service Team Leader candidate with genuine strengths in front-line customer handling. His responses show someone who calms situations naturally, listens before reacting, and is clearly motivated by helping people. For a team leader role in a stable contact centre with good existing performance, he would settle in quickly and be liked by his team within days.

The watch-out is consistent and worth taking seriously. Across two of the four scenarios, Ryan deflected away from any conversation that involved telling someone they were not performing. In Scenario 3, when asked how he would handle a team member who repeatedly missed call-handling targets, his response focused on encouragement and "checking in to see if everything is okay at home" rather than naming the performance issue and agreeing a plan. He wrote: "I'd want to be supportive first, because you never know what someone is dealing with outside work." This is true and humane, but it is not the same as managing performance, and the gap is the central development area for this hire.

His customer-facing scenarios were notably stronger. In Scenario 1, he de-escalated a frustrated long-term customer with a script that was warm, specific, and avoided defensive language. He used the customer's name, acknowledged the inconvenience, and offered a concrete next step within the first three sentences. This is a learned skill that takes most new team leaders six months to develop , Ryan already has it.

Hire with a clear development plan. Pair Ryan with a senior team leader or operations manager for the first 60 days who can model and coach difficult feedback conversations. Set an explicit expectation in the 30-day review that Ryan will have held at least one structured performance conversation with a team member. The risk is real but manageable, and his customer-facing strengths more than compensate in a role where most of the day is spent supporting front-line agents and difficult calls.`,
    integrity: {
      response_quality: 'Genuine',
      quality_notes: 'Responses are warm, specific, and written in a consistent personal voice. Customer-handling scenarios in particular show language that would be difficult to fabricate without direct front-line experience.',
      consistency_rating: 'High',
      consistency_notes: 'Values and behaviours align across scenarios. The avoidance pattern in feedback situations is consistent, which is a reliable signal rather than a one-off.',
      time_analysis: 'Scenario 1 (4m 32s): Normal. Scenario 2 (5m 08s): Normal. Scenario 3 (3m 14s): Slightly fast , may indicate discomfort with the topic. Scenario 4 (4m 51s): Normal.',
      red_flags: [],
    },
    pressure_fit: {
      decision_speed_quality: {
        score: 70,
        verdict: 'Moderate',
        narrative: 'Ryan makes confident decisions when the situation is customer-facing and the right answer is broadly clear. He moves more slowly when the decision involves a team member, often reaching for "I would want to talk to my manager first" rather than committing to a course of action. This is appropriate caution for some situations but can become a bottleneck in a contact centre where team leaders are expected to make calls in real time. In the first 90 days, this suggests he will likely handle customer-facing decisions well and need explicit coaching on when to act independently on people decisions.',
      },
      composure_under_conflict: {
        score: 78,
        verdict: 'Strength',
        narrative: 'Ryan was at his strongest in the frustrated-customer scenario. His instinct is to slow the conversation down, acknowledge the emotional register first, and only then move to a practical resolution. He used the customer\'s name, mirrored their concern back accurately, and offered a specific commitment with a timeline. This is a learned skill and a genuine strength for a team leader who will spend much of the day supporting agents on escalated calls. In the first 90 days, this suggests he will be a credible escalation point for his team and will protect his agents from absorbing customer frustration.',
      },
      prioritisation_under_load: {
        score: 67,
        verdict: 'Moderate',
        narrative: 'Ryan identified the right priorities in the multi-task scenario but his sequencing was driven by who was making the loudest demand rather than by impact or urgency. He committed to "getting back to the angry customer first because they were waiting longest" without considering whether the delayed back-office task had a harder downstream deadline. This pattern is workable in a structured contact centre with clear queue rules, but will need coaching if the role involves any independent triage of competing priorities. In the first 90 days, expect Ryan to manage volume well within established processes and to need support when priorities are ambiguous.',
      },
      ownership_accountability: {
        score: 65,
        verdict: 'Moderate',
        narrative: 'Ryan owns his customer-facing outcomes clearly and uses first-person language when describing complaints he has resolved. He is more cautious about owning outcomes that involve other team members , he tends to frame performance issues as situations that "happen to the team" rather than situations he is responsible for addressing. This is the same underlying pattern that drives the feedback-avoidance watch-out, viewed from a different angle. In the first 90 days, expect strong personal accountability on calls he handles and a need for explicit coaching on owning team performance outcomes.',
      },
    },
    scores: {
      'Empathy':                        82,
      'Communication':                  78,
      'Decision Making Under Pressure': 70,
      'Prioritisation':                 74,
      'Adaptability':                   68,
      'Compliance':                     65,
    },
    scoring_confidence: {
      level: 'high',
      reason: 'Solid response depth on customer-facing scenarios; one mild generic flag on advisor-coaching coverage but no integrity concerns.',
      confidence_reason: 'Strong customer-facing response depth, mild vague-language pattern only on advisor-coaching coverage. Low risk of probation failure under ERA 2025 protections; the assessment forms a defensible record for the line manager.',
      confidence_reason_variants: {
        agency_permanent:  'Strong customer-facing response depth, mild vague-language pattern only on advisor-coaching coverage. Low risk of rebate period dispute or client dissatisfaction; safe to submit to client with the assessment as supporting evidence.',
        agency_temporary:  'Strong customer-facing response depth, mild vague-language pattern only on advisor-coaching coverage. Low risk of no-show or assignment friction; SSP exposure looks manageable across the first week.',
        employer_permanent:'Strong customer-facing response depth, mild vague-language pattern only on advisor-coaching coverage. Low risk of probation failure under ERA 2025 protections; the assessment forms a defensible record for the line manager.',
        employer_temporary:'Strong customer-facing response depth, mild vague-language pattern only on advisor-coaching coverage. Low supervision overhead expected; immediate productivity should be in line with the brief.',
      },
    },
    generic_detection: {
      score: 26,
      flags: ['vague_language'],
      evidence_per_flag: {
        vague_language: 'When describing how he would coach an underperforming advisor he wrote "I would have a chat with them and see how they are getting on" without naming the behaviour, the evidence, or the conversation he would actually have.',
      },
    },
    score_narratives: {
      'Empathy':                        'Genuine strength. Ryan slows the conversation down, acknowledges the emotional content before moving to resolution, and uses the customer name. Reads frustration, embarrassment, and vulnerability accurately. This is the foundation his whole team-leader case is built on.',
      'Communication':                  'Strong with customers, softer with advisors. His Scenario 1 de-escalation script was specific and humane. The development edge is in using the same clarity for difficult internal conversations, where he currently softens too much and the coaching message gets lost.',
      'Decision Making Under Pressure': 'Decides clearly on familiar customer issues and uses his refund authority appropriately. On novel decisions (a regulator-level complaint, a customer demanding above the goodwill threshold) he tends to escalate to the duty manager when the authority is technically his to use.',
      'Prioritisation':                 'Manages queue volume well. Sequencing is driven by who is most visible rather than by structured triage; the slow-burning regulator timeframe risks slipping while the live queue gets attention. Will benefit from explicit triage criteria in the first 30 days.',
      'Adaptability':                   'Adapts to live disruption (sickness in the team, a system outage) but visibly prefers a fixed shift plan. Disruptions to the routine produce mild stress signs in his written tone; he recovers, but the recovery costs energy that he then does not have for coaching.',
      'Compliance':                     'Follows policy correctly on the standard issues. The development area is recognising regulator-level complaints early and tracking the response window proactively rather than relying on the duty manager to flag them. Needs explicit training on the formal complaint pathway in week one.',
    },
    strengths: [
      {
        strength: 'De-escalates frustrated customers naturally',
        explanation: 'Ryan slows the conversation down, acknowledges the emotional content first, and only then moves to a resolution. He uses the customer\'s name, mirrors their concern accurately, and commits to a specific next step. This is a learned skill that most new team leaders take six months to develop.',
        evidence: 'I\'d start with their name and just acknowledge how frustrating this must have been after eight years as a customer. Then I\'d tell them exactly what I\'m going to do today and when they\'ll hear back from me, no jargon, no excuses.',
      },
      {
        strength: 'Calm, consistent presence under pressure',
        explanation: 'Across all four scenarios, Ryan maintained the same warm, even tone whether the situation was a frustrated customer or a multi-task pressure scenario. This kind of consistency is exactly what front-line agents need from their team leader.',
        evidence: 'I try not to bring whatever happened on the last call into the next one. The customer doesn\'t care about my morning, they care about their problem.',
      },
    ],
    watchouts: [
      {
        watchout: 'Avoided giving direct feedback to underperforming team member in Scenario 3',
        severity: 'Medium',
        explanation: 'When asked how he would handle a team member repeatedly missing call-handling targets, Ryan focused on welfare check-ins and encouragement rather than naming the performance issue and agreeing a plan. This pattern appeared again in Scenario 4. It is the central development risk for this hire.',
        evidence: 'I\'d want to be supportive first, because you never know what someone is dealing with outside work. I\'d check in and see if everything is okay before I bring up the numbers.',
        action: 'Pair Ryan with a senior team leader or operations manager for the first 60 days to model and coach structured feedback conversations. Set an explicit 30-day target that he holds at least one documented performance conversation with a team member, even if the issue is minor.',
        ...makeWatchoutVerification({
          agency_permanent: {
            q: 'The report flags avoidance of direct feedback. Tell us about the last time you held a documented performance conversation with someone in your team, what you said, and how it went. We need this before we send you to the client because it is the central risk on this profile.',
            strong: ['Documented conversation with named team member', 'Performance issue was named explicitly', 'Outcome of the conversation was tracked', 'Owns the discomfort of the conversation'],
            weak: ['Defaults to welfare check first', 'Cannot describe a documented performance conversation', 'Story focuses on supportive language only', 'Performance issue never gets named'],
            probe: 'What words did you use to open the conversation, and how did the team member respond in the first minute?',
          },
          agency_temporary: {
            q: 'On a temp team-leader assignment, you cannot wait three weeks to give feedback. Tell me about an assignment where you had to address a performance issue inside the first week and how you opened it.',
            strong: ['Addressed the issue in the first week', 'Specific opening line described', 'Confirms the on-site manager observed', 'Outcome of the conversation tracked'],
            weak: ['Took weeks before raising the issue', 'Required the on-site manager to step in', 'Cannot describe the moment of feedback', 'Defaulted to welfare-only conversations'],
            probe: 'When you noticed the dip on assignment, how many shifts passed before you raised it?',
          },
          employer_permanent: {
            q: 'For ERA 2025 we document this. Tell me about a performance conversation you ran with a team member, what you said in the first minute, and what your line manager would say about how you handled it.',
            strong: ['Specific conversation, quoted opening', 'Line manager would corroborate', 'Performance issue named directly', 'Reflects on what they would do differently'],
            weak: ['No documented conversation to point to', 'Manager would not corroborate', 'Defends the welfare-only approach', 'Cannot describe the words used'],
            probe: 'If a team member missed targets in week six here, what would you say in the first thirty seconds of the conversation?',
          },
          employer_temporary: {
            q: 'On this assignment you are leading the team without a deputy. Tell me about a contract where you addressed a performance issue live, without escalating it to the client manager.',
            strong: ['Handled the issue without escalation', 'Specific assignment and team member', 'Confirms the client manager was satisfied', 'Worked within the assignment timeframe'],
            weak: ['Always escalated performance issues', 'Required client manager to lead the conversation', 'Cannot describe a live moment', 'Story always involves a delay'],
            probe: 'Who decides on this assignment when a feedback conversation is yours to hold and when it goes to the on-site manager?',
          },
        }, 'employer_permanent'),
      },
      {
        watchout: 'Defers people decisions to manager rather than acting independently',
        severity: 'Low',
        explanation: 'Ryan reached for "I\'d want to check with my manager first" on three out of four scenarios involving a team member decision. This is appropriate in some cases but will become a bottleneck if it remains the default pattern past the first month.',
        evidence: null,
        action: 'In the 30-day review, agree the categories of people decision that Ryan is expected to make independently versus those that should be escalated. Revisit at 60 days.',
        ...makeWatchoutVerification({
          agency_permanent: {
            q: 'The report shows a pattern of deferring people decisions to the manager. Tell us about a recent decision about a team member you made yourself without checking up first, and how you would judge the line for this client.',
            strong: ['Specific people decision made independently', 'Owns the rationale', 'Names where they would now check up versus decide', 'Outcome of the decision was good'],
            weak: ['Defaults to "I would check with my manager"', 'Cannot describe an independent people decision', 'Story always involves an upward escalation', 'No clear sense of where the line sits'],
            probe: 'What is a people decision you would make alone, without escalating, in your first 30 days?',
          },
          agency_temporary: {
            q: 'On a temp assignment the on-site manager will not always be on shift. Tell us about an assignment where a people decision had to be made on shift and you made it yourself.',
            strong: ['Made the call live without supervisor', 'Specific assignment and decision', 'Outcome accepted by the on-site manager after', 'Confidence about the boundary'],
            weak: ['Always waited for the manager to come back', 'Decisions delayed to next shift', 'Cannot describe a solo decision', 'Defaults to escalation'],
            probe: 'If a team member walked off mid-shift on this assignment, what would you do before the manager was back?',
          },
          employer_permanent: {
            q: 'For ERA 2025 we document the answer. Tell me about a people decision you made independently in the last six months, what was at stake, and what you would do differently here.',
            strong: ['Independent decision named', 'Acknowledges where escalation was right and where it was avoidance', 'Sets out a clear line for this role', 'Owns the call'],
            weak: ['Cannot find an independent example', 'Treats every decision as one for the manager', 'No clear line proposed', 'Story is always about escalating'],
            probe: 'If a team member raised a complaint about a peer in week four, would you handle it or escalate, and why?',
          },
          employer_temporary: {
            q: 'On this short assignment, escalating every people call to the on-site manager does not work. Tell me about a temp assignment where you handled a team member issue without involving the manager and what was the outcome.',
            strong: ['Solo handling of a team-member issue', 'No supervisor uplift required', 'Specific assignment context', 'Confirms the on-site manager was satisfied'],
            weak: ['Required supervisor for every people call', 'Decisions deferred to next shift', 'Cannot describe a solo example', 'Defaults to "I would check first"'],
            probe: 'What does your default response sound like when a team member asks you for a swap on the spot?',
          },
        }, 'employer_permanent'),
      },
    ],
    onboarding_plan: [
      {
        week: 1,
        title: 'Team Introduction and Shadowing',
        objective: 'Build relationships with the team and observe current performance norms before taking any action.',
        activities: [
          '1:1 introductions with every direct report. Ryan should listen for current frustrations, blockers, and what each person needs from a team leader.',
          'Shadow the outgoing or covering team leader for at least three full shifts. Observe how escalations, breaks, and quality monitoring are handled in practice.',
          'HR induction including ERA 2025 day-one rights briefing.',
        ],
        checkpoint: 'Can name every direct report, their main strengths, and at least one development area for each.',
        involves: ['Line manager', 'Team', 'HR , ERA 2025 day-one induction'],
        notes: 'ERA 2025 requires written statement of particulars on day one. Ensure Ryan receives his probation documentation before end of day one.',
      },
      {
        week: 2,
        title: 'Customer Escalations Ownership',
        objective: 'Use Ryan\'s strongest skill , customer de-escalation , to establish credibility with the team early.',
        activities: [
          'Take ownership of all escalated calls for the week. Ryan should handle these directly while the team observes.',
          'Daily five-minute team huddle led by Ryan: review the day\'s biggest call, what worked, what would have worked better.',
          'Begin reviewing performance data for the team: handle time, quality scores, customer satisfaction. No actions yet, just observation.',
        ],
        checkpoint: 'Has personally handled at least five escalations and led at least four daily huddles. Has reviewed the last month of team performance data.',
        involves: ['Line manager', 'Team', 'Quality team'],
        notes: 'N/A',
      },
      {
        week: 3,
        title: 'First Structured Feedback Conversation',
        objective: 'Directly address the assessed development area by requiring Ryan to hold one structured feedback conversation this week, with coaching support.',
        activities: [
          'Identify one team member where a small piece of constructive feedback is genuinely warranted (not necessarily a performance issue , could be a quality coaching point).',
          'Ryan plans the conversation using a structured framework (situation, behaviour, impact, agreed next step). Reviews the plan with his line manager beforehand.',
          'Holds the conversation. Documents the outcome and the agreed next step.',
        ],
        checkpoint: 'Has held one structured feedback conversation with documented preparation and outcome. Has reflected with the line manager on what felt difficult and what felt manageable.',
        involves: ['Line manager', 'Team member'],
        notes: 'This is the central development activity for this hire. Do not skip it even if the week is busy.',
      },
      {
        week: 4,
        title: 'Independent Shift Management',
        objective: 'Ryan runs a full shift independently with no line manager presence, demonstrating he can hold the team and the queue without escalation.',
        activities: [
          'Manage the full shift end-to-end: rota adjustments, breaks, escalations, end-of-shift reporting.',
          'Hold a 1:1 with each direct report this week , 15 minutes each, focused on how they are finding the new team leader and what support they need.',
          '30-day stakeholder feedback session with the line manager and a sample of team members.',
        ],
        checkpoint: 'Has run one full independent shift without escalation. Has held 1:1s with every direct report. Stakeholder feedback is broadly positive on warmth and communication.',
        involves: ['Line manager', 'Team', 'HR , 30-day probation check-in'],
        notes: 'ERA 2025 requires a documented probationary review at 30 days. Complete and sign off this week.',
      },
      {
        week: 5,
        title: '30-Day Review and Performance Plan',
        objective: 'Complete the formal 30-day review and agree the development plan for the next 60 days, with explicit focus on the feedback gap.',
        activities: [
          'Formal 30-day probationary review with line manager. Document early performance against onboarding KPIs and the agreed development areas.',
          'Agree a specific commitment for month two: Ryan will hold at least three structured feedback or coaching conversations, with line manager review afterwards.',
          'Identify a senior team leader or operations manager who can act as a peer mentor for the next 60 days.',
        ],
        checkpoint: '30-day review documented and signed. Development plan in writing. Peer mentor confirmed.',
        involves: ['Line manager', 'HR , ERA 2025 probationary review documentation', 'Peer mentor'],
        notes: 'ERA 2025 statutory probation review must be documented within 30 working days. Ensure paperwork is complete this week.',
      },
      {
        week: 6,
        title: 'Coaching Cadence and Quality Improvement',
        objective: 'Establish a regular coaching cadence with the team and demonstrate measurable improvement in at least one quality metric.',
        activities: [
          'Set up weekly quality coaching slots with each direct report , 15 minutes per person, structured around one observed call.',
          'Identify one team-level quality metric that Ryan will personally improve over the next 30 days. Agree the target with the line manager.',
          'Mid-point check-in with the peer mentor: what is feeling easier, what is still hard, what coaching would help.',
        ],
        checkpoint: 'Coaching cadence is in place and documented. Quality improvement target is agreed and measurable. Peer mentor check-in is logged.',
        involves: ['Line manager', 'Team', 'Peer mentor', 'Quality team'],
        notes: 'CIPD probation guidance recommends a formal 60-day check-in to assess trajectory before the full probation review at 90 days.',
      },
    ],
    interview_questions: [
      'Tell me about a time you had to tell a team member that their work was not at the standard you needed. How did you start the conversation and what was the outcome? (Follow-up probe: What would you have done differently?)',
      'A long-standing customer is shouting at one of your agents on the phone and the agent has just put them on hold and burst into tears. You have ten minutes before your next meeting. Talk me through what you do, in order. (Follow-up probe: What do you say to the agent afterwards?)',
      'Two of your team members miss their call-handling targets two weeks in a row. One has been with the company for five years, the other started six weeks ago. How do you handle each conversation differently? (Follow-up probe: When do you escalate to your manager and when do you handle it yourself?)',
      'You have three things landing at once: an escalated complaint, a back-office task with a 4pm deadline, and a team member asking to leave early for a personal reason. How do you sequence these and why? (Follow-up probe: What if your manager is not available to ask?)',
    ],
    cv_comparison: [
      'Three years of front-line customer service experience with strong NPS scores',
      'Recent promotion to senior advisor with informal coaching responsibilities',
      'Trained in de-escalation and complaints handling',
      'No prior formal line management or performance management experience',
    ],
    predictions: {
      pass_probation: 75,
      top_performer: 32,
      churn_risk: 18,
      underperformance_risk: 22,
      _panels: makePanelPredictionVariants('Customer Service Team Leader', { tone: 'mixed' }),
      _verification: makePredictionsVerification('Customer Service Team Leader', 'employer_permanent'),
    },
    execution_reliability: 71,
    training_potential: 74,
    training_potential_narrative: 'Asked for guidance during Scenario 3 rather than guessing, and self-identified the feedback gap when reflecting on Scenario 4. Coachable with a peer mentor and structured feedback practice.',
  },

  // ── Rapid Screen demo candidate ──────────────────────────────────────────
  'demo-c11': {
    overall_score: 71,
    risk_level: 'Low',
    percentile: 'Top 32%',
    pressure_fit_score: 68,
    pass_probability: 74,
    candidate_type: 'Reliable Responder | Clear communicator who prioritises correctly and stays calm under pressure. Needs more initiative on follow-through.',
    confidence_level: 'Medium',
    trajectory: 'Stable',
    seniority_fit_score: 72,
    risk_reason: 'Solid basic competence with room for development. No major concerns.',
    ai_summary: 'Alex demonstrated clear communication and correct prioritisation under time pressure. Identified the customer complaint as the top priority and gave a practical reason. Response to the scenario was concise and appropriate for the role level.',
    rapid_screen_signal: 'Strong Proceed',
    rapid_screen_reason: 'Candidate demonstrated competence and sound prioritisation in a fast-paced screening.',
    integrity: {
      response_quality: 'Genuine',
      quality_notes: 'Natural language, scenario-specific references, appropriate length for rapid screen.',
      consistency_rating: 'High',
      consistency_notes: 'Consistent tone across both tasks.',
      time_analysis: 'Completed in 7 minutes. Normal pace for rapid screen.',
      red_flags: [],
    },
    scores: {
      'Empathy':                        70,
      'Communication':                  72,
      'Decision Making Under Pressure': 70,
      'Prioritisation':                 74,
      'Compliance':                     68,
    },
    generic_detection: {
      score: 18,
      flags: [],
      evidence_per_flag: {},
    },
    scoring_confidence: {
      level: 'medium',
      reason: 'Rapid screen format limits depth signal; tight, on-process responses with no integrity flags.',
      confidence_reason: 'Tight rapid-screen responses, on-process and concise. No integrity flags. Recommend close supervision in the first week of assignment to confirm capability before extending.',
      confidence_reason_variants: {
        agency_permanent:  'Tight rapid-screen responses, on-process and concise. No integrity flags. Recommend additional verification before submitting to client to protect the fee through the rebate period.',
        agency_temporary:  'Tight rapid-screen responses, on-process and concise. No integrity flags. Recommend closer monitoring during the first week of assignment to confirm attendance and client satisfaction with the worker output.',
        employer_permanent:'Tight rapid-screen responses, on-process and concise. No integrity flags. Recommend documented interview verification before offer to anchor the probation case under ERA 2025 and reduce line manager workload.',
        employer_temporary:'Tight rapid-screen responses, on-process and concise. No integrity flags. Recommend close supervision in the first week of assignment to confirm capability before extending.',
      },
    },
    score_narratives: {
      'Empathy':                        'Acknowledged the customer was frustrated before moving to the resolution step. Tone was warm without becoming over-familiar. Appropriate for an entry-level advisor on a rapid screen.',
      'Communication':                  'Clear, direct response with no waffle. 78 words, actionable, on-brand. Suitable for the volume and pace of front-line advisor work.',
      'Decision Making Under Pressure': 'Made a sensible call on the scenario without overthinking. Did not freeze, did not escalate unnecessarily. Reaches a clear decision quickly, which is the right pattern for this role level.',
      'Prioritisation':                 'Correctly identified the urgent customer issue as top priority. Gave a practical reason for the ranking rather than guessing.',
      'Compliance':                     'Followed the published process on refund and escalation. Did not freelance outside policy when the customer pushed for an exception.',
    },
    strengths: [
      { strength: 'Clear prioritisation', explanation: 'Correctly ranked the customer complaint as the most urgent task and gave a practical reason.', evidence: 'Ranked urgent customer issue first, routine admin last.' },
      { strength: 'Concise communication', explanation: 'Response was direct and to the point without unnecessary padding.', evidence: 'Scenario response was 78 words, clear and actionable.' },
    ],
    watchouts: [
      {
        watchout: 'Limited initiative shown',
        severity: 'Low',
        explanation: 'Response was correct but did not go beyond the minimum. May need prompting to take ownership.',
        evidence: 'Did not suggest follow-up actions or escalation steps.',
        action: 'Probe at interview for examples of proactive problem-solving.',
        ...makeWatchoutVerification({
          agency_permanent: {
            q: 'The report flags low initiative. Tell us about a time on the phones when you went beyond the script and resolved something the customer would have called back about. What was the call, and what did you actually do?',
            strong: ['Specific call and resolution', 'Action was unprompted', 'Reduced repeat contact', 'Outcome described in customer terms'],
            weak: ['Cannot describe an unprompted action', 'Always followed the script', 'Resolution was driven by a senior', 'No example of preventing a callback'],
            probe: 'When was the last time you flagged something to a team leader without being asked?',
          },
          agency_temporary: {
            q: 'On a temp customer service assignment, initiative shows up as the smallest unprompted improvement. Tell me about an assignment where you spotted something and acted on it without being asked.',
            strong: ['Specific assignment and unprompted action', 'On-site team noticed', 'Worked inside the assignment timeframe', 'Outcome named'],
            weak: ['Required prompting on every shift', 'Cannot describe an unprompted action', 'No on-site contact would corroborate', 'Defaulted to the minimum brief'],
            probe: 'What was the last thing you suggested to a supervisor on assignment without being asked?',
          },
          employer_permanent: {
            q: 'For ERA 2025 we document this. Tell me about a time you took the initiative on a customer issue without being prompted, what you did, and what your line manager would say about it.',
            strong: ['Specific unprompted action', 'Line manager would corroborate', 'Customer outcome named', 'Owns the choice to act'],
            weak: ['Initiative limited to following the process', 'Cannot describe an unprompted moment', 'Manager would not recall', 'Story is always about being asked'],
            probe: 'In your first 30 days here, what would prompt you to step out of the script?',
          },
          employer_temporary: {
            q: 'On this assignment we need someone who picks up the small things without being told. Tell me about a recent contract where you noticed something and fixed it without supervision.',
            strong: ['Worked inside the assignment, no supervision uplift', 'Specific fix or proactive action', 'Visible to the on-site team', 'Reduced repeat issues'],
            weak: ['Required ongoing direction', 'Cannot describe a self-initiated action', 'Always waited for instructions', 'No tangible improvement named'],
            probe: 'On day three of an assignment, what is the first thing you do without being asked?',
          },
        }, 'employer_permanent'),
      },
    ],
    onboarding_plan: [
      { week: 'Week 1', title: 'Shadow and observe', objective: 'Understand the team rhythm and common customer issues.', activities: ['Shadow experienced advisor for 2 days', 'Handle simple queries with supervision'] },
    ],
    predictions: {
      pass_probation: 76,
      top_performer: 22,
      churn_risk: 15,
      underperformance_risk: 20,
      _panels: makePanelPredictionVariants('Customer Service Advisor', { tone: 'mixed' }),
      _verification: makePredictionsVerification('Customer Service Advisor', 'employer_permanent'),
    },
    execution_reliability: 70,
    training_potential: 68,
    training_potential_narrative: 'Solid baseline competence. Will benefit from structured feedback in the first month.',
  },
}

// ── Response timing data (for integrity section) ──────────────────────────

// Helpers to keep the demo response blocks compact. The shapes match what the
// candidate-side runtime would persist on the real `responses` table.
const _slot = (rank, action, justification) => ({ rank, action, justification })
const _ra = (...slots) => ({ slots, submitted_at: '2026-04-02T14:18:00Z' })
const _interrFired = (prompt, revisedSlots, reasoning, changedRanking) => ({
  fired: true,
  prompt,
  revised_slots: revisedSlots,
  changed_ranking: changedRanking,
  reasoning,
  responded_at: '2026-04-02T14:21:00Z',
})
const _interrSkipped = { fired: false }

export const DEMO_RESPONSES = {
  // Sophie Chen, Marketing Manager, Strong (92): clean rankings, concrete
  // justifications, holds her position under interruption with new evidence.
  'demo-c1': [
    { scenario_index: 0, time_taken_seconds: 312,
      ranked_actions: _ra(
        _slot(1, 'Brief the PR agency on the holding statement before the next press call lands.', 'They need a usable line within the hour or the story will be defined for us; everything else can wait 30 minutes.'),
        _slot(2, 'Hold the launch date and convert the first ten days into a founder-story teaser.', 'Killing the launch wastes three months of work; reshaping it preserves the audience and the spend.'),
        _slot(3, 'Send the exec team a three-option note ranked by revenue and reputational risk.', 'They need a recommendation, not a problem; framing it now stops a panic call at 5pm.'),
      ),
      interruption_response: _interrSkipped },
    { scenario_index: 1, time_taken_seconds: 287,
      ranked_actions: _ra(
        _slot(1, 'Talk to the sales lead in person before any written escalation.', 'Most cross-functional friction here is a communication gap, not a strategic one; resolving it directly preserves trust.'),
        _slot(2, 'Pause the contested campaign for 48 hours pending alignment.', 'Continuing while sales is openly hostile burns budget and brand at the same time.'),
        _slot(3, 'Bring a written joint plan to the exec team within the week.', 'Whatever we agree needs to land in writing or it slips back into the same fight next month.'),
      ),
      interruption_response: _interrFired(
        'Sales has just told their team to ignore the campaign altogether. The CRO is on a flight and unreachable.',
        [
          _slot(1, 'Talk to the sales lead in person before any written escalation.', 'Even with the CRO out, the sales lead can still pull her own team back; the relationship is the lever.'),
          _slot(2, 'Pause the contested campaign for 48 hours pending alignment.', 'The directive to ignore makes pause even more important; we cannot spend behind a campaign sales has rejected.'),
          _slot(3, 'Send a written summary to the CRO timed for landing.', 'Avoids surprising the CRO when he reads the catch-up, gives him a recommendation rather than a problem.'),
        ],
        'The new information makes the order more important, not different. The conversation with the sales lead still has to happen first; the CRO update is now timed rather than reactive.',
        false
      ) },
    { scenario_index: 2, time_taken_seconds: 345,
      ranked_actions: _ra(
        _slot(1, 'Re-baseline the budget against the lowest-pipeline-impact line items.', 'A 20% cut without re-baselining damages the wrong things; this protects pipeline contribution.'),
        _slot(2, 'Tell the agency exactly what is paused and by when.', 'They are spending today; vague messaging produces wasted invoices and friction.'),
        _slot(3, 'Brief the team on what stays in scope and what is paused.', 'Avoids them defending a campaign that no longer exists.'),
      ),
      interruption_response: _interrSkipped },
    { scenario_index: 3, time_taken_seconds: 298,
      ranked_actions: _ra(
        _slot(1, 'Decide go/hold on the launch by 11am with the trade-offs spelled out.', 'A defensible call now beats a perfect call at 4pm; the team needs direction.'),
        _slot(2, 'Brief the agency and the exec sponsor on the chosen path.', 'Once a call is made, every hour without communication invites a second guess.'),
        _slot(3, 'Set a review point at week 2 with named metrics.', 'Locks in a moment to revise the call if the early data is bad, rather than drifting.'),
      ),
      interruption_response: _interrSkipped },
  ],

  // Marcus Williams, Marketing Manager, Hire with plan (74): mostly sensible
  // rankings, hedges occasionally on commercial framing, holds under
  // interruption but with weaker reasoning than Sophie.
  'demo-c2': [
    { scenario_index: 0, time_taken_seconds: 268,
      ranked_actions: _ra(
        _slot(1, 'Get the team aligned on the holding statement before anything goes out.', 'Alignment first means we land one message rather than three.'),
        _slot(2, 'Pause paid spend until the messaging is clear.', 'Spending behind a confused message wastes budget.'),
        _slot(3, 'Update the CEO with a summary at end of day.', 'Keeps the exec in the loop without forcing a meeting.'),
      ),
      interruption_response: _interrSkipped },
    { scenario_index: 1, time_taken_seconds: 142,
      ranked_actions: _ra(
        _slot(1, 'Coffee with the sales lead first.', 'I would rather have the human conversation before anything formal.'),
        _slot(2, 'Take the feedback to the team and explore options.', 'The team should hear it before it comes through other channels.'),
        _slot(3, 'Loop in the CMO on what we discussed.', 'Keeps the line up the chain.'),
      ),
      interruption_response: _interrFired(
        'The sales lead has now copied the CRO into a Slack thread questioning the campaign in writing.',
        [
          _slot(1, 'Reply in the thread with a calm summary of where we are.', 'Silence in a public thread reads as agreement; a written reply restores balance.'),
          _slot(2, 'Coffee with the sales lead immediately after.', 'The conversation still has to happen; it is just now followed up on, not led.'),
          _slot(3, 'Send the CRO a separate one-pager.', 'Keeps the senior conversation off the public thread.'),
        ],
        'I would change the order because Slack visibility now matters more than the in-person conversation. The relationship can be repaired later; the perception cannot if I let the thread sit.',
        true
      ) },
    { scenario_index: 2, time_taken_seconds: 310,
      ranked_actions: _ra(
        _slot(1, 'Spread the cut across all live campaigns proportionally.', 'Avoids singling out a team and keeps overall reach close to plan.'),
        _slot(2, 'Tell the agency once the new numbers are agreed.', 'No point briefing them on a moving target.'),
        _slot(3, 'Brief the team on what changed and why.', 'Important for morale.'),
      ),
      interruption_response: _interrSkipped },
    { scenario_index: 3, time_taken_seconds: 285,
      ranked_actions: _ra(
        _slot(1, 'Hold the launch and rework the messaging over the weekend.', 'Better to delay than ship something off-brand.'),
        _slot(2, 'Brief the team on the new timeline first thing Monday.', 'Avoids them hearing it through the agency.'),
        _slot(3, 'Send a short note to the exec sponsor with the rationale.', 'Keeps the senior stakeholders informed.'),
      ),
      interruption_response: _interrSkipped },
  ],

  // Priya Patel, Sales Executive, Review (61): rankings reasonable on her
  // strongest scenarios, hedged on commercial framing, sensibly revises
  // ranking when new objection-handling pressure surfaces in the interruption.
  'demo-c3': [
    { scenario_index: 0, time_taken_seconds: 295,
      ranked_actions: _ra(
        _slot(1, 'Call the prospect to understand what changed since the last conversation.', 'I want to start with discovery before assuming the deal is dead.'),
        _slot(2, 'Adjust the proposal based on what they say.', 'A bespoke response will land better than a generic chase.'),
        _slot(3, 'Set a follow-up touchpoint two weeks out.', 'Keeps me visible without becoming a nuisance.'),
      ),
      interruption_response: _interrSkipped },
    { scenario_index: 1, time_taken_seconds: 158,
      ranked_actions: _ra(
        _slot(1, 'Acknowledge the pricing concern and ask what is driving it.', 'I want to understand whether price is the real issue before discounting.'),
        _slot(2, 'Walk through the value of what is included.', 'Makes it harder for the prospect to compare apples to oranges.'),
        _slot(3, 'Offer a smaller-scope option at a lower price.', 'Gives them a way to say yes without losing margin.'),
      ),
      interruption_response: _interrFired(
        'Procurement has just joined the call and asked for a 25% discount inside ten minutes or they will go to a competitor.',
        [
          _slot(1, 'Hold the price and surface the value of what is included.', 'Conceding now teaches them every future deal will move on price.'),
          _slot(2, 'Offer a smaller-scope option at a lower price.', 'Gives them a yes without margin damage.'),
          _slot(3, 'Ask what success looks like in their first quarter to anchor on outcomes.', 'Outcomes-led pivot moves the conversation off price.'),
        ],
        'I changed the order because procurement is gaming me and I should hold price first rather than discovery-question my way around it. I would still want to ask the outcome question, just after holding the line.',
        true
      ) },
    { scenario_index: 2, time_taken_seconds: 242,
      ranked_actions: _ra(
        _slot(1, 'Identify the deals closest to closing and prioritise those.', 'They are the most likely to deliver this month.'),
        _slot(2, 'Park the very early-stage deals.', 'They are a distraction in a tight quarter.'),
        _slot(3, 'Report progress to the manager weekly.', 'Keeps me accountable.'),
      ),
      interruption_response: _interrSkipped },
    { scenario_index: 3, time_taken_seconds: 1450,
      ranked_actions: _ra(
        _slot(1, 'Send a value-focused follow-up rather than a check-in.', 'Generic chasing tells them I am not paying attention.'),
        _slot(2, 'Wait two weeks if there is still no reply, then call.', 'Phone breaks email silence reliably.'),
        _slot(3, 'Update the manager on the deal status.', 'Stops surprises at the pipeline review.'),
      ),
      interruption_response: _interrSkipped },
  ],

  // James O'Brien, Sales Executive, Not recommended (35): rushed responses,
  // generic ranking with weak justifications, panic-changes a defensible
  // ranking under the interruption with no real reasoning.
  'demo-c4': [
    { scenario_index: 0, time_taken_seconds: 71,
      ranked_actions: _ra(
        _slot(1, "I'd reach out to the prospect.", 'Stay close to the customer.'),
        _slot(2, "I'd loop in my manager.", 'Always good to keep them in the loop.'),
        _slot(3, 'Update the CRM.', 'Hygiene.'),
      ),
      interruption_response: _interrSkipped },
    { scenario_index: 1, time_taken_seconds: 243,
      ranked_actions: _ra(
        _slot(1, "I'd probably look at what we could do on the price.", 'There is usually some flexibility if the deal is important enough.'),
        _slot(2, 'Take the feedback on board and reflect.', "Don't want to push back in the moment."),
        _slot(3, 'Come back to them with a revised proposal in a few days.', 'Gives me time to think.'),
      ),
      interruption_response: _interrFired(
        'Procurement has just joined the call and asked for a 25% discount inside ten minutes or they will go to a competitor.',
        [
          _slot(1, "I'd offer them the 25% discount to keep the deal.", 'Better to keep the deal than lose it.'),
          _slot(2, 'Update the manager afterwards.', 'They will want to know.'),
          _slot(3, 'Reflect on what I could have done differently.', 'Always learning.'),
        ],
        'I would change because the customer is asking and I want to keep the relationship.',
        true
      ) },
    { scenario_index: 2, time_taken_seconds: 84,
      ranked_actions: _ra(
        _slot(1, "I'd prioritise the highest-value accounts first.", 'Common sense.'),
        _slot(2, 'Work through them systematically.', 'Make sure nothing is missed.'),
        _slot(3, 'Report any blockers.', 'Standard process.'),
      ),
      interruption_response: _interrSkipped },
    { scenario_index: 3, time_taken_seconds: 112,
      ranked_actions: _ra(
        _slot(1, "I'd leave the ball in their court.", 'Let them come back to me when they are ready.'),
        _slot(2, "Check back in a couple of weeks if I haven't heard.", 'Standard cadence.'),
        _slot(3, 'Tag the manager if it goes cold.', 'Escalate when needed.'),
      ),
      interruption_response: _interrSkipped },
  ],

  // Elena Rodriguez, Software Developer, Strong (85): tight technical
  // sequencing, holds her ranking under the incident interruption with
  // explicit reasoning grounded in monitoring evidence.
  'demo-c5': [
    { scenario_index: 0, time_taken_seconds: 388,
      ranked_actions: _ra(
        _slot(1, 'Scope the blast radius before touching anything.', 'A rollback is irreversible if it makes the wrong service the source of truth; scope first.'),
        _slot(2, 'Roll back the most recent deployment in the affected service.', 'Once scope is confirmed, rollback is the lowest-risk way to restore service.'),
        _slot(3, 'Open a post-incident note as the incident is still live.', 'Capturing the timeline live is more accurate than reconstructing it later.'),
      ),
      interruption_response: _interrSkipped },
    { scenario_index: 1, time_taken_seconds: 342,
      ranked_actions: _ra(
        _slot(1, 'Add a feature flag to ship the partial feature dark.', 'Lets us ship without exposure and toggle on per cohort.'),
        _slot(2, 'Open a follow-up ticket for the missing test coverage.', 'Tracks the debt explicitly so it does not sit in chat history.'),
        _slot(3, 'Note the trade-off in the PR description.', 'The next reviewer should see why the flag exists and when it can be removed.'),
      ),
      interruption_response: _interrFired(
        'A flaky CI test has just blocked every merge into main. The release manager is asking if we can disable it for the day.',
        [
          _slot(1, 'Add a feature flag to ship the partial feature dark.', 'The plan does not change just because CI is unhappy; the flag is still the right move.'),
          _slot(2, 'Triage the flaky test before disabling it.', 'Disabling without diagnosis ships the same instability into next week; ten minutes of triage usually finds it.'),
          _slot(3, 'Open the follow-up ticket for the missing test coverage.', 'Same reasoning as before; the test debt does not change because of the new noise.'),
        ],
        "I held the original ranking because the flaky test is a separate problem and disabling it is not the right answer; I added triage in the place of the PR description note because that is what the new information actually demands.",
        false
      ) },
    { scenario_index: 2, time_taken_seconds: 415,
      ranked_actions: _ra(
        _slot(1, "Push back on the design with the specific failure mode it would produce in our environment.", 'Disagreement on review is the cheapest place to catch a wrong call; specifics make it actionable.'),
        _slot(2, 'Propose the simpler alternative with the trade-offs.', 'A counter-proposal carries more weight than a no.'),
        _slot(3, 'Capture the decision and the rejected alternatives in the design doc.', 'Future readers should see why the simpler path was chosen.'),
      ),
      interruption_response: _interrSkipped },
    { scenario_index: 3, time_taken_seconds: 367,
      ranked_actions: _ra(
        _slot(1, 'Identify the off-by-one in the boundary condition before merging.', 'It is the kind of edge case that ships and then surfaces in production at month-end.'),
        _slot(2, 'Add a test that fails before the fix and passes after.', 'Locks in the fix and prevents regression.'),
        _slot(3, 'Update the PR description with the diagnosis.', 'Reviewers should see the reasoning, not just the change.'),
      ),
      interruption_response: _interrSkipped },
  ],

  // Ryan Thompson, Customer Service Team Leader, Borderline (71): strong on
  // customer-facing sequencing, slightly soft on the advisor-coaching
  // interruption where he hesitates to give direct feedback.
  'demo-c10': [
    { scenario_index: 0, time_taken_seconds: 272,
      ranked_actions: _ra(
        _slot(1, 'Acknowledge the customer by name and let them finish.', 'Cutting them off keeps them in the loop of frustration; letting them finish costs nothing and changes the temperature.'),
        _slot(2, 'Restate what I heard and offer a specific next step today.', 'Vague reassurance is what got the call here; concrete commitment resets it.'),
        _slot(3, 'Log the goodwill decision against the published threshold.', 'A documented call protects the team next time the same customer escalates.'),
      ),
      interruption_response: _interrSkipped },
    { scenario_index: 1, time_taken_seconds: 308,
      ranked_actions: _ra(
        _slot(1, 'Authorise the goodwill refund within my published authority.', 'Hesitating sends the customer to social media; the refund is within range and the cost of escalation is higher.'),
        _slot(2, 'Coach the advisor on the handover after the call ends.', 'Coaching mid-shift is the only window I get; saving it for review keeps the same gap open all week.'),
        _slot(3, 'Note the pattern for the weekly quality review.', 'A pattern of the same advisor needing handover support deserves a structured conversation, not a one-off chat.'),
      ),
      interruption_response: _interrFired(
        'The advisor you were about to coach has just told you they are having a difficult time at home. They ask if the conversation can wait until next week.',
        [
          _slot(1, 'Authorise the goodwill refund within my published authority.', 'The refund decision is independent of the personal context; the customer is still on the line.'),
          _slot(2, 'Have a short check-in with the advisor today rather than the coaching conversation.', 'Their wellbeing comes first; a check-in still happens, just a different one.'),
          _slot(3, 'Reschedule the structured coaching for next week as they asked.', 'Pushing through coaching now would damage the relationship and not stick; defer it cleanly.'),
        ],
        'I changed slot 2 because the human context genuinely changes the right answer; I held slot 1 because the customer issue is unrelated.',
        true
      ) },
    { scenario_index: 2, time_taken_seconds: 194,
      ranked_actions: _ra(
        _slot(1, 'Reallocate two advisors from email to the live queue.', 'Live queue is the bottleneck and the SLA risk; email can run two hours late without breach.'),
        _slot(2, 'Pin a holding message on the chatbot for high-volume topics.', 'Most callers are asking the same three questions; a holding message removes some of the inbound.'),
        _slot(3, 'Brief the duty manager on the situation.', 'They should not hear about a queue spike from the dashboard.'),
      ),
      interruption_response: _interrSkipped },
    { scenario_index: 3, time_taken_seconds: 291,
      ranked_actions: _ra(
        _slot(1, 'Open the regulator complaint file and confirm the response window.', 'Missing the formal window is the most expensive mistake of the day.'),
        _slot(2, 'Draft the response with the duty manager rather than alone.', 'Two pairs of eyes on a regulator response is policy; doing it alone is the hesitation, not the safety move.'),
        _slot(3, 'Log the complaint against any pattern in the team.', 'A single complaint is information; a pattern is a coaching plan.'),
      ),
      interruption_response: _interrSkipped },
  ],

  // Alex Turner, Customer Service Advisor, Solid rapid screen (71): tight,
  // sensible rankings within the rapid-screen format. The interruption gate
  // does not fire on his scenarios in the demo so the report shows two clean
  // ranked-action blocks with no interruption row.
  'demo-c11': [
    { scenario_index: 0, time_taken_seconds: 285,
      ranked_actions: _ra(
        _slot(1, 'Take the angry customer first, by name.', 'Tone matters more than the order on a queue this size; them feeling heard is half the resolution.'),
        _slot(2, 'Send a holding email to the slower-moving query.', 'Stops them escalating while I deal with the live call.'),
        _slot(3, 'Log both calls before I forget the detail.', 'Documenting cold an hour later loses the specifics.'),
      ),
      interruption_response: _interrSkipped },
    { scenario_index: 1, time_taken_seconds: 142,
      ranked_actions: _ra(
        _slot(1, 'Apologise, then explain the next step.', 'Apology first defuses; explanation second moves it forward.'),
        _slot(2, 'Offer the goodwill refund within the published threshold.', 'It is within my authority and the right call; hesitating sends them up the line.'),
        _slot(3, 'Note the call so the team sees the pattern.', 'A note now beats trying to remember at end of week.'),
      ),
      interruption_response: _interrSkipped },
  ],
}

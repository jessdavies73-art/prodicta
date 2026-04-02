// ── Static demo data, no database calls ──────────────────────────────────

export const DEMO_ASSESSMENTS = [
  { id: 'demo-assess-1', role_title: 'Marketing Manager', status: 'active' },
  { id: 'demo-assess-2', role_title: 'Sales Executive', status: 'active' },
  { id: 'demo-assess-3', role_title: 'Software Developer', status: 'active' },
]

export const DEMO_CANDIDATES = [
  {
    id: 'demo-c1',
    name: 'Sophie Chen',
    email: 's.chen@demorecruit.com',
    status: 'completed',
    invited_at: '2024-03-01T09:00:00Z',
    completed_at: '2024-03-02T14:22:00Z',
    rating: 5,
    assessments: { id: 'demo-assess-1', role_title: 'Marketing Manager', job_description: '', skill_weights: {} },
    results: [{ overall_score: 92, risk_level: 'Very Low', percentile: 'Top 5%', pressure_fit_score: 88, pass_probability: 94 }],
  },
  {
    id: 'demo-c2',
    name: 'Marcus Williams',
    email: 'm.williams@demorecruit.com',
    status: 'completed',
    invited_at: '2024-03-03T11:15:00Z',
    completed_at: '2024-03-04T09:50:00Z',
    rating: 3,
    assessments: { id: 'demo-assess-1', role_title: 'Marketing Manager', job_description: '', skill_weights: {} },
    results: [{ overall_score: 74, risk_level: 'Low', percentile: 'Top 28%', pressure_fit_score: 71, pass_probability: 76 }],
  },
  {
    id: 'demo-c3',
    name: 'Priya Patel',
    email: 'p.patel@demorecruit.com',
    status: 'completed',
    invited_at: '2024-03-05T14:00:00Z',
    completed_at: '2024-03-06T16:40:00Z',
    rating: 3,
    assessments: { id: 'demo-assess-2', role_title: 'Sales Executive', job_description: '', skill_weights: {} },
    results: [{ overall_score: 61, risk_level: 'Medium', percentile: 'Top 47%', pressure_fit_score: 58, pass_probability: 63 }],
  },
  {
    id: 'demo-c4',
    name: "James O'Brien",
    email: 'j.obrien@demorecruit.com',
    status: 'completed',
    invited_at: '2024-03-07T10:30:00Z',
    completed_at: '2024-03-07T15:55:00Z',
    rating: 2,
    assessments: { id: 'demo-assess-2', role_title: 'Sales Executive', job_description: '', skill_weights: {} },
    results: [{ overall_score: 35, risk_level: 'High', percentile: 'Bottom 22%', pressure_fit_score: 32, pass_probability: 30 }],
  },
  {
    id: 'demo-c5',
    name: 'Elena Rodriguez',
    email: 'e.rodriguez@demorecruit.com',
    status: 'completed',
    invited_at: '2024-03-08T08:45:00Z',
    completed_at: '2024-03-09T11:10:00Z',
    rating: 4,
    assessments: { id: 'demo-assess-3', role_title: 'Software Developer', job_description: '', skill_weights: {} },
    results: [{ overall_score: 85, risk_level: 'Low', percentile: 'Top 12%', pressure_fit_score: 82, pass_probability: 88 }],
  },
  {
    id: 'demo-c6',
    name: 'Tom Fletcher',
    email: 't.fletcher@demorecruit.com',
    status: 'pending',
    invited_at: '2024-03-10T09:00:00Z',
    completed_at: null,
    rating: null,
    assessments: { id: 'demo-assess-1', role_title: 'Marketing Manager', job_description: '', skill_weights: {} },
    results: [],
  },
  {
    id: 'demo-c7',
    name: 'Aisha Johnson',
    email: 'a.johnson@demorecruit.com',
    status: 'pending',
    invited_at: '2024-03-11T13:30:00Z',
    completed_at: null,
    rating: null,
    assessments: { id: 'demo-assess-2', role_title: 'Sales Executive', job_description: '', skill_weights: {} },
    results: [],
  },
  {
    id: 'demo-c8',
    name: 'Ryan Murphy',
    email: 'r.murphy@demorecruit.com',
    status: 'scoring_failed',
    invited_at: '2024-03-09T15:20:00Z',
    completed_at: '2024-03-09T16:55:00Z',
    rating: null,
    assessments: { id: 'demo-assess-3', role_title: 'Software Developer', job_description: '', skill_weights: {} },
    results: [],
  },
  {
    id: 'demo-c9',
    name: 'David Thompson',
    email: 'd.thompson@demorecruit.com',
    status: 'archived',
    invited_at: '2024-02-15T10:00:00Z',
    completed_at: '2024-02-16T14:20:00Z',
    rating: 3,
    assessments: { id: 'demo-assess-1', role_title: 'Marketing Manager', job_description: '', skill_weights: {} },
    results: [{ overall_score: 58, risk_level: 'Medium', percentile: 'Top 52%', pressure_fit_score: 54, pass_probability: 60 }],
  },
]

export function getDemoCandidatesFull() {
  return DEMO_CANDIDATES.filter(c => c.status === 'completed').map(c => {
    const full = DEMO_RESULTS[c.id]
    if (!full) return c
    return { ...c, results: [{ ...c.results[0], ...full }] }
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

export const DEMO_BENCHMARK_SKILLS = [
  'Strategic Communication',
  'Negotiation & Objection Handling',
  'Problem Solving',
  'Delivery Focus',
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
    confidence_level: 'High',
    trajectory: 'Improving',
    seniority_fit_score: 88,
    risk_reason: 'Exceptional response quality across all four scenarios. No integrity flags, high consistency, and evidence of deep strategic thinking throughout. Scores in the 88-94 range across every assessed dimension place this candidate comfortably in the top 5% of Marketing Manager candidates assessed.',
    ai_summary: `Sophie Chen is one of the strongest Marketing Manager candidates we have assessed. Her responses demonstrate a sophisticated understanding of brand strategy, stakeholder alignment, and data-led decision-making that is typically associated with candidates operating at Head of Marketing level. She writes with precision and authority, and every response includes specific, defensible reasoning rather than generic frameworks.

In the stakeholder conflict scenario (Scenario 2), Sophie identified competing priorities between the sales and product teams without prompting, proposed a structured escalation process, and suggested a shared KPI framework — all within a coherent narrative. She quoted her own thinking directly: "I'd want to understand what each team is actually optimising for before I try to resolve anything." This level of systems thinking is rare at this career stage and signals someone who builds durable solutions rather than temporary fixes.

Her data analysis response (Scenario 4) was particularly impressive. Rather than defaulting to vanity metrics, she anchored her measurement framework around pipeline contribution and cost-per-acquisition, referencing cohort analysis and attribution modelling as standard tools in her workflow. She wrote: "I'd set a 90-day target of 15% improvement in MQL-to-SQL conversion, report on it weekly, and if we're not tracking by week six, I'd adjust the lead qualification criteria." This indicates genuine analytical maturity that most Marketing Managers develop only after several years in the role.

The one watch-out — a tendency toward over-planning before committing to action — is very minor and easily managed with a structured 30-60-90 day onboarding plan that includes early quick wins. She acknowledged this pattern herself in her response, which is a strong signal of self-awareness. This trait is more risk in fast-moving consumer environments than in B2B or mid-market contexts.

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
        narrative: 'When presented with a frustrated internal stakeholder, Sophie\'s first move was to acknowledge the emotional register of the situation before addressing the substantive disagreement. She wrote: "I would start by genuinely listening to understand what\'s driving the frustration — not to placate them, but because the frustration is usually telling me something useful about what\'s broken in the process." This response signals emotional maturity and the ability to separate the person from the problem. She then reframed the conversation around shared commercial goals rather than defending her position, which is notably more sophisticated than most Marketing Manager candidates who either avoid conflict or match the other person\'s emotional temperature. She proposed a specific resolution pathway rather than deferring to management. In their first 90 days, this suggests they will likely de-escalate early tensions with sales or product teams effectively, building the cross-functional trust that is critical in the first quarter of any senior marketing hire.',
      },
      prioritisation_under_load: {
        score: 88,
        verdict: 'Strength',
        narrative: 'Sophie\'s triage framework was explicit and reproducible. She separated urgent-and-important from urgent-but-deferrable using named criteria, and proactively identified which stakeholder she would communicate a delay to and why that specific person needed to be informed first. The key insight in her response was her recognition that "prioritisation is partly a communication problem — if the right people know about the trade-offs, they can help you make the right call." This systems-level awareness of how information flows through an organisation is unusual at this career stage. She did not simply list priorities; she explained dependencies, estimated effort-to-impact ratios, and considered the downstream consequences of each choice. In their first 90 days, this suggests they will likely build clear, transparent communication norms around priority decisions quickly, preventing the ambiguity that wastes team time in the first quarter.',
      },
      ownership_accountability: {
        score: 87,
        verdict: 'Strength',
        narrative: 'Sophie\'s language patterns throughout were markedly first-person and active. When describing a past campaign that underperformed, she used "I decided," "I misjudged the channel mix," and "I changed the approach after week three" — never deflecting to the team, the brief, or external market factors. She also framed accountability prospectively, articulating what she would monitor, what the trigger for intervention would be, and how she would communicate a course correction to senior stakeholders. This level of forward-looking ownership is a reliable predictor of how a candidate will handle the inevitable setbacks of any new role. She treated past failures as data rather than as events to explain away. In their first 90 days, this suggests they will likely own their early mistakes transparently, course-correct quickly rather than waiting for a formal review, and set a strong accountability norm for the teams they manage.',
      },
    },
    scores: {
      'Strategic Communication': 91,
      'Stakeholder Management': 93,
      'Data & Analytics': 88,
      'Campaign Strategy': 94,
    },
    score_narratives: {
      'Strategic Communication': 'Articulates complex marketing concepts clearly and adjusts her communication style to the audience. Demonstrated awareness of how messaging lands differently across exec, agency, and operational stakeholders. In Scenario 1, she drafted an email that balanced urgency with reassurance — a skilled tonal choice under pressure.',
      'Stakeholder Management': 'Showed exceptional skill in navigating cross-functional tension in Scenario 2. Her approach was structured, showed genuine political awareness, and proposed a resolution that gave both parties a visible win. This is the dimension most correlated with long-term success in senior marketing roles.',
      'Data & Analytics': 'References attribution modelling, cohort analysis, and cost-per-acquisition as standard tools. Measurement frameworks are outcome-focused rather than activity-focused. In Scenario 4, she proposed a specific 90-day measurement cadence with named metrics and intervention triggers.',
      'Campaign Strategy': 'Strong integrated thinking across paid, owned, and earned channels. Her campaign framework included a testing-and-iteration phase as standard and explicitly allocated budget for learning rather than pure delivery — a sign of strategic maturity.',
    },
    strengths: [
      {
        strength: 'Systems-level strategic thinking',
        explanation: 'Sophie consistently zooms out to identify upstream causes rather than treating symptoms. Her solution to the brand inconsistency scenario addressed both the process failure and the cultural misalignment that caused it, rather than just fixing the immediate problem.',
        evidence: 'The real problem isn\'t the rogue post — it\'s that we don\'t have a clear enough brand voice guide that junior team members can apply without asking for sign-off on every piece.',
      },
      {
        strength: 'Data-driven accountability with specific targets',
        explanation: 'She frames marketing activities in terms of business outcomes and holds herself to measurable, time-bound standards. The specificity of her targets ("15% improvement in MQL-to-SQL conversion by week six") is rare at this level.',
        evidence: 'I\'d set a 90-day target of 15% improvement in MQL-to-SQL conversion, report on it weekly, and if we\'re not tracking toward it by week six, I\'d adjust the lead qualification criteria.',
      },
      {
        strength: 'Constructive stakeholder challenge with evidence',
        explanation: 'Rather than deferring to senior stakeholders, Sophie demonstrates the confidence to respectfully push back with data and a clear rationale. She does this without making it personal.',
        evidence: 'I\'d take the conversation back to the brief. If the direction has changed, the timeline needs to change too — I\'d rather have that conversation early than deliver something off-brief on time.',
      },
    ],
    watchouts: [
      {
        watchout: 'Tendency to over-plan before committing to action',
        severity: 'Low',
        explanation: 'In Scenario 3, Sophie\'s response included an unusually detailed planning phase before any action was taken. In fast-moving environments with shifting priorities, this could slow execution. She acknowledged this tendency herself, which is a positive signal.',
        evidence: 'I\'d want to spend the first two weeks mapping all stakeholders, reviewing the last twelve months of data, and building out a project plan before touching anything.',
        action: 'Set clear action milestones in the 30-60-90 onboarding plan to encourage early wins alongside strategic planning. Frame speed of execution as a valued behaviour in early feedback conversations.',
      },
    ],
    onboarding_plan: [
      {
        week: 1,
        title: 'Stakeholder Listening Tour',
        objective: 'Build a clear picture of the current marketing landscape and establish Sophie\'s credibility with key internal partners before she makes any changes.',
        activities: [
          'Schedule 1:1s with Sales, Product, Customer Success, and Finance leads — Sophie\'s stakeholder intelligence means she will conduct these with exceptional effectiveness. Brief her to listen first and map tensions.',
          'Provide access to the last 12 months of marketing data, campaign reports, and brand assets. Ask for a written summary of observations at end of week — not recommendations yet.',
          'Introduction to the marketing team. Sophie should understand everyone\'s current priorities and pain points before setting her own agenda.',
        ],
        checkpoint: 'Can articulate the three biggest current marketing challenges and the key stakeholder relationships that will define her success in the role, without prompting.',
        involves: ['Line manager', 'Sales lead', 'Product lead', 'Customer Success lead', 'HR — ERA 2025 day-one induction'],
        notes: 'CIPD guidance on new manager onboarding recommends a structured listening phase of at least 5 working days before any strategic decisions are made. This is particularly important for senior hires who may be tempted to act quickly to demonstrate value.',
      },
      {
        week: 2,
        title: 'Audit and Data Baseline',
        objective: 'Establish a rigorous baseline of current marketing performance so that Sophie\'s first strategic decisions are evidence-based rather than intuition-based.',
        activities: [
          'Audit all active campaigns: channel performance, spend, conversion rates, and attribution. Sophie should produce a written summary with her initial hypotheses about what is and isn\'t working.',
          'Review brand consistency across all customer touchpoints — website, email, social, collateral. Identify the gaps that require immediate attention vs. longer-term rebuilding.',
          'Meet with the analytics team or agency to understand current measurement infrastructure and any known gaps in data quality.',
        ],
        checkpoint: 'Has produced a written audit summary covering at least three channels with specific performance data and at least two hypotheses for improvement.',
        involves: ['Line manager', 'Marketing analyst or agency', 'Brand team'],
        notes: 'Providing analytics access on day one is a day-one right under ERA 2025. Ensure all data access is granted before week two begins.',
      },
      {
        week: 3,
        title: 'First Quick Win Delivery',
        objective: 'Counterbalance Sophie\'s planning tendency by requiring a delivered output this week — something small, visible, and impactful that establishes early credibility.',
        activities: [
          'Identify one tactical improvement from the week two audit that Sophie can own and deliver in full this week — a campaign tweak, a brand fix, or a process change. It must be shipped, not proposed.',
          'Run one cross-functional meeting with Sales and Marketing to align on a shared definition of a qualified lead. Sophie should chair this meeting and produce a one-page summary of the agreed definition.',
          'Begin drafting the 90-day strategic roadmap — this should be in outline only this week, with full completion in week five.',
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
          'Present the current-state marketing assessment to the leadership team — what is working, what is not, and the single biggest opportunity Sophie has identified. Keep it to 20 minutes maximum.',
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
          'Prepare and present the full 90-day marketing roadmap — strategy, priorities, resource requirements, and success metrics. This is where Sophie\'s systems thinking will shine.',
          'Formal 30-day probationary review with line manager: review early performance against the onboarding KPIs, gather structured feedback from key stakeholders, and document agreed development areas.',
          'Finalise the team structure and any immediate hiring or agency decisions that need to be made in the next 30 days.',
        ],
        checkpoint: 'Roadmap has been presented and approved in principle by the leadership team. 30-day review is documented with agreed actions and clear progress against onboarding KPIs.',
        involves: ['Line manager', 'HR — ERA 2025 probationary review', 'Leadership team'],
        notes: 'ERA 2025 requires a documented probationary review at 30 days for all new hires on contracts of 6 months or more. Ensure this is completed and signed off before the end of week five.',
      },
      {
        week: 6,
        title: 'Independent Campaign Ownership and 60-Day Planning',
        objective: 'Sophie takes full independent ownership of her first major campaign and sets the agenda for the next 30 days without requiring line manager oversight.',
        activities: [
          'Launch the first campaign that Sophie has planned and owned end-to-end, with a clear measurement framework and a defined review date.',
          'Conduct a structured retrospective on the first five weeks: what went well, what she would do differently, and what she needs from the business in weeks 7-12.',
          'Set the 60-day plan with the line manager — specific campaign targets, team development priorities, and any structural changes she wants to implement.',
        ],
        checkpoint: 'Has launched at least one independently planned campaign with a documented measurement framework. Has produced a 60-day plan agreed with the line manager.',
        involves: ['Line manager', 'Marketing team', 'Analytics team'],
        notes: 'CIPD probation guidance recommends a formal 60-day check-in to assess whether the new hire is on track for a successful probation outcome. Document this meeting.',
      },
    ],
    interview_questions: [
      'In your assessment, when asked how you\'d take over a marketing function, your first instinct was to spend two full weeks on stakeholder mapping and data review before changing anything. Tell me about a real situation where you inherited a team or function mid-flight. What did you actually do in week one, and was there a moment where you had to cut the planning phase short and just act? (Follow-up probe: Looking back, did you wait too long before touching anything — and what did that cost you?)',
      'Your Scenario 4 response described setting a 90-day MQL-to-SQL conversion target, reporting weekly, and adjusting the lead qualification criteria if you weren\'t tracking by week six. That\'s a very specific framework. Walk me through the last time you built a measurement framework from scratch — how long from first draft to live reporting, and how close was the original design to what you were actually tracking three months later? (Follow-up probe: Which metric turned out to be misleading, and how did you discover that?)',
      'Your assessment showed genuine strength in the stakeholder conflict scenario — you proposed a shared KPI framework and structured escalation process, and you identified competing priorities before anyone else named them. Tell me about a time you had to make a significant marketing decision without full stakeholder alignment. What decision was it, and how did you manage the relationships afterward? (Follow-up probe: Is there a version of that decision you wish you\'d made earlier?)',
      'You wrote in your assessment: "I\'d want to spend the first two weeks mapping all stakeholders, reviewing the last twelve months of data, and building out a project plan before touching anything." In this role, the first 30 days will include at least one live campaign requiring decisions before you\'ve had time to map anything. Walk me through how you\'d handle that specific tension — needing to act before you feel ready. (Follow-up probe: Give me a specific example where acting before you felt fully informed produced a better outcome than waiting would have.)',
    ],
  },

  /* ── Marcus Williams, 74, Low ── */
  'demo-c2': {
    overall_score: 74,
    risk_level: 'Low',
    percentile: 'Top 28%',
    pressure_fit_score: 71,
    pass_probability: 76,
    confidence_level: 'High',
    trajectory: 'Stable',
    seniority_fit_score: 72,
    risk_reason: 'Solid overall performance with genuine strengths in campaign execution and stakeholder rapport. Main gap is analytical depth — responses on measurement and data-led decision-making leaned on intuition rather than structured frameworks. This is coachable but requires explicit development focus in onboarding.',
    ai_summary: `Marcus Williams is a competent Marketing Manager candidate with clear strengths in campaign execution and relationship management. His responses show a practical, action-oriented mindset and a good instinct for brand voice that would translate well to most marketing team environments. He writes with energy and conviction, and his stakeholder scenarios in particular reveal someone with genuine experience navigating internal complexity.

His strongest responses were in the stakeholder management and communication scenarios. In Scenario 2, he demonstrated genuine warmth and a pragmatic approach to navigating disagreements, writing: "Before I escalate anything formally, I\'d want to grab a coffee with the sales lead and understand what\'s actually driving the frustration. Nine times out of ten it\'s a communication gap, not a strategic disagreement." This instinct — to diagnose before acting — is a hallmark of effective cross-functional operators and will serve him well in the first 90 days.

The main area of development for Marcus is analytical depth. His data-related response (Scenario 4) leaned heavily on gut feel and experience over structured measurement frameworks. He described managing channel performance by looking at "what\'s driving the most engagement and doubling down on that," without referencing attribution, contribution to revenue, or specific KPI frameworks. This is not disqualifying at this level, but it does suggest he would benefit from structured support on measurement and working alongside a strong marketing analyst.

His pressure-fit scores are solid across the board, with decision speed and composure being particular strengths. The one inconsistency — more cautious in Scenario 2 than in Scenario 4 on a similar type of risk decision — is minor and may reflect contextual reasoning rather than inconsistency. Worth probing in interview.

Hire with structured onboarding. Marcus has the interpersonal skills, execution instinct, and campaign experience to succeed in this role. The analytical gap is real but addressable with the right support in the first 60 days. Pair with a data-oriented analyst from day one and set explicit measurement KPIs in the 30-day review to build this capability early.`,
    integrity: {
      response_quality: 'Likely Genuine',
      quality_notes: 'Responses are substantive and specific, with a consistent conversational voice. Slight length variation between scenarios suggests natural rather than uniform effort distribution. No integrity concerns.',
      consistency_rating: 'Medium',
      consistency_notes: 'Core values and approach are consistent. Minor inconsistency in risk tolerance — more cautious in Scenario 2 than Scenario 4 on a similar type of decision. Low concern.',
      time_analysis: 'Scenario 1 (4m 28s): Normal. Scenario 2 (2m 22s): Fast — slightly brief for scenario complexity, which aligns with the shorter response length observed. Scenario 3 (5m 10s): Normal. Scenario 4 (4m 45s): Normal.',
      red_flags: [],
    },
    pressure_fit: {
      decision_speed_quality: {
        score: 77,
        verdict: 'Strength',
        narrative: 'Marcus made clear decisions without excessive hedging across most scenarios. In the ambiguous prioritisation scenario, he committed to a course of action and articulated his reasoning before seeking consensus — an important distinction between confidence and recklessness. He used decisive language ("I would do X") rather than hedging language ("I might consider") in three of four scenarios. The exception was Scenario 2, where he was more cautious, though this may reflect appropriate context-sensitivity rather than inconsistency. His decisiveness is particularly evident when he has prior experience in the domain — decisions about campaign execution and stakeholder communication were notably more confident than decisions about data-led interventions. In their first 90 days, this suggests they will likely move initiatives forward with appropriate speed in their areas of strength while potentially seeking more validation than necessary in data or analytics decisions.',
      },
      composure_under_conflict: {
        score: 74,
        verdict: 'Moderate',
        narrative: 'Marcus handled the difficult stakeholder scenario reasonably well, relying on rapport, warmth, and relationship-building instinct rather than a structured escalation process. This approach works effectively in environments where trust already exists, but may be less reliable in adversarial or unfamiliar relationships where rapport has not yet been built. He did not become defensive or avoidant — both common failure modes — but he also did not propose a specific resolution pathway or timeline, leaving the outcome somewhat open-ended. He wrote: "I\'d want to rebuild the relationship before we tackle the strategic disagreement" — sound in principle but potentially slow in practice. In their first 90 days, this suggests they will likely handle existing team conflicts with warmth and effectiveness, but may need coaching on how to address tension with new stakeholders where relationship capital hasn\'t yet been established.',
      },
      prioritisation_under_load: {
        score: 68,
        verdict: 'Moderate',
        narrative: 'Marcus identified the right high-level priorities in the multi-demand scenario, but his reasoning was largely intuitive rather than structured. He named what needed to happen first but could not clearly explain the criteria behind the sequence — responding with "you can usually sense what\'s most urgent" rather than a repeatable framework. He did not consider dependencies or the downstream cost of delays, which is a notable gap at Marketing Manager level where prioritisation decisions affect multiple teams. He also did not mention delegation as a tool, suggesting he may be prone to over-loading himself rather than using team capacity effectively. This is coachable with explicit focus. In their first 90 days, this suggests they will likely rely on experience and instinct for prioritisation decisions, which will work well in familiar domains but may create bottlenecks in fast-moving or complex situations.',
      },
      ownership_accountability: {
        score: 72,
        verdict: 'Moderate',
        narrative: 'Marcus generally takes ownership and uses first-person language when describing his role in outcomes. The one instance that stands out is his attribution of a past campaign failure partly to "unclear briefs from the client" — not a red flag on its own, but a pattern worth monitoring. In high-performing marketers, accountability tends to be unconditional: they own the outcome regardless of the brief quality, because they see it as their responsibility to clarify ambiguity before execution. Marcus\'s response suggests he is still developing this unconditional ownership mindset. He did not repeat this pattern in other scenarios, which is encouraging. In their first 90 days, this suggests they will likely demonstrate good personal accountability in most situations, with the potential for occasional external attribution in high-pressure moments — something to watch in early performance conversations.',
      },
    },
    scores: {
      'Strategic Communication': 78,
      'Stakeholder Management': 80,
      'Data & Analytics': 62,
      'Campaign Strategy': 75,
    },
    score_narratives: {
      'Strategic Communication': 'Clear and confident communicator. Strong instinct for tone and audience, though responses occasionally lacked precision on technical marketing concepts. His Scenario 1 email was well-structured and appropriately urgent without being alarmist — a skilled tonal choice.',
      'Stakeholder Management': 'Genuine strength. His response to the cross-functional conflict scenario was warm, pragmatic, and focused on long-term relationship capital. He correctly identified that trust is more valuable than winning a short-term argument — evidence of real experience navigating internal politics.',
      'Data & Analytics': 'The main development area. Response relied on descriptive metrics (impressions, engagement rate) without connecting them to business outcomes. Would benefit from structured measurement coaching in the first 60 days and paired working with a marketing analyst.',
      'Campaign Strategy': 'Solid integrated thinking. Good awareness of channel mix and sequencing. Planning approach is more execution-focused than strategy-first, which suits most mid-market roles but may need development if the role has strong brand or positioning responsibility.',
    },
    strengths: [
      {
        strength: 'Natural stakeholder rapport and political intelligence',
        explanation: 'Marcus builds trust quickly and instinctively adapts his communication style to the person he\'s talking to. In Scenario 2, he correctly diagnosed the root cause as a communication gap rather than a strategic disagreement — a sophisticated read.',
        evidence: 'Before I escalate anything formally, I\'d want to grab a coffee with the sales lead and understand what\'s actually driving the frustration. Nine times out of ten it\'s a communication gap, not a strategic disagreement.',
      },
      {
        strength: 'Bias toward action and pragmatic execution',
        explanation: 'He resists over-engineering and prioritises getting things done. In a fast-moving marketing team, this bias toward action is a genuine asset — he will ship campaigns while others are still in planning.',
        evidence: 'I\'d rather launch a good campaign that we can iterate on than spend six weeks perfecting something that might miss the window entirely.',
      },
    ],
    watchouts: [
      {
        watchout: 'Analytical depth below seniority expectations',
        severity: 'Medium',
        explanation: 'At Marketing Manager level, building and owning measurement frameworks is typically expected. Marcus\'s approach relies on descriptive metrics and intuition rather than structured attribution or ROI modelling. This limits his ability to advocate for marketing investment at board level.',
        evidence: 'For channel performance, I\'d look at what\'s driving the most engagement and double down on that — usually you can sense what\'s working fairly quickly.',
        action: 'Pair with a marketing analyst from day one and agree shared KPIs that connect marketing activity to revenue outcomes. Consider a structured data literacy session in weeks two to three to build confidence with attribution tools.',
      },
      {
        watchout: 'Incomplete accountability in ambiguous situations',
        severity: 'Low',
        explanation: 'Mostly takes ownership, but one response attributed a campaign outcome to "unclear briefs" without acknowledging what he could have done to clarify the brief before delivery. Low risk but worth monitoring in the first performance review.',
        evidence: null,
        action: 'Set clear individual targets (not team-level) in the 30-day review to establish personal accountability norms early. Frame accountability as a leadership behaviour in onboarding conversations.',
      },
    ],
    onboarding_plan: [
      {
        week: 1,
        title: 'Stakeholder Introductions and Landscape Mapping',
        objective: 'Leverage Marcus\'s natural rapport-building to establish strong relationships with key internal partners and understand the political landscape before making any decisions.',
        activities: [
          'Structured 1:1 introductions with Sales, Product, Customer Success, and Finance leads. Marcus should lead these conversations to establish himself — brief him to listen for the current perception of marketing and existing friction points.',
          'Introduction to the marketing team with a focus on understanding each person\'s current priorities, blockers, and working style. Marcus will build these relationships quickly; channel that energy into intelligence-gathering.',
          'Review all active campaigns and the current marketing calendar. Produce a simple summary of what is in-flight, what is paused, and what is planned.',
        ],
        checkpoint: 'Can name the three biggest current cross-functional tensions involving marketing and the two stakeholders whose buy-in is most critical to his success.',
        involves: ['Line manager', 'Sales lead', 'Customer Success lead', 'HR — ERA 2025 day-one induction'],
        notes: 'ERA 2025 requires all day-one employment rights to be communicated on the first day. Ensure Marcus receives his written statement of particulars and any probation documentation before the end of day one.',
      },
      {
        week: 2,
        title: 'Data and Analytics Immersion',
        objective: 'Address the primary assessed gap — analytical depth — by immersing Marcus in the current data infrastructure and building a shared measurement baseline with the analytics function.',
        activities: [
          'Deep-dive session with the marketing analyst or analytics team to review the current measurement stack: which tools are in use, what data is available, and where the known gaps are. Marcus should document what he learns.',
          'Review the last six months of campaign performance data with the analyst present. Specifically: how is success currently defined, and how does current reporting connect (or fail to connect) marketing activity to revenue outcomes?',
          'Agree on a set of shared KPIs with Sales that both teams will track. Marcus should drive this conversation — use his stakeholder skills to get Sales buy-in on metrics that matter to marketing.',
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
          'Assign Marcus full ownership of one active campaign — including budget management, channel decisions, and performance reporting. This should be a campaign where his execution instinct will have immediate impact.',
          'Set a specific, measurable performance target for this campaign (not activity metrics — an outcome metric like leads generated, cost per lead, or pipeline contribution). Marcus should agree this target before the campaign runs.',
          'Weekly campaign review with the line manager — not to direct, but to observe Marcus\'s thinking and coach on the analytical dimension if needed.',
        ],
        checkpoint: 'Has independently made at least two campaign decisions (channel allocation, messaging, or targeting) with a documented rationale tied to data, not intuition.',
        involves: ['Line manager', 'Marketing team', 'Analytics team'],
        notes: 'N/A',
      },
      {
        week: 4,
        title: 'Measurement Framework Review and KPI Sign-off',
        objective: 'Establish a repeatable measurement framework that Marcus owns and that connects marketing activity to revenue outcomes — addressing the primary gap identified in this assessment.',
        activities: [
          'Marcus presents his proposed measurement framework to the line manager and analytics team: which metrics will be tracked weekly, monthly, and quarterly, and how each connects to a revenue outcome.',
          '30-day stakeholder feedback session: gather structured feedback from Sales, Product, and the marketing team on Marcus\'s first four weeks. Focus on communication clarity and cross-functional effectiveness.',
          'Review the campaign performance from week three against the agreed target. Marcus should present the results and his interpretation — coach on attribution and root-cause analysis if the narrative is still intuition-based.',
        ],
        checkpoint: 'Has produced and presented a documented measurement framework. Stakeholder feedback is positive on communication and relationship-building. Campaign performance has been reviewed with a data-led narrative.',
        involves: ['Line manager', 'Analytics team', 'Sales lead', 'HR — 30-day probation check-in'],
        notes: 'ERA 2025 recommends a formal probationary check-in at 30 days. This should be documented and signed off by both Marcus and his line manager.',
      },
      {
        week: 5,
        title: '30-Day Review and Strategic Planning',
        objective: 'Complete the formal 30-day probationary review and agree the marketing strategy for the next 60 days, with Marcus driving the agenda.',
        activities: [
          'Formal 30-day probationary review with the line manager. Review performance against onboarding KPIs, provide structured feedback, and document agreed development actions — particularly around analytical capability.',
          'Marcus presents his 60-day marketing strategy: priorities, campaigns, team development, and budget allocation. This should be data-informed — check that he is using the measurement framework developed in week four to justify decisions.',
          'Agree on a personal development plan for the analytical gap: structured training, paired working with the analyst, or both. Set a clear 60-day target for improvement.',
        ],
        checkpoint: 'Formal 30-day review is documented and signed. 60-day marketing strategy has been presented and approved. Development plan for analytical capability is agreed and in writing.',
        involves: ['Line manager', 'HR — ERA 2025 probationary review documentation'],
        notes: 'ERA 2025 statutory probation review must be documented and communicated within 30 working days for all contracts of 6 months or more. Ensure paperwork is completed this week.',
      },
      {
        week: 6,
        title: 'Independent Leadership and 60-Day Planning',
        objective: 'Marcus takes full independent ownership of the marketing function with minimal line manager oversight, and demonstrates measurable progress on the analytical gap.',
        activities: [
          'Marcus chairs his first full marketing team meeting as the lead — setting the agenda, reviewing performance, and making decisions without requiring line manager presence.',
          'Review of the analytical development plan: has Marcus shown measurable improvement in connecting campaign decisions to data? Compare his current reporting to week two as a baseline.',
          'Set goals for months two and three. Marcus should propose these himself, with the line manager reviewing for appropriate ambition and alignment with business priorities.',
        ],
        checkpoint: 'Has chaired a full team meeting independently. Can demonstrate measurable improvement in data-led decision-making compared to week two baseline. Month two and three goals are agreed.',
        involves: ['Line manager', 'Marketing team', 'Analytics team'],
        notes: 'CIPD probation guidance recommends a formal 60-day progress review to assess trajectory and identify any support needed before the full probation review at 90 days.',
      },
    ],
    interview_questions: [
      'In your assessment\'s data scenario, you wrote that you\'d manage channel performance by looking at "what\'s driving the most engagement and doubling down on that" — and that you "can usually sense what\'s working fairly quickly." Walk me through the measurement framework you\'re using right now to evaluate a campaign\'s contribution to revenue. Not engagement — specifically revenue. Which attribution model do you use, and why that one? (Follow-up probe: If a campaign has great engagement but flat pipeline contribution, what does that tell you and what do you do with it?)',
      'Your assessment showed genuine strength in stakeholder rapport — you correctly diagnosed a sales-marketing conflict as a communication gap rather than a strategic disagreement, and your instinct to understand before escalating is sound. But in that same scenario, your response was notably brief compared to your others. Walk me through in more detail how you\'d actually resolve a situation where Sales and Marketing have agreed shared KPIs on paper but each team is still optimising for different things in practice. (Follow-up probe: What happens when the Sales lead disagrees with your interpretation of the data?)',
      'You wrote in your assessment: "I\'d rather launch a good campaign that we can iterate on than spend six weeks perfecting something that might miss the window entirely." Tell me about a specific campaign you launched before it was ready. What were the consequences, and what would you do differently? (Follow-up probe: How do you decide in practice when "good enough to launch" is actually good enough, and who else is in that conversation?)',
      'In your assessment, one response attributed a past campaign outcome partly to "unclear briefs from the client" without mentioning what you could have done differently to clarify the brief before delivery. Walk me through a specific situation where you received an unclear brief — what did you do to get clarity before committing to a delivery date, and what would have happened if you hadn\'t asked those questions? (Follow-up probe: What\'s the earliest warning sign that a brief is going to cause problems later?)',
    ],
  },

  /* ── Priya Patel, 61, Medium ── */
  'demo-c3': {
    overall_score: 61,
    risk_level: 'Medium',
    percentile: 'Top 47%',
    pressure_fit_score: 58,
    pass_probability: 63,
    confidence_level: 'Medium',
    trajectory: 'Stable',
    seniority_fit_score: 55,
    risk_reason: 'Mixed performance across scenarios. Genuine strengths in client communication and persistence, offset by concerning gaps in objection handling, pipeline discipline, and composure under closing pressure. The objection-handling gap in particular is a significant risk for a Sales Executive role in competitive environments.',
    ai_summary: `Priya Patel presents a mixed profile for the Sales Executive role. Her clearest strength is client communication — she writes with warmth and clarity and demonstrates genuine interest in understanding client needs before presenting solutions. In Scenario 1, she wrote: "I wouldn\'t go into that call with a prepared pitch. I\'d spend the first fifteen minutes asking about what\'s changed in their business and what they\'re trying to solve right now." This discovery-first instinct is genuinely valuable and not universally present in Sales Executive candidates.

However, her performance on the negotiation and closing scenarios raised meaningful concerns. In the objection-handling scenario (Scenario 3), she became somewhat defensive when the prospect challenged her on pricing. Her response focused on justifying the product rather than reframing the value proposition or moving the conversation forward — a pattern that can cost deals in competitive environments. She did not attempt to understand the underlying concern before responding, which is a standard negotiation best practice at this level.

Her pipeline management response showed reasonable awareness of CRM disciplines but lacked the precision expected at Sales Executive level. She described managing her pipeline "intuitively" rather than referencing specific stage-exit criteria or velocity metrics. In Scenario 4, when asked how she identifies at-risk deals, she responded: "I can usually tell from the tone of the last conversation." This intuitive approach works with a warm pipeline but will struggle at scale.

The pressure-fit scores tell a consistent story: Priya operates with confidence in early-stage, relationship-building contexts and loses some composure when deals face direct pressure or when she is required to commit to a close. This is a learnable pattern but requires conscious and structured development.

Proceed with caution — specific risks identified. Priya has the raw material to become a strong Sales Executive, but hiring her for a role that requires significant new business acquisition, competitive deal-making, or high-volume closing will require an explicit, structured development programme from day one. If the role is more account management and relationship-led, the risk profile is considerably lower.`,
    integrity: {
      response_quality: 'Likely Genuine',
      quality_notes: 'Responses are genuine and personally written. Two responses were shorter than expected for scenario complexity — this contributed to the Medium confidence rating rather than any authenticity concern. Language and style are consistent throughout.',
      consistency_rating: 'Medium',
      consistency_notes: 'Good consistency in communication style and values. Some inconsistency in confidence level — self-assured in early-stage scenarios but noticeably more hesitant in closing and negotiation contexts.',
      time_analysis: 'Scenario 1 (4m 55s): Normal. Scenario 2 (2m 38s): Fast — shorter response aligned with observed length. Scenario 3 (4m 2s): Normal. Scenario 4 (24m 10s): Extended — response time was atypically long, suggesting careful consideration or distraction.',
      red_flags: [],
    },
    pressure_fit: {
      decision_speed_quality: {
        score: 62,
        verdict: 'Moderate',
        narrative: 'Priya made reasonable decisions across most scenarios but consistently hedged with qualifiers that signal incomplete commitment. Phrases like "I would probably approach it this way" and "I think I\'d start by" appeared in three of four scenarios. In a sales context, this language pattern matters — prospects read hesitancy in salespeople and it can undermine trust at critical moments in a deal cycle. She did make clear decisions in Scenario 1 (discovery approach) where she was on familiar ground, but reverted to hedged language in Scenario 3 (objection handling) where the stakes were higher. This pattern — decisiveness in comfort zones, hesitancy under pressure — is a meaningful predictor of how she will perform in late-stage, high-pressure deal situations. In their first 90 days, this suggests they will likely handle early pipeline stages confidently but may need coaching support to commit to closing conversations and to use more decisive language when it matters most.',
      },
      composure_under_conflict: {
        score: 55,
        verdict: 'Moderate',
        narrative: 'When a prospect challenged her value proposition directly in Scenario 3, Priya\'s initial response was to defend the product\'s features rather than acknowledge the prospect\'s concern and reframe the conversation. She wrote: "The price point is based on everything that\'s included in the package — the integrations, the support, the onboarding." This is a justification response, not a reframe — and it is the most common failure mode in sales objection handling. Her composure improved in the second half of her response, where she attempted to understand the prospect\'s perspective, but the initial defensive instinct is the pattern that will show up in live selling situations. Under sustained pressure from a sophisticated buyer, this pattern is likely to extend deal cycles or result in unnecessary concessions. In their first 90 days, this suggests they will likely need structured coaching on objection handling before being given solo responsibility for competitive deals. Call review sessions with a senior rep will be particularly valuable in this period.',
      },
      prioritisation_under_load: {
        score: 60,
        verdict: 'Moderate',
        narrative: 'In the pipeline management scenario, Priya identified the right categories of deals to prioritise (deals that are close to closing, accounts with an upcoming renewal) but could not articulate the specific criteria she uses to make those prioritisation decisions. She described her process as "keeping a mental list of where each deal is and how it\'s feeling," which suggests her prioritisation is experience-based rather than systematic. At scale — managing 20 or more accounts — this approach will create blind spots and missed opportunities. She did not reference velocity, time-in-stage, or any specific pipeline metrics, and did not mention what triggers an escalation or a conversation with her manager. In their first 90 days, this suggests they will likely manage a small pipeline effectively through intuition and effort, but will need explicit training on systematic pipeline management before taking on a full quota-bearing role.',
      },
      ownership_accountability: {
        score: 56,
        verdict: 'Moderate',
        narrative: 'Priya takes responsibility in most scenarios, but one response was notable: when describing a lost deal, she attributed the outcome primarily to "market timing" and "the prospect not being ready" without acknowledging what she might have done differently at the qualification or objection stage. In sales roles, this pattern of external attribution for lost deals is a meaningful warning signal — it suggests the candidate may struggle to self-diagnose and improve their own technique over time. She did not repeat this pattern in other scenarios, and her language in early-stage scenarios was consistently first-person and active ("I would," "I\'ll"). The attribution gap appears specifically around outcomes she perceived as outside her control. In their first 90 days, this suggests they will likely demonstrate good day-to-day accountability but may need coaching to develop the habit of conducting structured deal retrospectives on losses, regardless of the apparent external cause.',
      },
    },
    scores: {
      'Client Communication': 74,
      'Negotiation & Objection Handling': 48,
      'Pipeline Management': 60,
      'Closing & Deal Progression': 55,
    },
    score_narratives: {
      'Client Communication': 'Clear strength. Priya writes with warmth and genuine curiosity, asks good discovery questions, and positions herself as a partner rather than a vendor. In Scenario 1, she refused to lead with a pitch — a discipline that will build trust with prospects and is a strong foundation for long-term account relationships.',
      'Negotiation & Objection Handling': 'The primary gap. Her response to a pricing objection was defensive and product-focused rather than value-focused. She did not acknowledge the prospect\'s concern before responding, which is the first rule of effective objection handling. This is the single biggest risk for a competitive sales environment.',
      'Pipeline Management': 'Reasonable awareness of CRM hygiene and stage management. Could not define specific stage-exit criteria, suggesting her approach is more habitual than systematic. Will struggle at scale without explicit framework development.',
      'Closing & Deal Progression': 'Hesitant in closing scenarios. Did not attempt a trial close in the appropriate scenario and used soft language ("when you\'re ready," "no pressure") that can unintentionally extend sales cycles and reduce urgency.',
    },
    strengths: [
      {
        strength: 'Genuine client curiosity and discovery-first instinct',
        explanation: 'Priya consistently leads with questions rather than pitches and demonstrates authentic interest in the client\'s situation. This builds trust and surfaces information that drives more effective proposals. It is a genuine differentiator in relationship-led sales roles.',
        evidence: 'I wouldn\'t go into that call with a prepared pitch. I\'d spend the first fifteen minutes asking about what\'s changed in their business and what they\'re trying to solve right now.',
      },
      {
        strength: 'Persistence without pressure — value-led follow-up',
        explanation: 'She maintains contact with prospects over time without becoming aggressive or transactional. Her follow-up strategy is focused on adding value, which builds long-term relationships and positions her as a trusted advisor rather than a quota chaser.',
        evidence: 'I\'d send them something useful — an industry report, a case study that\'s genuinely relevant — before I\'d send a "just checking in" email. I want to be the salesperson they actually want to hear from.',
      },
    ],
    watchouts: [
      {
        watchout: 'Defensive response to pricing and value challenges',
        severity: 'High',
        explanation: 'When a prospect challenged the value proposition, Priya focused on defending the product\'s features rather than understanding the underlying concern and reframing the value. This is the primary risk factor for a Sales Executive role in competitive environments.',
        evidence: 'The price point is based on everything that\'s included in the package — the integrations, the support, the onboarding. When you look at what you\'re getting, it\'s actually very competitive.',
        action: 'Enrol in structured objection-handling training within the first 30 days. Use recorded call reviews to identify the pattern in live situations. Assign a senior sales mentor who can coach in real-time on live deals.',
      },
      {
        watchout: 'Hesitant closing language in late-stage deals',
        severity: 'Medium',
        explanation: 'Uses non-committal language at closing stages that can unintentionally reduce urgency and extend deal cycles. The pattern is learnable but requires conscious correction.',
        evidence: 'I\'d probably leave the ball in their court at that stage — let them come to me when they\'re ready.',
        action: 'Provide specific closing techniques and trial-close questions to practise. Include a closing language audit in call review sessions for the first two months.',
      },
    ],
    onboarding_plan: [
      {
        week: 1,
        title: 'Shadowing and Product Orientation',
        objective: 'Build Priya\'s product knowledge and expose her to best-practice objection handling and closing techniques through observation before she has any solo client contact.',
        activities: [
          'Shadow two senior sales reps through a full deal cycle, from first discovery call to close. Focus specifically on objection-handling moments and closing techniques — Priya should take notes on the specific language used.',
          'Complete full product training with the product or customer success team. She should be able to articulate the value proposition in three different ways by the end of the week — not feature-led but outcome-led.',
          'Review the company\'s sales playbook and pipeline stage definitions. Priya should map these to her existing mental model and note any differences from her previous role.',
        ],
        checkpoint: 'Can articulate the product\'s value proposition in outcome-based language without referring to features. Has observed at least two complete sales conversations including one objection-handling moment.',
        involves: ['Line manager', 'Senior sales reps (x2)', 'Product team', 'HR — ERA 2025 day-one induction'],
        notes: 'ERA 2025 requires all day-one rights to be communicated on the first day. Ensure Priya receives her written statement of particulars and probation terms before the end of day one.',
      },
      {
        week: 2,
        title: 'Supervised Discovery Calls',
        objective: 'Build Priya\'s confidence in the part of the process where she is strongest — early-stage discovery — while building product familiarity and ICP knowledge before introducing pressure-stage scenarios.',
        activities: [
          'Conduct discovery calls only — no pitching, no closing, no objection handling. Priya should lead each call with a senior rep present for support. Debrief after each call on what questions were most effective.',
          'Complete ICP (Ideal Customer Profile) training: which types of organisations are the best fit, what signals indicate readiness to buy, and what disqualification criteria should trigger an early stage exit.',
          'First 1:1 with the sales manager to set personal performance targets for the 30-day review. Targets should be activity-based (calls made, discovery calls completed) rather than revenue-based in weeks one to four.',
        ],
        checkpoint: 'Has led at least five discovery calls independently (with observer present). Can accurately identify whether a prospect matches the ICP without prompting from her manager.',
        involves: ['Line manager', 'Senior sales rep (as observer)', 'Sales manager'],
        notes: 'CIPD guidance on sales onboarding recommends separating skills development phases — discovery skills before negotiation and closing skills — to build competence sequentially rather than all at once.',
      },
      {
        week: 3,
        title: 'Objection Handling Training and Role-Play',
        objective: 'Address the primary assessed gap — objection handling — through structured training and practised role-play before Priya encounters live objections solo.',
        activities: [
          'Structured objection-handling training session with the sales manager: the LAER framework (Listen, Acknowledge, Explore, Respond). Role-play at least five common objections including the pricing objection identified in the assessment.',
          'Listen back to recorded sales calls featuring senior reps handling objections. Priya should identify and note the specific language patterns used — particularly how reps acknowledge before responding.',
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
          'Agree on specific stage-exit criteria for each pipeline stage — Priya should write these down and share with the sales manager. This builds the systematic pipeline approach that was absent in the assessment.',
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
        involves: ['Line manager', 'Sales manager', 'HR — ERA 2025 probationary review'],
        notes: 'ERA 2025 requires a documented probationary review at 30 days for contracts of 6 months or more. Ensure this is completed and signed before the end of week five.',
      },
      {
        week: 6,
        title: 'First Full Solo Deals and 60-Day Planning',
        objective: 'Priya handles her first complete deal cycles with minimal supervision, demonstrating measurable improvement in the two primary gaps: objection handling and closing language.',
        activities: [
          'Priya manages at least two full deal cycles independently this week — from discovery to close attempt. The sales manager is available for coaching but does not observe unless requested.',
          'Deal retrospective on any closed or lost deals from this week: Priya leads a structured review of what happened at each stage, with specific focus on objection-handling and closing moments.',
          'Set 60-day and 90-day individual sales targets with the line manager. These should now include revenue targets in addition to activity targets.',
        ],
        checkpoint: 'Has managed at least two full deal cycles independently. Deal retrospective shows evidence of LAER framework use in at least one live objection-handling situation. 60-day and 90-day revenue targets are agreed.',
        involves: ['Line manager', 'Sales manager'],
        notes: 'CIPD probation guidance recommends a 60-day check-in to assess whether the new hire is on track for a successful probation outcome. Document the meeting and any agreed actions.',
      },
    ],
    interview_questions: [
      'In your assessment\'s objection-handling scenario, when a prospect challenged your pricing, your response was: "The price point is based on everything that\'s included in the package — the integrations, the support, the onboarding. When you look at what you\'re getting, it\'s actually very competitive." That\'s a justification, not a reframe. Walk me through what you\'d actually say next if the prospect responded: "I hear you, but the competitor is still 20% cheaper and covers 90% of what we need." (Follow-up probe: At what point in that conversation would you consider a discount, and what would you need to know before offering one?)',
      'Your assessment showed hesitancy at the close — you wrote "I\'d probably leave the ball in their court at that stage — let them come to me when they\'re ready." Tell me about the last deal you actively had to push toward a decision. What specifically did you say to create urgency, and how did the prospect respond? (Follow-up probe: Word for word, what\'s your go-to language when you need to move a prospect toward a commitment without coming across as pressuring them?)',
      'In your pipeline scenario, you described your process as "keeping a mental list of where each deal is and how it\'s feeling." Walk me through your actual pipeline right now — how many deals are in each stage, what are your specific criteria for moving a deal from one stage to the next, and how do you identify which accounts are genuinely progressing versus going quiet? (Follow-up probe: What\'s your personal trigger for having a close-or-kill conversation with a prospect, and what does that conversation look like?)',
      'Your assessment\'s discovery scenario was your strongest response — you wrote: "I wouldn\'t go into that call with a prepared pitch. I\'d spend the first fifteen minutes asking about what\'s changed in their business and what they\'re trying to solve right now." Tell me about a discovery call where one of your questions uncovered something that completely changed how you presented the solution. What was the question, what did it surface, and what did you do with that information? (Follow-up probe: What do you do when a discovery call reveals that the prospect isn\'t actually a good fit for what you\'re selling?)',
    ],
  },

  /* ── James O'Brien, 35, High ── */
  'demo-c4': {
    overall_score: 35,
    risk_level: 'High',
    percentile: 'Bottom 22%',
    pressure_fit_score: 32,
    pass_probability: 30,
    confidence_level: 'Low',
    trajectory: 'Declining',
    seniority_fit_score: 28,
    risk_reason: 'Multiple integrity signals including extremely fast response times on two scenarios and highly generic language suggesting minimal genuine engagement. Core sales competencies are significantly below the required standard across all four assessed dimensions. Overall score of 35 represents a high probability of probation failure.',
    ai_summary: `James O'Brien's assessment results do not support progression for the Sales Executive role. The combination of authenticity concerns, below-benchmark skill scores across all four dimensions, and very low pressure-fit performance creates a high risk of probation failure if hired. This recommendation is based on the assessment evidence alone and should be considered alongside any other information gathered during the recruitment process.

The integrity analysis identified two scenarios (Scenarios 1 and 3) where response times were unusually low — 71 seconds and 84 seconds respectively, for scenarios with a minimum complexity warranting three to five minutes. The language used across all four responses was notably generic, relying on stock phrases like "customer-centric approach" and "pipeline hygiene" without the specific context, named examples, or decision-making logic that characterises genuine sales experience. This pattern is consistent with responses that were generated or heavily assisted rather than written from experience.

On the substance of his responses, the fundamental sales competencies assessed — objection handling, value-based selling, and pipeline discipline — were all below the threshold for this role. His approach to closing was entirely passive ("I\'d leave the ball in their court and wait for them to come back"), and his negotiation response showed a consistent pattern of immediate price concession as the first response to resistance: "I\'d probably look at what we could do on the price to make it work for them." This is a significant commercial risk that will compress margins on every deal.

The pressure-fit scores are the lowest we have observed in this role type. All four dimensions — decision speed, composure under conflict, prioritisation, and ownership — are below 40. In the conflict scenarios, James consistently chose to defer, reflect, and circle back rather than addressing the challenge directly. This pattern of avoidance, combined with the commercial risk of immediate price concession, creates a profile that is unlikely to succeed in a competitive sales environment.

Not recommended at this stage. The evidence across all four scenarios consistently indicates a candidate who is either not ready for this role level or whose responses do not accurately represent their capabilities. If the panel wishes to proceed, the interview questions below are designed specifically to probe whether genuine sales experience exists beneath the surface-level responses observed here. A structured work trial or sales simulation prior to offer would be strongly recommended.`,
    integrity: {
      response_quality: 'Possibly AI-Assisted',
      quality_notes: 'Two of four responses were completed in under 90 seconds — atypically fast for scenario complexity. Language patterns are generic and lack the specific examples, proper nouns, and personal voice typically associated with genuine experience. Internal inconsistency between Scenario 2 and Scenario 4 on stated values.',
      consistency_rating: 'Low',
      consistency_notes: 'Significant inconsistency between Scenario 1 and Scenario 3 on the same type of stakeholder challenge. Values described in Scenario 2 contradict behaviours described in Scenario 4.',
      time_analysis: 'Scenario 1 (1m 11s): Rushed — significantly under the 3-5 minute minimum for this scenario complexity. Responses at this speed are unlikely to reflect genuine deliberation. Scenario 2 (4m 3s): Normal. Scenario 3 (1m 24s): Rushed — second scenario completed in under 90 seconds. Scenario 4 (1m 52s): Fast — below expected engagement time.',
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
        narrative: 'James\'s responses to ambiguous decision scenarios were surface-level and did not demonstrate genuine decision-making logic. Decisions were stated without supporting reasoning — he described what he would do without explaining why, which is the critical differentiator between a considered decision and a guessed one. In Scenario 1, he wrote "I\'d prioritise the highest-value accounts first" without identifying which accounts those were, what made them high-value, or what he would do with lower-value accounts in the meantime. This absence of reasoning is consistent with responses that were generated quickly rather than considered carefully — a pattern reinforced by the sub-90-second response time on this scenario. Decisive sales professionals justify their decisions with evidence and context; James provided neither. In their first 90 days, this suggests they will likely struggle to make confident, defensible decisions in novel or high-pressure situations and may over-rely on manager direction to resolve ambiguity.',
      },
      composure_under_conflict: {
        score: 30,
        verdict: 'Concern',
        narrative: 'James consistently avoided the core challenge in both conflict scenarios rather than engaging with it directly. In Scenario 3, when a prospect directly challenged his pricing and value proposition, he wrote: "I\'d probably take some time to reflect on the feedback and come back with a revised proposal — I don\'t want to push back in the moment." This is a textbook avoidance response and represents the single largest risk in a Sales Executive role. Effective salespeople address objections in the moment, not in a follow-up email. The pattern of "reflect and circle back" appeared in two of four scenarios, which suggests it is a habitual response to conflict rather than a situational one. In Scenario 2, he similarly proposed to "take the feedback on board and come back with a plan" rather than addressing the concern directly. In their first 90 days, this suggests they will likely avoid difficult prospect conversations, extend deal cycles through deferred conflict, and require significant coaching before they can handle a sophisticated buyer directly.',
      },
      prioritisation_under_load: {
        score: 34,
        verdict: 'Concern',
        narrative: 'James\'s response to the multi-demand prioritisation scenario used generic framework language ("urgent versus important matrix") without applying it to the specific situation presented. He named the framework but made no concrete prioritisation decisions within the scenario — he did not identify which of the named tasks were urgent, which were important, or what order he would address them in. This is a meaningful gap: the ability to name a framework is not the same as the ability to use it. When asked directly to rank the competing demands, his response was: "I\'d work through them systematically to make sure nothing was missed." This tells us nothing about the actual prioritisation logic he would apply. In their first 90 days, this suggests they will likely manage a small, simple workload adequately but will struggle significantly when competing demands arise or when they need to make explicit trade-offs about where to spend their time.',
      },
      ownership_accountability: {
        score: 28,
        verdict: 'Concern',
        narrative: 'Multiple instances of passive language and external attribution appeared across James\'s responses. Two notable examples: "The deal fell through due to market conditions" appeared in Scenario 2 without any acknowledgement of what he might have done differently. "The team wasn\'t aligned" was cited as the reason for a missed target in Scenario 4, again without any personal accountability. In high-performing salespeople, attribution for losses is almost always directed inward — they focus on what they could have done at qualification, discovery, or objection-handling to change the outcome. James\'s pattern of external attribution suggests either a lack of self-awareness or a lack of genuine sales experience to draw on. In combination with the other concerns, this reinforces the integrity flag rather than resolving it. In their first 90 days, this suggests they will likely struggle to self-diagnose and improve their technique independently, requiring intensive manager oversight to identify performance issues before they compound.',
      },
    },
    scores: {
      'Client Communication': 44,
      'Negotiation & Objection Handling': 28,
      'Pipeline Management': 36,
      'Closing & Deal Progression': 30,
    },
    score_narratives: {
      'Client Communication': 'The strongest area, though still below threshold. Some evidence of attempting to understand client needs, but communication is generic and lacks the personalisation expected at Sales Executive level. Responses used customer-centric language without the specific examples or named contexts that indicate genuine client experience.',
      'Negotiation & Objection Handling': 'Significantly below threshold. Immediate concession on pricing without exploring the underlying objection. Did not attempt to qualify whether price was the real concern or a proxy for something else. This pattern, if it reflects real behaviour, will compress deal margins on every negotiation.',
      'Pipeline Management': 'Response used CRM terminology correctly but showed no evidence of actually managing pipeline with discipline. Could not describe specific stage-exit criteria, how he identifies at-risk deals, or what triggers an escalation conversation.',
      'Closing & Deal Progression': 'Passive closing approach throughout. No trial closes attempted in appropriate scenarios. Closing language is entirely non-committal and would extend deal cycles significantly.',
    },
    strengths: [
      {
        strength: 'Awareness of customer-first language and selling philosophy',
        explanation: 'James consistently frames responses using customer-centric language, suggesting an understanding of the expected selling philosophy even if the execution evidence is limited.',
        evidence: 'I always start by understanding what the client actually needs before presenting anything — the solution has to match their situation.',
      },
    ],
    watchouts: [
      {
        watchout: 'Possible AI-assisted responses — integrity concern',
        severity: 'High',
        explanation: 'Two scenarios completed significantly faster than the established baseline for genuine responses. Combined with generic, buzzword-heavy language lacking personal examples and internal inconsistency between scenarios, there is a meaningful concern about response authenticity.',
        evidence: null,
        action: 'If progressing to interview, open with a request for a specific deal story: "Tell me about the last deal you closed — walk me through every stage from first contact to signature." Probe for names, dates, and specifics that would be impossible to fabricate.',
      },
      {
        watchout: 'Immediate price concession under objection pressure',
        severity: 'High',
        explanation: 'In the negotiation scenario, James\'s first response to a pricing challenge was to offer a discount. This pattern — if it reflects real behaviour — creates significant commercial risk and will compress margins on every deal.',
        evidence: 'I\'d probably look at what we could do on the price to make it work for them — there\'s usually some flexibility if the deal is important enough.',
        action: 'If hired, set a strict commercial policy requiring manager approval for any discount over 5%. Monitor deal margin in the first 90 days closely and review every discounted deal in pipeline reviews.',
      },
      {
        watchout: 'Passive avoidance of conflict and difficult conversations',
        severity: 'Medium',
        explanation: 'Pattern of deferring, reflecting, and circling back rather than addressing challenges directly. In a sales role, the ability to have difficult conversations in the moment is non-negotiable.',
        evidence: 'I\'d probably take some time to reflect on the feedback and come back with a revised proposal — I don\'t want to push back in the moment.',
        action: 'Not suitable for roles requiring significant prospecting, negotiation, or stakeholder challenge without intensive coaching. If hired, pair with a structured escalation protocol for all objection-handling situations.',
      },
    ],
    onboarding_plan: [
      {
        week: 1,
        title: 'Supervised Shadow-Only Status',
        objective: 'Establish whether James\'s assessed capabilities reflect genuine gaps or a mismatch between his experience and the assessment format, before any independent client contact is permitted.',
        activities: [
          'Shadow-only status for all client interactions — James observes every call, meeting, and email exchange but does not participate. He should take detailed notes on objection-handling, closing language, and pipeline conversations.',
          'Structured observation debrief with the sales manager after each shadowed call: what did he notice, what would he have done differently, and what questions does he have? His ability to learn from observation is diagnostic.',
          'Structured interview with the sales manager (not a performance review — a diagnostic conversation): walk through a specific deal from his CV in detail. Probe for names, dates, and decisions. This will clarify whether the integrity concerns from the assessment are founded.',
        ],
        checkpoint: 'Sales manager can confirm whether James\'s knowledge and reasoning in the diagnostic conversation matches what his CV and the assessment suggest. Decision to proceed or not is made at the end of week one.',
        involves: ['Line manager', 'Sales manager', 'HR — ERA 2025 probationary terms confirmed on day one'],
        notes: 'ERA 2025 day-one rights must be communicated immediately. Given the assessment concerns, it is recommended that the probation terms explicitly include specific performance milestones with clear pass/fail criteria from the outset.',
      },
      {
        week: 2,
        title: 'Sales Fundamentals Programme',
        objective: 'Assess whether core sales competencies can be developed through structured training, and determine whether continued investment is appropriate.',
        activities: [
          'Structured sales fundamentals training programme covering value-based selling, objection-handling frameworks (specifically LAER), and pipeline stage discipline. This is not product training — it is selling methodology.',
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
        objective: 'Conduct a formal role-play assessment to determine whether core sales competencies are present but underdeveloped, or absent — this determines whether continued investment is justified.',
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
          'Assign James his first supervised pipeline — no solo client contact yet, but he begins managing a set of accounts under the direct supervision of the sales manager, who reviews every communication before it is sent.',
        ],
        checkpoint: 'Formal 30-day review is documented and signed by James, the line manager, and HR. 60-day pass/fail criteria are in writing and agreed.',
        involves: ['Line manager', 'Sales manager', 'HR — ERA 2025 probationary review'],
        notes: 'ERA 2025 requires that probationary reviews are documented and that the employee is given a fair opportunity to respond to any concerns raised. Ensure James has the opportunity to provide his own assessment of his progress before the meeting concludes.',
      },
      {
        week: 5,
        title: 'First Supervised Client Contact',
        objective: 'Assess whether James can apply the skills developed in weeks two to four in a live client context, under direct supervision.',
        activities: [
          'First solo client calls — discovery calls only. The sales manager listens in to every call and provides immediate, specific feedback after each one. No pitching or objection handling in this phase.',
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
        involves: ['Line manager', 'Sales manager', 'HR — ERA 2025 extended probation or exit process'],
        notes: 'ERA 2025 permits probationary periods to be extended once by written agreement if the employer can demonstrate that a fair assessment has not yet been possible. If extending, this must be agreed in writing before the original probation period expires.',
      },
    ],
    interview_questions: [
      'Two of your four assessment scenarios were completed in under 90 seconds — Scenario 1 in around a minute and Scenario 3 in under 90 seconds. Those scenarios typically take three to five minutes of genuine deliberation. Before we explore anything else, I\'d like to ask you directly: walk me through the last deal you personally closed from first contact to signed contract. What was the company, what was the role of the decision-maker who signed, how long did the deal take, and what were the specific objections you had to overcome? (Follow-up probe: What was the hardest moment in that deal — the specific conversation — and what did you say?)',
      'In your assessment\'s negotiation scenario, when a prospect pushed back on pricing, your first response was to explore what flexibility existed on price: "I\'d probably look at what we could do on the price to make it work for them — there\'s usually some flexibility if the deal is important enough." Walk me through your actual process before you offer any discount — what specifically do you need to understand about the prospect\'s position first? (Follow-up probe: Say exactly what you\'d say to a prospect who opens with "your price is too high." Word for word.)',
      'Your assessment\'s conflict scenario showed a consistent pattern of deferring rather than addressing challenges directly — you wrote: "I\'d probably take some time to reflect on the feedback and come back with a revised proposal — I don\'t want to push back in the moment." Tell me about a time you had to respond to a difficult prospect in the moment, with no time to prepare a follow-up. What was the challenge, and what did you actually say? (Follow-up probe: What made it hard to address directly in that conversation, and what would you do differently now?)',
      'Your assessment responses used phrases like "customer-centric approach" and "pipeline hygiene" without specific examples attached to them. I\'d like to test those now. Describe your pipeline management process in concrete detail: how many stages do you use, what are the specific exit criteria for each stage, and how do you identify a deal that\'s at risk before it goes completely quiet? (Follow-up probe: Tell me about the last deal that went quiet on you — what did you do, and what happened?)',
    ],
  },

  /* ── Elena Rodriguez, 85, Low ── */
  'demo-c5': {
    overall_score: 85,
    risk_level: 'Low',
    percentile: 'Top 12%',
    pressure_fit_score: 82,
    pass_probability: 88,
    confidence_level: 'High',
    trajectory: 'Improving',
    seniority_fit_score: 80,
    risk_reason: 'Strong across all assessed dimensions with genuine technical maturity. Minor watch-out around translating technical blockers into business-impact language for non-technical stakeholders — easily addressed with explicit onboarding focus in the first 30 days.',
    ai_summary: `Elena Rodriguez is a strong Software Developer candidate who performed well across all assessed dimensions. Her responses demonstrate genuine technical maturity — not just in problem-solving, but in the way she approaches ambiguity, communicates with stakeholders, and takes ownership of delivery quality. She writes with clarity and specificity, and every response includes concrete reasoning rather than abstract principles.

Her most impressive response was in the production incident scenario (Scenario 1), where she correctly prioritised understanding the scope of the incident over immediately attempting a fix. She wrote: "Before touching anything, I\'d want to know: is this isolated to one service, or is it propagating? I\'d check the dependency graph and recent deployment history before I even considered a rollback." This is a hallmark of experienced engineers who have been burned by premature solutions, and it is a response that is very difficult to generate convincingly without direct incident experience. She also proactively identified who needed to be kept informed and at what cadence, without being prompted.

On collaboration, Elena showed a balance of technical conviction and interpersonal intelligence. In Scenario 3, she pushed back constructively on a technically unsound suggestion from a product manager, writing: "I\'d tell them I understand why that approach seems appealing, and I can see what they\'re trying to solve — but there\'s a reliability risk I\'d want us to address first. Can we spend twenty minutes walking through it together?" This response demonstrates that she can hold a technical position without making it adversarial — a key differentiator for developers working in cross-functional environments.

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
        narrative: 'In high-stakes scenarios, Elena follows a clear mental model: scope first, identify options second, commit third. She is not reckless — she gathers just enough information to make a defensible decision — but she is not a deliberator who requires complete certainty before acting. In the production incident scenario, she committed to a rollback decision within the scenario timeframe rather than escalating indefinitely or waiting for more data. She wrote: "Once I\'ve confirmed the deployment is the likely cause, I\'m not going to wait for a 100% certainty — the cost of being wrong about the rollback is lower than the cost of every additional minute of downtime." This risk-adjusted thinking under pressure is a strong signal of senior engineering maturity. In their first 90 days, this suggests they will likely make timely, defensible decisions during incidents and technical uncertainties, and will document their reasoning in a way that builds team confidence rather than creating anxiety.',
      },
      composure_under_conflict: {
        score: 82,
        verdict: 'Strength',
        narrative: 'Elena handled the disagreement with a product stakeholder in Scenario 3 with composure and exceptionally clear reasoning. She did not become defensive, dismiss the product manager\'s intent, or capitulate to avoid conflict. Instead, she reframed the conversation around the shared goal — shipping a reliable feature — and proposed a specific, time-bounded next step ("Can we spend twenty minutes walking through it together?"). This is a sophisticated conflict resolution approach that most developers do not demonstrate until they are operating at senior level. The clarity and firmness of her response ("there\'s a reliability risk I\'d want us to address first") was paired with empathy for the product manager\'s perspective, which is exactly the balance that makes technical disagreements productive rather than damaging. In their first 90 days, this suggests they will likely build strong working relationships across engineering, product, and design, and will handle technical disagreements in a way that increases rather than decreases cross-functional trust.',
      },
      prioritisation_under_load: {
        score: 83,
        verdict: 'Strength',
        narrative: 'Elena\'s approach to multi-priority scenarios is explicit, structured, and explicitly communicated. In Scenario 2, she named the criteria she used to sequence work: user impact (how many people are affected), reversibility (can this be undone easily?), and dependencies (does anything else block on this?). She also acknowledged that prioritisation decisions need to be communicated, not just made: "I\'d tell the team what I\'m not doing this sprint and why, so they can flag if I\'ve missed something." This level of transparency is unusual but highly effective in practice — it prevents silent priority conflicts and builds team trust. She also explicitly delegated one item to a colleague rather than attempting to own everything, which is a sign of someone who understands leverage. In their first 90 days, this suggests they will likely establish clear, transparent prioritisation norms on their team quickly and will communicate trade-offs in a way that prevents the confusion that often accompanies new hires managing competing demands.',
      },
      ownership_accountability: {
        score: 80,
        verdict: 'Strength',
        narrative: 'Elena\'s language patterns throughout were consistently first-person and active. When describing a past technical failure in Scenario 4, she wrote: "I pushed the change without adequate test coverage, the incident caught it, and I changed my review process as a result." There is no external attribution — the failure is owned, the lesson is extracted, and the behavioural change is named. This approach to past failures as data rather than as events to explain away is a reliable predictor of high performance over time. She did not dwell on the failure or over-qualify it, suggesting a psychologically grounded relationship with accountability. She also framed accountability prospectively in her responses — articulating what she would monitor and how she would know if something was going wrong before it became a problem. In their first 90 days, this suggests they will likely own their mistakes transparently and course-correct quickly, setting a strong accountability norm for the immediate team around them.',
      },
    },
    scores: {
      'Problem Solving': 88,
      'Technical Communication': 80,
      'Collaboration & Code Quality': 87,
      'Delivery Focus': 85,
    },
    score_narratives: {
      'Problem Solving': 'Strong systematic approach to debugging and root-cause analysis. In the incident scenario, she correctly identified that the monitoring gap was a second-order problem to solve after the immediate issue was resolved — good prioritisation under pressure. Her diagnostic reasoning was explicit and followed a logical sequence.',
      'Technical Communication': 'Communicates technical concepts clearly to technical peers. Main development area is translating technical issues into business-impact language for non-technical stakeholders — her Scenario 4 response assumed too much technical context in the audience. With explicit coaching, this is quickly addressable.',
      'Collaboration & Code Quality': 'Shows genuine respect for code review as a craft discipline rather than a gatekeeping process. Her response to the "untested code" scenario was firm on standards but empathetic in approach — she proposed a specific improvement to the team\'s review process rather than simply refusing the PR.',
      'Delivery Focus': 'Consistent focus on shipping working, maintainable software over technical sophistication. She explicitly chose the simpler, more reliable solution in Scenario 3 when presented with an elegant but over-engineered alternative — a sign of professional maturity.',
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
        evidence: 'I\'d tell them I understand why that approach seems appealing, and I can see what they\'re trying to solve — but there\'s a reliability risk I\'d want us to address first. Can we spend twenty minutes walking through it together?',
      },
      {
        strength: 'Proactive stakeholder communication during uncertainty',
        explanation: 'She identified who needed to be informed during the incident scenario without being prompted — including the customer success team and the on-call manager at specific cadences. This is a behaviour that requires real incident experience to demonstrate convincingly.',
        evidence: 'I\'d send a holding message to the customer success team immediately so they have something to tell any affected customers, even if all I can say is that we\'re investigating and have a team on it.',
      },
    ],
    watchouts: [
      {
        watchout: 'Technical communication to non-technical stakeholders assumes too much context',
        severity: 'Low',
        explanation: 'When explaining a technical blocker in Scenario 4, Elena used accurate but highly technical language without translating it into business-impact terms. In practice, this can leave product managers or business stakeholders confused and undermine trust.',
        evidence: 'The issue is that the current architecture doesn\'t support the transaction isolation level we\'d need for this to be consistent — it\'s a fundamental distributed systems constraint.',
        action: 'In onboarding, explicitly discuss the expectation that technical explanations to non-technical stakeholders lead with the business impact ("this will occasionally cause duplicate charges for users") before the technical cause. Pair with a product manager who will give direct, real-time feedback on communication style.',
      },
    ],
    onboarding_plan: [
      {
        week: 1,
        title: 'Environment Setup and Architecture Deep-Dive',
        objective: 'Get Elena fully set up, oriented on the codebase architecture, and introduced to the team — she will self-direct effectively here and will arrive with specific, well-formed questions.',
        activities: [
          'Full development environment setup and access provisioning. Elena should have access to all internal docs, the codebase, staging environment, and monitoring tools by end of day one. Assign a named senior engineer as her technical buddy for the week.',
          'Architecture walkthrough with the senior engineer: key services, data flows, deployment pipeline, and known technical debt. Elena should ask questions throughout — her questions in this session are diagnostic data about her level and orientation.',
          'Team introductions and rituals: attend standup, sprint planning, and any relevant design or architecture discussions. Observe only this week — no required contribution, but she should note what she would have said and discuss with her buddy.',
        ],
        checkpoint: 'Can describe the high-level architecture and the key dependencies between services without referring to notes. Has identified at least two questions about the codebase that she will investigate in week two.',
        involves: ['Line manager', 'Senior engineer (buddy)', 'Engineering team', 'HR — ERA 2025 day-one induction'],
        notes: 'ERA 2025 requires all day-one employment rights to be communicated on the first day. Ensure Elena receives her written statement of particulars and any probation documentation before the end of day one.',
      },
      {
        week: 2,
        title: 'First Codebase Contribution',
        objective: 'Elena ships her first real contribution to the codebase — something small but meaningful, with full test coverage. Her delivery focus means she will want to ship something quickly; channel that energy into something with visible impact.',
        activities: [
          'Assign a well-scoped first task — a bug fix or a small feature — that is meaningful but not blocking. The task should touch core parts of the codebase to accelerate her architectural understanding.',
          'Full code review process for her first PR: Elena\'s PR should be reviewed by at least two senior engineers with constructive, detailed feedback. This establishes the team\'s code quality standards from day one.',
          'Pair programming session with her technical buddy on a section of the codebase she finds unfamiliar. This is as much about Elena asking questions as it is about her coding.',
        ],
        checkpoint: 'First PR has been submitted, reviewed, and merged. PR includes adequate test coverage — her buddy confirms this meets the team\'s standard without being reminded. Elena can describe what the merged code does and why it works.',
        involves: ['Line manager', 'Senior engineer (buddy)', 'Code reviewers (x2)'],
        notes: 'CIPD guidance on new hire onboarding recommends that the first deliverable is challenging enough to be meaningful but scoped tightly enough to be completed successfully. Success in week two builds confidence and credibility with the team.',
      },
      {
        week: 3,
        title: 'Cross-Functional Communication Practice',
        objective: 'Address the primary assessed gap — technical communication to non-technical stakeholders — through a structured cross-functional exercise with explicit coaching from the product team.',
        activities: [
          'Attend the cross-functional sprint review and product planning session. Elena should contribute at least one technical update about the work she shipped in week two, written in plain English and reviewed by her buddy before the meeting.',
          'Written technical explanation exercise: Elena writes a plain-English explanation of a technical concept or current technical constraint for a non-technical audience. Her buddy and her product manager both review it and provide separate feedback.',
          'Debrief with the product manager: structured feedback specifically on Elena\'s communication style. Does she lead with impact before cause? Does she avoid jargon? This is the single most valuable feedback session in her first 30 days.',
        ],
        checkpoint: 'Product manager confirms that Elena\'s written technical update was understood without follow-up clarification questions. Elena can articulate the difference between her technical explanation and the business-impact version with examples.',
        involves: ['Line manager', 'Product manager', 'Senior engineer (buddy)', 'Engineering team'],
        notes: 'CIPD guidance on new hire development recommends that identified skill gaps are addressed with explicit, targeted activities within the first 30 days — before the pattern becomes entrenched.',
      },
      {
        week: 4,
        title: 'First Code Review as Reviewer',
        objective: 'Assess Elena\'s approach to mentoring and standards-setting by giving her a reviewer role — this is important data for her team-fit and long-term growth trajectory.',
        activities: [
          'Elena reviews a PR from a junior developer — her feedback should be constructive, specific, and focused on the code rather than the coder. Her buddy reviews her review and provides meta-feedback on its quality.',
          'First 1:1 with the line manager focused on Elena\'s experience so far: what is working, what is unclear, and what she needs more of. This is not a performance review — it is a two-way orientation conversation.',
          'Technical deep-dive into an area of the codebase Elena has not yet worked in. She should produce a brief written summary of what she learned — reinforcing the documentation and knowledge-sharing habits expected of senior developers.',
        ],
        checkpoint: 'Code review feedback is documented and received positively by the junior developer. Elena\'s 1:1 conversation is substantive — she arrives with specific questions and observations rather than waiting to be asked.',
        involves: ['Line manager', 'Senior engineer (buddy)', 'Junior developer (code review recipient)'],
        notes: 'N/A',
      },
      {
        week: 5,
        title: '30-Day Review and Communication Follow-Up',
        objective: 'Complete the formal 30-day review and assess progress on the technical communication gap — the primary development area from this assessment.',
        activities: [
          'Formal 30-day probationary review with the line manager. Review: codebase contributions, code review quality, architectural understanding, and — critically — progress on the technical communication gap. Use the product manager\'s feedback from week three as the baseline.',
          'Second cross-functional communication exercise: Elena presents a technical update at the sprint review without prior coaching or review. Assess whether the week three feedback has been integrated.',
          'Agree on a 60-day development plan: what will Elena be independently responsible for in the next 30 days, what standards will her work be held to, and what does a successful 90-day probation look like?',
        ],
        checkpoint: 'Formal 30-day review is documented. Product manager confirms measurable improvement in Elena\'s cross-functional communication since week three. 60-day plan is agreed and in writing.',
        involves: ['Line manager', 'HR — ERA 2025 probationary review', 'Product manager'],
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
      'In your assessment\'s technical blocker scenario, you explained the issue as: "The current architecture doesn\'t support the transaction isolation level we\'d need for this to be consistent — it\'s a fundamental distributed systems constraint." That\'s technically precise, but it wouldn\'t land with a product manager or a CFO. How would you explain that exact same problem to a non-technical stakeholder who needs to make a resourcing decision based on your answer? (Follow-up probe: Give me a real example from your current role where you had to translate a technical constraint into business-impact language — what did you say, and how did the stakeholder respond?)',
      'Your assessment\'s incident scenario was one of the strongest responses we\'ve seen at this level. You described scoping before acting, checking the dependency graph and deployment history before considering a rollback, and proactively communicating to the customer success team before they asked. Walk me through an actual incident you\'ve managed — the system involved, what broke, and your specific decision sequence from the moment you were alerted. (Follow-up probe: What\'s the action you almost took that would have made it significantly worse?)',
      'In Scenario 3 of your assessment, a product manager suggested an approach you identified as technically unsound. You wrote: "I\'d tell them I understand why that approach seems appealing — but there\'s a reliability risk I\'d want us to address first. Can we spend twenty minutes walking through it together?" Tell me about a real situation where you had to hold a technical position against stakeholder pressure. What was the proposal, what was the risk, and how did you navigate the conversation? (Follow-up probe: Did you get the outcome you wanted? If not, what would you do differently?)',
      'Your assessment showed strong prioritisation logic — you named explicit criteria (user impact, reversibility, dependencies) and you noted that prioritisation decisions need to be communicated, not just made. Tell me about a sprint where competing demands forced a real conflict and something had to be cut. How did you decide what to drop, and how did you communicate that trade-off to the person who was most affected by it? (Follow-up probe: What\'s the deprioritisation call you made too late — something you held onto longer than you should have?)',
    ],
  },
}

// ── Response timing data (for integrity section) ──────────────────────────

export const DEMO_RESPONSES = {
  'demo-c1': [
    { scenario_index: 0, time_taken_seconds: 312 },
    { scenario_index: 1, time_taken_seconds: 287 },
    { scenario_index: 2, time_taken_seconds: 345 },
    { scenario_index: 3, time_taken_seconds: 298 },
  ],
  'demo-c2': [
    { scenario_index: 0, time_taken_seconds: 268 },
    { scenario_index: 1, time_taken_seconds: 142 },
    { scenario_index: 2, time_taken_seconds: 310 },
    { scenario_index: 3, time_taken_seconds: 285 },
  ],
  'demo-c3': [
    { scenario_index: 0, time_taken_seconds: 295 },
    { scenario_index: 1, time_taken_seconds: 158 },
    { scenario_index: 2, time_taken_seconds: 242 },
    { scenario_index: 3, time_taken_seconds: 1450 },
  ],
  'demo-c4': [
    { scenario_index: 0, time_taken_seconds: 71 },
    { scenario_index: 1, time_taken_seconds: 243 },
    { scenario_index: 2, time_taken_seconds: 84 },
    { scenario_index: 3, time_taken_seconds: 112 },
  ],
  'demo-c5': [
    { scenario_index: 0, time_taken_seconds: 388 },
    { scenario_index: 1, time_taken_seconds: 342 },
    { scenario_index: 2, time_taken_seconds: 415 },
    { scenario_index: 3, time_taken_seconds: 367 },
  ],
}

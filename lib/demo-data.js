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
    results: [{
      overall_score: 92,
      risk_level: 'Very Low',
      percentile: 'Top 5%',
      pressure_fit_score: 88,
      pass_probability: 94,
    }],
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
    results: [{
      overall_score: 74,
      risk_level: 'Low',
      percentile: 'Top 28%',
      pressure_fit_score: 71,
      pass_probability: 76,
    }],
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
    results: [{
      overall_score: 61,
      risk_level: 'Medium',
      percentile: 'Top 47%',
      pressure_fit_score: 58,
      pass_probability: 63,
    }],
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
    results: [{
      overall_score: 35,
      risk_level: 'High',
      percentile: 'Bottom 22%',
      pressure_fit_score: 32,
      pass_probability: 30,
    }],
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
    results: [{
      overall_score: 85,
      risk_level: 'Low',
      percentile: 'Top 12%',
      pressure_fit_score: 82,
      pass_probability: 88,
    }],
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
  // Archived candidate
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

// ── Helper: candidates with full results merged (for compare page) ────────────
export function getDemoCandidatesFull() {
  return DEMO_CANDIDATES.filter(c => c.status === 'completed').map(c => {
    const full = DEMO_RESULTS[c.id]
    if (!full) return c
    return { ...c, results: [{ ...c.results[0], ...full }] }
  })
}

// ── Helper: benchmark candidate data keyed by skill ───────────────────────────
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

// ── Full results for each completed candidate ─────────────────────────────

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
    risk_reason: 'Exceptional response quality across all four scenarios. No integrity flags, high consistency, and evidence of deep strategic thinking throughout.',
    ai_summary: `Sophie Chen is one of the strongest Marketing Manager candidates we have assessed. Her responses demonstrate a sophisticated understanding of brand strategy, stakeholder alignment, and data-led decision-making that is typically associated with candidates operating at Head of Marketing level.

In the stakeholder conflict scenario, Sophie identified competing priorities between the sales and product teams without prompting, proposed a structured escalation process, and suggested a shared KPI framework, all within a coherent narrative. This level of systems thinking is rare at this career stage.

Her data analysis response was particularly impressive. Rather than defaulting to vanity metrics, she anchored her measurement framework around pipeline contribution and cost-per-acquisition, referencing cohort analysis and attribution modelling as standard tools in her workflow. This indicates genuine analytical maturity.

There are no meaningful concerns with this candidate. A single watch-out, a tendency toward over-planning before acting, is very minor and easily managed with a structured 30-60-90 day onboarding plan that includes early quick wins. Overall, Sophie is a strong hire who is likely to exceed expectations within the first six months.`,
    integrity: {
      response_quality: 'Genuine',
      quality_notes: 'All four responses were substantive, specific, and written in a consistent personal voice throughout. Language complexity and stylistic patterns are uniform, and each response includes specific examples that would be difficult to fabricate without direct experience.',
      consistency_rating: 'High',
      consistency_notes: 'Values and priorities expressed across scenarios align closely. Decision-making style is consistent whether under social pressure or time pressure.',
      red_flags: [],
    },
    pressure_fit: {
      decision_speed_quality: { score: 91, verdict: 'Strength', narrative: 'Sophie made decisive, well-reasoned choices under ambiguity. In the competing-priorities scenario, she ranked options explicitly and committed to her first choice rather than hedging, a marker of genuine decisiveness rather than performed confidence.' },
      composure_under_conflict: { score: 86, verdict: 'Strength', narrative: 'When presented with a frustrated stakeholder scenario, Sophie de-escalated with empathy first, then reframed the conversation around shared goals. She did not avoid the conflict or over-apologise, both common failure modes at this stage.' },
      prioritisation_under_load: { score: 88, verdict: 'Strength', narrative: 'Her framework for triage was explicit and defensible: she separated urgent-and-important from urgent-but-not-important with clear criteria, and named a specific stakeholder she would communicate delays to, showing she understands that prioritisation is partly a communication problem.' },
      ownership_accountability: { score: 87, verdict: 'Strength', narrative: 'Active, first-person language throughout. When describing a past campaign underperformance, she used "I decided", "I misjudged", and "I changed", never attributing outcomes to the team or external factors.' },
    },
    scores: {
      'Strategic Communication': 91,
      'Stakeholder Management': 93,
      'Data & Analytics': 88,
      'Campaign Strategy': 94,
    },
    score_narratives: {
      'Strategic Communication': 'Articulates complex marketing concepts clearly and adjusts her communication style to the audience. Demonstrated awareness of how messaging lands differently across exec, agency, and operational stakeholders.',
      'Stakeholder Management': 'Showed exceptional skill in navigating cross-functional tension. Her approach to the sales-marketing alignment scenario was structured and showed genuine political awareness without compromising on outcomes.',
      'Data & Analytics': 'References attribution modelling, cohort analysis, and cost-per-acquisition as standard tools. Measurement frameworks are outcome-focused rather than activity-focused.',
      'Campaign Strategy': 'Strong integrated thinking across paid, owned, and earned channels. Her campaign framework included a testing-and-iteration phase as standard, suggesting a data-driven approach baked into her process.',
    },
    strengths: [
      {
        strength: 'Systems-level strategic thinking',
        explanation: 'Sophie consistently zooms out to identify upstream causes rather than treating symptoms. Her solution to the brand inconsistency scenario addressed both the process failure and the cultural misalignment that caused it.',
        evidence: 'The real problem isn\'t the rogue post, it\'s that we don\'t have a clear enough brand voice guide that junior team members can apply without asking for sign-off on every piece.',
      },
      {
        strength: 'Data-driven accountability',
        explanation: 'She frames marketing activities in terms of business outcomes rather than marketing outputs, and holds herself to measurable standards.',
        evidence: 'I\'d set a 90-day target of 15% improvement in MQL-to-SQL conversion, report on it weekly, and if we\'re not tracking toward it by week six, I\'d adjust the lead qualification criteria.',
      },
      {
        strength: 'Constructive stakeholder challenge',
        explanation: 'Rather than simply deferring to senior stakeholders, Sophie demonstrates the confidence to respectfully push back with data and a clear rationale.',
        evidence: 'I\'d take the conversation back to the brief. If the direction has changed, the timeline needs to change too, I\'d rather have that conversation early than deliver something off-brief on time.',
      },
    ],
    watchouts: [
      {
        watchout: 'Tendency to over-plan before committing to action',
        severity: 'Low',
        explanation: 'In one scenario, Sophie\'s response included an unusually detailed planning phase before any action was taken. In fast-moving environments, this could slow down execution.',
        evidence: 'I\'d want to spend the first two weeks mapping all stakeholders, reviewing the last twelve months of data, and building out a project plan before touching anything.',
        action: 'Set clear action milestones in the 30-60-90 onboarding plan to encourage early wins alongside strategic planning. Frame speed of execution as a valued behaviour in early feedback.',
      },
    ],
    onboarding_plan: [
      'Week 1: Structured listening tour, 1:1s with Sales, Product, and Customer Success leads to understand current perception of marketing and existing pain points. Sophie\'s stakeholder intelligence will make her exceptionally effective at this stage.',
      'Week 2: Audit current marketing assets, channel performance, and brand consistency. Sophie can operate independently here; provide access to analytics dashboards and ask for a written summary at the end of the week.',
      'Week 3: First quick win, identify one tactical improvement she can own and deliver. This counterbalances her planning tendency and builds early credibility with the team.',
      'Week 4: Present a 90-day strategic roadmap to the leadership team. Her systems thinking will shine here, and presenting early signals high confidence and engagement.',
    ],
    interview_questions: [
      'Tell me about a marketing campaign that underperformed. What did you do, and what would you do differently now? (Follow-up probe: What data told you it was underperforming, and how quickly did you act on that signal?)',
      'Walk me through how you\'d build alignment between marketing and sales when they have conflicting priorities. (Follow-up probe: What happens when alignment breaks down mid-quarter?)',
      'Describe a situation where you pushed back on a senior stakeholder\'s direction. What was your reasoning, and how did it land? (Follow-up probe: Would you handle it differently in hindsight?)',
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
    risk_reason: 'Solid overall performance with genuine strengths in campaign execution and stakeholder rapport. Some gaps in analytical depth and risk awareness under pressure, but these are coachable.',
    ai_summary: `Marcus Williams is a competent Marketing Manager candidate with clear strengths in campaign execution and relationship management. His responses show a practical, action-oriented mindset and a good intuition for brand voice that would translate well to most marketing team environments.

His strongest responses were in the stakeholder management and communication scenarios, where he demonstrated genuine warmth and a pragmatic approach to navigating disagreements. He correctly identified that maintaining trust is a longer-term asset than winning a short-term argument.

The main area of development for Marcus is analytical depth. His data-related response leaned heavily on gut feel and experience over structured measurement frameworks. This is not disqualifying, but it does suggest he would benefit from working alongside a strong analyst or having measurement frameworks provided rather than built from scratch.

His pressure-fit scores are solid across the board, with decision speed and composure being particular strengths. He should be onboarded with a clear 30-60-90 day plan and paired with a data-oriented peer who can complement his more instinctive style.`,
    integrity: {
      response_quality: 'Likely Genuine',
      quality_notes: 'Responses are substantive and specific, with a consistent conversational voice. Slight length variation between scenarios suggests natural rather than uniform effort distribution.',
      consistency_rating: 'Medium',
      consistency_notes: 'Core values and approach are consistent. Minor inconsistency in risk tolerance, more cautious in Scenario 2 than Scenario 4 on a similar type of decision.',
      red_flags: [],
    },
    pressure_fit: {
      decision_speed_quality: { score: 77, verdict: 'Strength', narrative: 'Made clear decisions without excessive hedging. Committed to a course of action in the ambiguous scenario and articulated his reasoning rather than seeking consensus first.' },
      composure_under_conflict: { score: 74, verdict: 'Moderate', narrative: 'Handled the difficult stakeholder scenario reasonably well but relied on rapport and relationship warmth rather than a structured escalation process. Works well when existing trust is in place, but may struggle in adversarial or unfamiliar environments.' },
      prioritisation_under_load: { score: 68, verdict: 'Moderate', narrative: 'Prioritisation logic was present but informal. He identified the right things to deprioritise but couldn\'t clearly articulate the criteria behind his choices, suggesting his triage process relies more on intuition than a repeatable framework.' },
      ownership_accountability: { score: 72, verdict: 'Moderate', narrative: 'Generally takes ownership. One instance of attributing a past campaign failure partly to "unclear briefs from the client", not a red flag, but worth watching to ensure accountability extends to contexts where he has less control.' },
    },
    scores: {
      'Strategic Communication': 78,
      'Stakeholder Management': 80,
      'Data & Analytics': 62,
      'Campaign Strategy': 75,
    },
    score_narratives: {
      'Strategic Communication': 'Clear and confident communicator. Strong instinct for tone and audience, though his responses occasionally lacked precision on technical marketing concepts.',
      'Stakeholder Management': 'Genuine strength. His response to the cross-functional conflict scenario was warm, pragmatic, and focused on long-term relationship capital, evidence of someone with real experience navigating internal politics.',
      'Data & Analytics': 'The main development area. Response relied on descriptive metrics (impressions, reach, engagement rate) without connecting them to business outcomes. Would benefit from structured measurement coaching in the first 90 days.',
      'Campaign Strategy': 'Solid integrated thinking. Good awareness of channel mix and sequencing. Planning approach is more execution-focused than strategy-first, which is fine for most mid-market roles.',
    },
    strengths: [
      {
        strength: 'Natural stakeholder rapport',
        explanation: 'Marcus builds trust quickly and instinctively adapts his communication style to the person he\'s talking to. This is a genuine differentiator in cross-functional marketing roles.',
        evidence: 'Before I escalate anything formally, I\'d want to grab a coffee with the sales lead and understand what\'s actually driving the frustration. Nine times out of ten it\'s a communication gap, not a strategic disagreement.',
      },
      {
        strength: 'Pragmatic execution mindset',
        explanation: 'He resists over-engineering and prioritises getting things done. In a fast-moving marketing team, this bias toward action is a genuine asset.',
        evidence: 'I\'d rather launch a good campaign that we can iterate on than spend six weeks perfecting something that might miss the window entirely.',
      },
    ],
    watchouts: [
      {
        watchout: 'Analytical depth below seniority expectations',
        severity: 'Medium',
        explanation: 'At Marketing Manager level, building and owning measurement frameworks is typically expected. Marcus\' current approach relies on descriptive metrics and experience-based judgement rather than structured attribution or ROI modelling.',
        evidence: 'For channel performance, I\'d look at what\'s driving the most engagement and double down on that, usually you can sense what\'s working fairly quickly.',
        action: 'Pair with a marketing analyst for the first 90 days and agree a set of shared KPIs from day one. Consider a structured data literacy session as part of onboarding to build confidence with attribution tools.',
      },
      {
        watchout: 'Inconsistent accountability in ambiguous situations',
        severity: 'Low',
        explanation: 'Mostly takes ownership, but occasionally attributes outcomes to external factors. Low risk but worth monitoring in the first performance review.',
        evidence: null,
        action: 'Set clear individual targets (not team-level targets) in the 30-day review to establish personal accountability norms early.',
      },
    ],
    onboarding_plan: [
      'Week 1: Stakeholder introductions, Marcus\' natural rapport-building will make this effortless. Use this time to help him understand the political landscape and establish himself with key internal partners.',
      'Week 2: Data and measurement orientation, review the current analytics stack, reporting cadence, and KPI framework. Assign a joint project with the analytics team to immediately address the measurement gap.',
      'Week 3: Own the delivery of one active campaign. Full autonomy here, this is where his execution strengths will shine and build confidence.',
      'Week 4: 30-day check-in with line manager. Review individual KPIs, gather early feedback from stakeholders, and agree a development plan focused on analytical capability.',
    ],
    interview_questions: [
      'Describe a marketing campaign you\'re most proud of. Walk me through your measurement approach. (Follow-up probe: How did you connect marketing activities to revenue outcomes?)',
      'Tell me about a time you had to change direction mid-campaign. What triggered it, and how did you manage the change? (Follow-up probe: What data told you it wasn\'t working?)',
      'How would you approach building a measurement framework for a new market entry? (Follow-up probe: Which metrics would you report at board level, and why those specifically?)',
      'Describe a difficult conversation with a senior stakeholder. What was your approach? (Follow-up probe: What would you do differently if you were in that situation today?)',
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
    risk_reason: 'Mixed performance across scenarios. Genuine strengths in client communication and persistence, offset by concerning gaps in objection handling, pipeline discipline, and composure under closing pressure.',
    ai_summary: `Priya Patel presents a mixed profile for the Sales Executive role. Her clearest strength is client communication, she writes with warmth and clarity and demonstrates genuine interest in understanding client needs before presenting solutions. This is a valuable foundation.

However, her performance on the negotiation and closing scenarios raised concerns. In the objection-handling scenario, she became somewhat defensive when the prospect challenged her on pricing, and her response focused on justifying the product rather than reframing the value proposition or moving the conversation forward. This pattern, genuine in early-stage relationship building but less effective when deals face pressure, is the key risk for this role.

Her pipeline management response showed reasonable awareness of the standard CRM disciplines, but lacked the precision expected at this seniority level. She described managing her pipeline "intuitively" rather than referencing specific stage criteria or velocity metrics.

Priya is likely to succeed in roles that weight relationship management and account management over new business acquisition. If this role involves significant cold pipeline and high-pressure closing, consider carefully whether her current profile matches the role requirements. With targeted development and strong sales coaching, there is a path to improvement.`,
    integrity: {
      response_quality: 'Likely Genuine',
      quality_notes: 'Responses are genuine and personally written. Two responses were shorter than expected for the complexity of the scenario, this contributed to the Medium confidence rating rather than any authenticity concern.',
      consistency_rating: 'Medium',
      consistency_notes: 'Good consistency in communication style and values. Some inconsistency in confidence level, self-assured in early-stage scenarios but more hesitant in closing and negotiation contexts.',
      red_flags: [],
    },
    pressure_fit: {
      decision_speed_quality: { score: 62, verdict: 'Moderate', narrative: 'Made reasonable decisions but often hedged with qualifiers ("I would probably…", "I think I\'d…"). This language pattern can signal either appropriate caution or a lack of conviction, in a sales context, it leans toward the latter.' },
      composure_under_conflict: { score: 55, verdict: 'Moderate', narrative: 'Became slightly defensive when a scenario introduced direct challenge from a prospect. Her response improved in the second half, but the initial instinct to justify rather than reframe is a notable pattern in sales contexts.' },
      prioritisation_under_load: { score: 60, verdict: 'Moderate', narrative: 'Identifies the right priorities at a high level but doesn\'t articulate a clear, systematic approach to pipeline management under pressure. Relies more on experience and feel than explicit criteria.' },
      ownership_accountability: { score: 56, verdict: 'Moderate', narrative: 'Takes responsibility in most scenarios. One response attributed a lost deal primarily to "market timing" without acknowledging what could have been done differently at the qualification or proposal stage.' },
    },
    scores: {
      'Client Communication': 74,
      'Negotiation & Objection Handling': 48,
      'Pipeline Management': 60,
      'Closing & Deal Progression': 55,
    },
    score_narratives: {
      'Client Communication': 'Clear strength. Priya writes with warmth and genuine curiosity, asks good discovery questions, and positions herself as a partner rather than a vendor. This will serve her well in relationship-led sales environments.',
      'Negotiation & Objection Handling': 'The main gap. Her response to price objections was defensive and product-focused rather than value-focused. She did not attempt to understand the underlying concern before responding, which is a standard negotiation best practice.',
      'Pipeline Management': 'Reasonable awareness of CRM hygiene and stage management. Could not define specific stage-exit criteria, suggesting her pipeline management approach is more habitual than systematic.',
      'Closing & Deal Progression': 'Hesitant in closing scenarios. Did not attempt a trial close in the appropriate scenario and used soft language ("when you\'re ready", "no pressure") that can unintentionally extend sales cycles.',
    },
    strengths: [
      {
        strength: 'Genuine client curiosity and rapport-building',
        explanation: 'Priya consistently leads with questions rather than pitches and demonstrates authentic interest in the client\'s situation. This approach builds trust and often surfaces information that drives more effective proposals.',
        evidence: 'I wouldn\'t go into that call with a prepared pitch. I\'d spend the first fifteen minutes asking about what\'s changed in their business and what they\'re trying to solve right now.',
      },
      {
        strength: 'Persistence without pushiness',
        explanation: 'She maintains contact with prospects over time without becoming aggressive. Her follow-up strategy is values-led and focused on adding value rather than generating pressure.',
        evidence: 'I\'d send them something useful, an industry report, a case study that\'s genuinely relevant, before I\'d send a "just checking in" email. I want to be the salesperson they actually want to hear from.',
      },
    ],
    watchouts: [
      {
        watchout: 'Defensive response to pricing and value challenges',
        severity: 'High',
        explanation: 'When a prospect challenged the value proposition in the objection-handling scenario, Priya\'s response focused on defending the product\'s features rather than understanding the underlying concern and reframing the value. This is the single biggest risk for a Sales Executive role that involves competitive environments.',
        evidence: 'The price point is based on everything that\'s included in the package, the integrations, the support, the onboarding. When you look at what you\'re getting, it\'s actually very competitive.',
        action: 'Enrol in structured objection-handling training within the first 30 days. Use recorded call reviews to identify the pattern in live situations. Assign a senior sales mentor who can provide real-time coaching on live deals.',
      },
      {
        watchout: 'Hesitant closing language in late-stage deals',
        severity: 'Medium',
        explanation: 'Uses non-committal language at closing stages that can unintentionally reduce urgency and extend deal cycles. This pattern is learnable but requires conscious correction.',
        evidence: 'I\'d probably leave the ball in their court at that stage, let them come to me when they\'re ready.',
        action: 'Provide a set of specific closing techniques and trial-close questions to practice. Include a "closing language audit" in call review sessions for the first two months.',
      },
    ],
    onboarding_plan: [
      'Week 1: Shadow two senior sales reps through a full deal cycle, from discovery to close. Focus specifically on their objection-handling and closing techniques, Priya will benefit from modelling before practising.',
      'Week 2: Assigned discovery calls only, no pitching or closing. Build confidence in the part of the process where she is strongest, while building familiarity with the product and ICP.',
      'Week 3: First full sales calls with a senior rep present for support. Debrief after each call specifically on objection-handling moments.',
      'Week 4: Review first solo pipeline. Agree on specific stage-exit criteria for each pipeline stage to build a more systematic approach to deal progression.',
    ],
    interview_questions: [
      'Tell me about a deal you lost that you thought you were going to win. What happened? (Follow-up probe: What could you have done differently at the objection stage?)',
      'Walk me through how you\'d handle a prospect who says "your price is 20% higher than your competitor." (Follow-up probe: How do you respond if they push back again after your first answer?)',
      'How do you decide when to move a deal forward versus give a prospect more space? (Follow-up probe: What\'s your trigger for having a "close or kill" conversation?)',
      'Describe your ideal pipeline review process. How do you know when a deal is truly moving? (Follow-up probe: What happens when a deal goes quiet?)',
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
    risk_reason: 'Multiple integrity signals including extremely fast response times on two scenarios and highly generic language suggesting minimal genuine engagement. Core sales competencies are significantly below the required standard.',
    ai_summary: `James O'Brien's assessment results do not support progression for the Sales Executive role. The combination of authenticity concerns, below-benchmark skill scores, and low pressure-fit performance creates a high risk of probation failure if hired.

The integrity analysis identified two scenarios where response times were unusually low (under 90 seconds), and the language used across all responses was notably generic, relying on stock phrases ("customer-centric approach", "pipeline hygiene") without the specific context, examples, or decision-making logic that characterises genuine sales experience.

On the substance of his responses, the fundamental sales competencies assessed, objection handling, value-based selling, and pipeline discipline, were all below the threshold for this role. His approach to closing was passive and his negotiation responses showed a pattern of conceding on price as the first response to resistance, which is a significant commercial risk.

It is recommended that this candidate does not progress to interview for this role. If the panel wishes to proceed regardless, the suggested interview questions below are designed to probe the specific areas of concern.`,
    integrity: {
      response_quality: 'Possibly AI-Assisted',
      quality_notes: 'Two of four responses were completed in under 90 seconds, atypically fast for the complexity of the scenarios. Language patterns across all responses are generic and lack the specific examples, proper nouns, and personal voice typically associated with genuine experience.',
      consistency_rating: 'Low',
      consistency_notes: 'Significant inconsistency in stated approach between Scenario 1 and Scenario 3 on the same type of stakeholder challenge. Values described in Scenario 2 contradict behaviours described in Scenario 4.',
      red_flags: [
        'Scenario 1 completed in 71 seconds (complexity warranted 3-5 minutes minimum)',
        'Scenario 3 completed in 84 seconds',
        'Heavy use of buzzword-heavy language without specific examples to support claims',
        'Internal inconsistency between stated values in Scenario 2 and decisions made in Scenario 4',
      ],
    },
    pressure_fit: {
      decision_speed_quality: { score: 36, verdict: 'Concern', narrative: 'Responses to ambiguous scenarios were surface-level and did not demonstrate genuine decision-making logic. Decisions were stated without reasoning, suggesting answers were generated rather than considered.' },
      composure_under_conflict: { score: 30, verdict: 'Concern', narrative: 'Avoided the core challenge in both conflict scenarios. In the difficult prospect scenario, the response proposed to "take some time to reflect" and "circle back", a pattern of avoidance rather than engagement.' },
      prioritisation_under_load: { score: 34, verdict: 'Concern', narrative: 'Prioritisation response used generic framework language ("urgent vs important matrix") without applying it to the specific scenario. No concrete prioritisation decisions were made.' },
      ownership_accountability: { score: 28, verdict: 'Concern', narrative: 'Multiple instances of passive language and external attribution. "The deal fell through due to market conditions" and "the team wasn\'t aligned" both appeared without any acknowledgement of personal contribution to the outcome.' },
    },
    scores: {
      'Client Communication': 44,
      'Negotiation & Objection Handling': 28,
      'Pipeline Management': 36,
      'Closing & Deal Progression': 30,
    },
    score_narratives: {
      'Client Communication': 'The strongest area, though still below threshold. Some evidence of attempting to understand client needs, but communication is generic and doesn\'t demonstrate the personalisation expected at Sales Executive level.',
      'Negotiation & Objection Handling': 'Significantly below threshold. Immediate concession on pricing without exploring the underlying objection. Did not attempt to qualify whether price was the real concern or a proxy for something else.',
      'Pipeline Management': 'Response used CRM terminology correctly but showed no evidence of actually managing pipeline with discipline. Could not describe specific stage-exit criteria or how he identifies at-risk deals.',
      'Closing & Deal Progression': 'Passive closing approach throughout. No trial closes attempted in appropriate scenarios. Closing language is entirely non-committal.',
    },
    strengths: [
      {
        strength: 'Awareness of customer-first language',
        explanation: 'James consistently frames responses using customer-centric language, suggesting an understanding of the expected selling philosophy even if the execution evidence is limited.',
        evidence: 'I always start by understanding what the client actually needs before presenting anything, the solution has to match their situation.',
      },
    ],
    watchouts: [
      {
        watchout: 'Possible AI-assisted responses, integrity concern',
        severity: 'High',
        explanation: 'Two scenarios completed significantly faster than the established baseline for genuine responses. Combined with generic, buzzword-heavy language lacking personal examples, there is a meaningful concern about response authenticity.',
        evidence: null,
        action: 'If progressing to interview, open with a request for a specific deal story: "Tell me about the last deal you closed, walk me through every stage from first contact to signature." Probe for names, dates, and specifics that would be impossible to fabricate.',
      },
      {
        watchout: 'Immediate price concession under objection pressure',
        severity: 'High',
        explanation: 'In the negotiation scenario, James\' first response to a pricing challenge was to offer a discount. This pattern, if it reflects real behaviour, creates significant commercial risk and will compress margins on every deal.',
        evidence: 'I\'d probably look at what we could do on the price to make it work for them, there\'s usually some flexibility if the deal is important enough.',
        action: 'If hired, set a strict commercial policy requiring manager approval for any discount over 5%. Monitor deal margin in the first 90 days closely.',
      },
      {
        watchout: 'Passive avoidance of conflict and difficult conversations',
        severity: 'Medium',
        explanation: 'Pattern of deferring, "reflecting", and "circling back" rather than addressing challenges directly. In a sales role, the ability to have difficult conversations is a non-negotiable.',
        evidence: 'I\'d probably take some time to reflect on the feedback and come back with a revised proposal, I don\'t want to push back in the moment.',
        action: 'Not suitable for roles requiring significant prospecting, negotiation, or stakeholder challenge. If hired for an account management role, pair with a structured escalation protocol.',
      },
    ],
    onboarding_plan: [
      'Week 1: If hired, do NOT give independent pipeline responsibility. Assign shadow-only status, all calls observed, no client contact without senior rep present.',
      'Week 2: Structured sales fundamentals training programme. Focus on value-based selling and objection-handling frameworks. Assess receptivity to coaching before proceeding.',
      'Week 3: Role-play sessions with sales manager. Assess whether core competencies are present but underdeveloped, or absent. This will determine whether continued investment is appropriate.',
      'Week 4: Formal 30-day review. Set clear pass/fail competency criteria. If fundamentals are not demonstrable after four weeks of structured coaching, reassess the hire decision.',
    ],
    interview_questions: [
      'Tell me about the last deal you closed, walk me through every stage from first contact to signature, including the names of the stakeholders involved. (Follow-up probe: What was the hardest objection you faced and how did you handle it?)',
      'What was the last deal you lost that you shouldn\'t have? What specifically did you do wrong? (Follow-up probe: What would you do differently at the objection stage?)',
      'A prospect says "your price is too high", talk me through exactly what you say next, word for word. (Follow-up probe: They push back again. What now?)',
      'Tell me about a time you had a difficult conversation with a client or prospect. How did you approach it? (Follow-up probe: What happened if you hadn\'t had that conversation?)',
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
    risk_reason: 'Strong across all assessed dimensions. Minor watch-out around communication of technical blockers to non-technical stakeholders, which is easily addressed with explicit onboarding focus.',
    ai_summary: `Elena Rodriguez is a strong Software Developer candidate who performed well across all assessed dimensions. Her responses demonstrate genuine technical maturity, not just in problem-solving, but in the way she approaches ambiguity, communicates with stakeholders, and takes ownership of delivery quality.

Her most impressive response was in the "production system under pressure" scenario, where she correctly prioritised understanding the scope of the incident over immediately attempting a fix, a hallmark of experienced engineers who have been burned by premature solutions. She also demonstrated clear awareness of the importance of stakeholder communication during incidents, proactively identifying who needed to be kept informed and at what cadence.

On collaboration, Elena showed a collaborative instinct balanced with appropriate confidence. She pushed back constructively on a technically unsound suggestion from a fictional product manager, explaining her reasoning without dismissing the intent behind the request. This balance, technical conviction without technical arrogance, is a key differentiator for senior-track developers.

The main development area is translating technical blockers into business-impact language for non-technical stakeholders. Her response in this scenario was accurate but assumed too much technical context in the audience. With explicit coaching, this is highly addressable.`,
    integrity: {
      response_quality: 'Genuine',
      quality_notes: 'All four responses are detailed, specific, and technically accurate. Elena includes concrete examples with plausible system names, error patterns, and decision logic that would be difficult to construct without genuine engineering experience.',
      consistency_rating: 'High',
      consistency_notes: 'Values and decision-making patterns are highly consistent across all four scenarios. Approach to ambiguity, stakeholder communication, and technical trade-offs is uniform throughout.',
      red_flags: [],
    },
    pressure_fit: {
      decision_speed_quality: { score: 84, verdict: 'Strength', narrative: 'In high-stakes scenarios, Elena follows a clear mental model: understand scope, then identify options, then decide. She is not reckless but is decisive once she has enough information. In the incident scenario, she committed to a rollback decision within the scenario timeframe rather than escalating indefinitely.' },
      composure_under_conflict: { score: 82, verdict: 'Strength', narrative: 'Handled the disagreement with a product stakeholder scenario with composure and clear reasoning. Did not become defensive or dismissive, instead reframed the conversation around shared outcomes (shipping a reliable feature) rather than technical correctness.' },
      prioritisation_under_load: { score: 83, verdict: 'Strength', narrative: 'Clear and systematic under load. In the multi-priority scenario, she explicitly named the criteria she used to sequence work (user impact, reversibility, dependencies) and acknowledged the need to communicate trade-offs to the team.' },
      ownership_accountability: { score: 80, verdict: 'Strength', narrative: 'Consistent use of first-person, active language throughout. When describing a past technical failure in her response, she focused on what she had learned and what she changed, without dwelling on blame or external factors.' },
    },
    scores: {
      'Problem Solving': 88,
      'Technical Communication': 80,
      'Collaboration & Code Quality': 87,
      'Delivery Focus': 85,
    },
    score_narratives: {
      'Problem Solving': 'Strong systematic approach to debugging and root-cause analysis. In the incident scenario, she correctly identified that the monitoring gap was a second-order problem to solve after the immediate issue was resolved, good prioritisation under pressure.',
      'Technical Communication': 'Communicates technical concepts clearly to technical peers. Main development area is translating technical issues into business-impact language for non-technical stakeholders, her response in this context assumed too much technical context.',
      'Collaboration & Code Quality': 'Shows genuine respect for code review as a craft discipline rather than a gatekeeping process. Her response to the "junior developer pushing untested code" scenario was firm on standards but empathetic in approach.',
      'Delivery Focus': 'Consistent focus on shipping working, maintainable software over demonstrating technical sophistication. She explicitly resisted the "elegant but over-engineered" solution in one scenario, a sign of professional maturity.',
    },
    strengths: [
      {
        strength: 'Incident response instinct, understand before acting',
        explanation: 'Under production pressure, Elena\'s first instinct is to scope the problem rather than immediately attempt a fix. This reduces the risk of making an incident worse and is a hallmark of experienced engineers.',
        evidence: 'Before touching anything, I\'d want to know: is this isolated to one service, or is it propagating? I\'d check the dependency graph and recent deployment history before I even considered a rollback.',
      },
      {
        strength: 'Technical conviction without technical arrogance',
        explanation: 'She disagrees with technically unsound suggestions confidently but without dismissing the intent behind them. This makes her easier to work with for non-technical stakeholders and avoids the adversarial dynamic that can slow cross-functional teams down.',
        evidence: 'I\'d tell them I understand why that approach seems appealing, and I can see what they\'re trying to solve, but there\'s a reliability risk I\'d want us to address first. Can we spend twenty minutes walking through it together?',
      },
      {
        strength: 'Proactive stakeholder communication during uncertainty',
        explanation: 'Identified who needed to be kept informed during the incident scenario without being prompted, a behaviour that requires experience with the consequences of poor incident communication.',
        evidence: 'I\'d send a holding message to the customer success team immediately so they have something to tell any affected customers, even if all I can say is that we\'re investigating.',
      },
    ],
    watchouts: [
      {
        watchout: 'Technical communication to non-technical stakeholders assumes too much context',
        severity: 'Low',
        explanation: 'When explaining a technical blocker in the product scenario, Elena\'s response was accurate but used technical language (race conditions, eventual consistency, database transaction isolation) without translating these into business-impact terms. In practice, this can leave stakeholders confused and undermine trust.',
        evidence: 'The issue is that the current architecture doesn\'t support the transaction isolation level we\'d need for this to be consistent, it\'s a fundamental distributed systems constraint.',
        action: 'In onboarding, explicitly discuss the expectation that technical explanations to non-technical stakeholders lead with the business impact ("this will cause occasional double-charges for users") before the technical cause. Pair with a product manager who will give direct feedback on communication style.',
      },
    ],
    onboarding_plan: [
      'Week 1: Environment setup and architecture deep-dive. Elena will self-direct effectively here, provide access to all internal docs and a senior engineer as a named buddy for questions. She is likely to arrive with specific, well-formed questions.',
      'Week 2: First codebase contribution, a meaningful but well-scoped task. Elena\'s delivery focus means she will want to ship something real quickly; channel this energy into something with visible impact.',
      'Week 3: Attend a cross-functional planning session with product and design. Use this as a structured opportunity to practise non-technical stakeholder communication. Ask her to provide a written summary of technical considerations in plain English afterward.',
      'Week 4: First code review as reviewer, not author. This will reveal how she approaches mentoring and standards-setting, important data for understanding her team-fit and growth trajectory.',
    ],
    interview_questions: [
      'Tell me about a production incident you were involved in. Walk me through what happened, your role, and what you changed afterward. (Follow-up probe: How did you communicate with non-technical stakeholders during the incident?)',
      'Describe a situation where you disagreed with a technical decision that had already been made. How did you handle it? (Follow-up probe: What would you have done differently if you had been more junior?)',
      'How do you decide how much test coverage is enough for a given feature? (Follow-up probe: Can you give an example of a situation where you traded test coverage for speed of delivery?)',
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

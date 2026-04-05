'use client'
import { useRouter } from 'next/navigation'
import { Ic } from '@/components/Icons'
import ProdictaLogo from '@/components/ProdictaLogo'
import {
  NAVY, TEAL, TEALD, TEALLT, BG, CARD, BD, TX, TX2, TX3,
  GRN, GRNBG, GRNBD, AMB, AMBBG, AMBBD, RED, REDBG, REDBD, PURPLE,
  F, FM,
  scolor, sbg, sbd, slabel, dL, dC, riskBg, riskCol, riskBd,
} from '@/lib/constants'

// ── Sample data ──────────────────────────────────────────────────────────────

const CANDIDATE = {
  name: 'Sarah Mitchell',
  email: 's.mitchell@example.com',
  role: 'Marketing Manager',
  company: 'Vantara Technologies',
  completed: '14 March 2025',
}

const RESULTS = {
  overall_score: 78,
  percentile: 'Top 22%',
  risk_level: 'Low',
  risk_reason: 'Sarah demonstrates consistent reasoning across all four scenarios with no significant red flags. Her responses show genuine engagement with the material and a structured approach to problem-solving.',
  scores: {
    Communication: 84,
    'Problem Solving': 76,
    Prioritisation: 71,
    Leadership: 73,
  },
  score_narratives: {
    Communication: 'Sarah\'s written communication is a clear strength. Her email response in Scenario 1 was professional, concise, and well-structured, with an appropriate tone for the stakeholder involved. She demonstrated an ability to simplify complex information without losing key detail.',
    'Problem Solving': 'Sarah showed solid analytical thinking, identifying root causes rather than surface symptoms in Scenarios 2 and 3. She is methodical but occasionally over-explains her reasoning, which can dilute the impact of her recommendations.',
    Prioritisation: 'Her prioritisation approach is sound but slightly formulaic. She defaults to impact/effort analysis without always accounting for political or time-sensitive factors. In Scenario 2, she ranked correctly but for partially incomplete reasons.',
    Leadership: 'Sarah demonstrates a collaborative leadership style with strong stakeholder management language. She mentions bringing others along and consulting team members before deciding, which is appropriate for this seniority level.',
  },
  pressure_fit_score: 74,
  pressure_fit: {
    decision_speed_quality: { score: 78, verdict: 'Moderate', narrative: 'Sarah makes decisions within her responses but frequently adds qualifiers. In the conflict scenario, she proposed a clear path but then partially walked it back. She would benefit from more confident commitment in high-pressure moments.' },
    composure_under_conflict: { score: 72, verdict: 'Moderate', narrative: 'Her conflict response was measured and professional. She avoided escalation language and proposed a structured resolution. No emotional reactivity detected, though she sometimes over-explains to avoid confrontation.' },
    prioritisation_under_load: { score: 69, verdict: 'Moderate', narrative: 'When faced with competing demands in Scenario 2, Sarah produced a solid framework but took longer to arrive at a clear conclusion than expected. She was strong on rationale but weaker on speed of commitment.' },
    ownership_accountability: { score: 80, verdict: 'Strength', narrative: 'Sarah consistently used first-person ownership language and made specific, actionable commitments. This is a notable strength. She does not deflect or attribute issues to external circumstances.' },
  },
  ai_summary: `Sarah Mitchell is a well-rounded marketing professional whose written responses demonstrate clear commercial thinking and strong interpersonal awareness. Across all four scenarios, she engaged thoughtfully with each situation, producing structured and professional responses that reflect her experience level.\n\nHer communication skills stand out. She writes clearly, adapts her tone to different audiences, and avoids jargon. Her stakeholder management approach is collaborative and considered, which suggests she would navigate the cross-functional nature of this role effectively.\n\nThe main area to probe is her decision confidence under ambiguity. In two of the four scenarios, she produced excellent analysis but was slower to commit to a clear recommendation than you would typically expect at Marketing Manager level. This is not a red flag. Many strong performers hedge more in written exercises than they do in live situations, but it is worth exploring directly in interview.\n\nOverall, Sarah presents as a strong candidate for this role. Her profile suggests she would perform well through probation with a structured onboarding plan that gives her early visibility and clear ownership.`,
  strengths: [
    {
      text: 'Compelling written communication',
      evidence: '"I\'d recommend we shift focus to the mid-market segment for Q3, given the margin improvement we saw in March. This positions us ahead of the competitor announcement expected in July." Clear, specific, and commercially framed.',
      severity: 'High',
    },
    {
      text: 'Strong stakeholder awareness',
      evidence: '"Before finalising this, I\'d want a quick alignment call with finance and the regional leads. They\'ll need to brief their teams before this goes public." Proactively identifies who needs to be included.',
      severity: 'High',
    },
    {
      text: 'Proactive problem framing',
      evidence: 'Rather than describing what went wrong in Scenario 3, Sarah reframed it as an opportunity: "This gives us a chance to reset expectations and demonstrate what the team can do when given the right brief."',
      severity: 'Medium',
    },
  ],
  watchouts: [
    {
      text: 'Decision confidence under ambiguity',
      evidence: '"I\'d want to see the full dataset before committing to a direction here..." Said across two different scenarios, suggesting a pattern of deferring commitment when data is incomplete.',
      severity: 'Medium',
      action: 'Ask directly in interview: "Tell me about a time you had to make a significant call with incomplete information. What did you decide and what happened?"',
    },
    {
      text: 'Limited evidence of direct team management',
      evidence: 'References "working with the team" and "coordinating with designers" but does not describe managing, directing, or developing direct reports in any response.',
      severity: 'Low',
      action: 'Clarify the size and structure of teams she has managed previously. The role may require line management from day one.',
    },
  ],
  onboarding_plan: [
    'Weeks 1 to 2: Brand and product immersion, shadowing current campaigns, reviewing competitor landscape, and meeting key internal stakeholders.',
    'Weeks 3-4: Audit of existing campaign performance against targets; identify quick wins for Q2 pipeline.',
    'Month 2: Lead one mid-sized campaign end-to-end with senior oversight. This builds confidence and creates early visible impact.',
    'Month 3: Full ownership of campaign calendar. Structured 30-day check-in with line manager to review priorities and flag any blockers.',
    'Month 6 (probation review): Full assessment against KPIs set at onboarding, with particular focus on cross-functional relationship quality and decision-making independence.',
  ],
  interview_questions: [
    'Tell me about a time you had to launch a campaign with incomplete data. What did you decide and how did it land?',
    'How do you handle it when a key stakeholder pushes back hard on your creative direction?',
    'Describe a moment where you had to reprioritise a major project mid-flight. What triggered the change and what did you do?',
    'What does "good" look like for you personally in the first 90 days in this role?',
    'Walk me through a campaign you\'re most proud of. What was the measurable impact and what would you do differently?',
  ],
  timing: [
    { label: 'Scenario 1', time: '11m 24s', flag: 'Normal' },
    { label: 'Scenario 2', time: '9m 52s',  flag: 'Normal' },
    { label: 'Scenario 3', time: '13m 07s', flag: 'Normal' },
    { label: 'Scenario 4', time: '10m 44s', flag: 'Normal' },
  ],
  integrity: {
    response_quality: 'Likely Genuine',
    quality_notes: 'Responses are varied in length, use concrete examples, and contain role-specific vocabulary consistent with genuine marketing experience. No AI-generated patterning detected.',
    consistency_rating: 'High',
  },
}

const score = RESULTS.overall_score
const passPct = s => s >= 85 ? 96 : s >= 75 ? 89 : s >= 60 ? 72 : s >= 45 ? 51 : 28

// ── Reusable primitives ───────────────────────────────────────────────────────

const Card = ({ children, style = {} }) => (
  <div style={{
    background: CARD, border: `1px solid ${BD}`,
    borderRadius: 14, padding: '22px 26px', ...style,
  }}>
    {children}
  </div>
)

const SectionHeading = ({ children }) => (
  <h2 style={{ fontFamily: F, fontSize: 16, fontWeight: 800, color: TX, margin: '0 0 16px', letterSpacing: '-0.2px' }}>
    {children}
  </h2>
)

const EvidenceBox = ({ children, color = TX2 }) => (
  <div style={{
    background: '#f8fafc', border: `1px solid ${BD}`,
    borderLeft: `3px solid ${color === TX2 ? TEAL : color}`,
    borderRadius: '0 8px 8px 0', padding: '10px 14px', marginTop: 8,
  }}>
    <p style={{ fontFamily: F, fontSize: 12.5, color: TX2, margin: 0, lineHeight: 1.65, fontStyle: 'italic' }}>
      {children}
    </p>
  </div>
)

const ActionBox = ({ children }) => (
  <div style={{
    background: '#f8fafc', border: `1px solid ${BD}`,
    borderLeft: `3px solid ${TX3}`,
    borderRadius: '0 8px 8px 0', padding: '10px 14px', marginTop: 10,
    display: 'flex', gap: 8, alignItems: 'flex-start',
  }}>
    <Ic name="zap" size={13} color={TX3} />
    <p style={{ fontFamily: F, fontSize: 12.5, color: TX2, margin: 0, lineHeight: 1.55 }}>
      <strong>Recommended action:</strong> {children}
    </p>
  </div>
)

function sevStyle(sev) {
  if (sev === 'High')   return { bg: REDBG, color: RED, border: REDBD }
  if (sev === 'Medium') return { bg: AMBBG, color: AMB, border: AMBBD }
  return { bg: '#f1f5f9', color: TX3, border: BD }
}

function pfScoreColor(s) { return s >= 80 ? GRN : s >= 55 ? TEALD : RED }
function pfScoreBg(s)    { return s >= 80 ? GRNBG : s >= 55 ? TEALLT : REDBG }

function verdictStyle(v) {
  if (v === 'Strength') return { color: GRN, bg: GRNBG, bd: GRNBD }
  if (v === 'Concern')  return { color: RED, bg: REDBG, bd: '#fecaca' }
  return { color: TEALD, bg: TEALLT, bd: `${TEAL}55` }
}

const PF_DIMENSIONS = [
  { key: 'decision_speed_quality',   label: 'Decision Speed & Quality',   icon: 'zap' },
  { key: 'composure_under_conflict',  label: 'Composure Under Conflict',   icon: 'alert' },
  { key: 'prioritisation_under_load', label: 'Prioritisation Under Load',  icon: 'sliders' },
  { key: 'ownership_accountability',  label: 'Ownership & Accountability', icon: 'award' },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SampleReportPage() {
  const router = useRouter()

  return (
    <div style={{ background: BG, minHeight: '100vh', fontFamily: F }}>

      {/* ── Sample Banner ── */}
      <div style={{
        background: NAVY, padding: '12px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 16, flexWrap: 'wrap',
        position: 'sticky', top: 0, zIndex: 200,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '3px 10px', borderRadius: 20,
            background: `${TEAL}22`, border: `1px solid ${TEAL}44`,
            fontSize: 11, fontWeight: 700, color: TEAL, letterSpacing: '0.05em',
          }}>
            SAMPLE
          </div>
          <span style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.75)', fontFamily: F }}>
            This is an example report.{' '}
            <span style={{ color: 'rgba(255,255,255,0.45)' }}>Sign up to assess your own candidates.</span>
          </span>
        </div>
        <button
          onClick={() => router.push('/login')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '8px 18px', borderRadius: 8,
            background: TEAL, color: NAVY,
            border: 'none', fontFamily: F, fontSize: 13, fontWeight: 700,
            cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
          }}
        >
          Get started
          <Ic name="right" size={14} color={NAVY} />
        </button>
      </div>

      {/* ── Top nav ── */}
      <div style={{
        background: CARD, borderBottom: `1px solid ${BD}`,
        padding: '16px 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <ProdictaLogo textColor={NAVY} size={30} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: TX3, fontFamily: F }}>
            Prodicta Assessment Report
          </span>
          <button
            onClick={() => window.print()}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'transparent', border: `1.5px solid ${BD}`,
              borderRadius: 8, cursor: 'pointer',
              fontFamily: F, fontSize: 13, fontWeight: 700, color: TX2,
              padding: '8px 14px',
            }}
          >
            <Ic name="download" size={14} color={TX2} />
            Export PDF
          </button>
        </div>
      </div>
      <style>{`@media print { .no-print { display: none !important; } * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`}</style>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 40px' }}>

        {/* ── 1. Candidate header ── */}
        <Card style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
            {/* Avatar + meta */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, flex: 1, minWidth: 220 }}>
              {/* Gradient avatar */}
              <div style={{
                width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                background: `linear-gradient(135deg, ${TEALD} 0%, ${NAVY} 100%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: FM, fontSize: 18, fontWeight: 800, color: '#fff',
              }}>
                SM
              </div>
              <div>
                <h2 style={{ fontFamily: F, fontSize: 20, fontWeight: 800, color: TX, margin: '0 0 2px', letterSpacing: '-0.3px' }}>
                  {CANDIDATE.name}
                </h2>
                <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: '0 0 6px' }}>
                  {CANDIDATE.email}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center',
                    padding: '3px 11px', borderRadius: 50,
                    fontSize: 11, fontWeight: 700,
                    background: TEALLT, color: TEALD, border: `1px solid ${TEAL}55`,
                  }}>
                    {CANDIDATE.role}
                  </span>
                  <span style={{ fontSize: 12, color: TX3, fontFamily: F }}>
                    Completed {CANDIDATE.completed}
                  </span>
                </div>
              </div>
            </div>

            {/* Score + percentile */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexShrink: 0 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: FM, fontSize: 52, fontWeight: 700, color: scolor(score), lineHeight: 1 }}>
                  {score}
                </div>
                <div style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: scolor(score), marginTop: 3 }}>
                  {slabel(score)}
                </div>
                <div style={{
                  marginTop: 6, fontFamily: F, fontSize: 11.5, fontWeight: 600,
                  color: TEALD, background: TEALLT, border: `1px solid ${TEAL}55`,
                  borderRadius: 20, padding: '3px 10px', whiteSpace: 'nowrap',
                }}>
                  {RESULTS.percentile} of candidates
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* ── 2. Summary row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>

          {/* Probation prediction */}
          <Card style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              Predicted probation success
            </div>
            <div style={{ fontFamily: FM, fontSize: 40, fontWeight: 700, color: scolor(score), lineHeight: 1, marginBottom: 8 }}>
              {passPct(score)}%
            </div>
            <div style={{ height: 6, borderRadius: 99, background: BD, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${passPct(score)}%`,
                background: scolor(score), borderRadius: 99,
              }} />
            </div>
            <div style={{ fontFamily: F, fontSize: 11.5, color: TX3, marginTop: 8 }}>chance of passing probation</div>
          </Card>

          {/* Hiring decision */}
          <Card style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              Hiring decision
            </div>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: sbg(score), border: `1px solid ${sbd(score)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10,
            }}>
              <Ic name="award" size={22} color={scolor(score)} />
            </div>
            <div style={{ fontFamily: F, fontSize: 16, fontWeight: 800, color: dC(score), lineHeight: 1.2, textAlign: 'center' }}>
              {dL(score)}
            </div>
          </Card>

          {/* Risk level */}
          <Card>
            <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              Risk level
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '4px 14px', borderRadius: 50, fontSize: 13, fontWeight: 800,
                background: riskBg(RESULTS.risk_level),
                color: riskCol(RESULTS.risk_level),
                border: `1px solid ${riskBd(RESULTS.risk_level)}`,
              }}>
                {RESULTS.risk_level}
              </span>
            </div>
            <p style={{ fontFamily: F, fontSize: 12.5, color: TX2, margin: 0, lineHeight: 1.6 }}>
              {RESULTS.risk_reason}
            </p>
          </Card>
        </div>

        {/* ── 3. Response Integrity ── */}
        <Card style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
            <div>
              <SectionHeading>Response Integrity</SectionHeading>
              <p style={{ fontFamily: F, fontSize: 12.5, color: TX3, margin: '-8px 0 0' }}>
                AI analysis of response authenticity, timing, and consistency across all 4 scenarios.
              </p>
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '8px 16px', borderRadius: 10,
              background: TEALLT, border: `1.5px solid ${TEAL}55`, flexShrink: 0,
            }}>
              <Ic name="check" size={16} color={TEALD} />
              <span style={{ fontFamily: F, fontSize: 14, fontWeight: 800, color: TEALD }}>
                {RESULTS.integrity.response_quality}
              </span>
            </div>
          </div>

          {/* Timing tiles */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              Time per scenario
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {RESULTS.timing.map(t => (
                <div key={t.label} style={{
                  flex: '1 1 100px', background: GRNBG, border: `1px solid ${GRNBD}`,
                  borderRadius: 8, padding: '10px 12px',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: TX3, marginBottom: 4 }}>{t.label}</div>
                  <div style={{ fontFamily: FM, fontSize: 18, fontWeight: 800, color: GRN, lineHeight: 1, marginBottom: 3 }}>{t.time}</div>
                  <div style={{ display: 'inline-block', fontSize: 10.5, fontWeight: 700, color: GRN, background: 'rgba(255,255,255,0.6)', borderRadius: 4, padding: '1px 6px' }}>
                    {t.flag}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <EvidenceBox>{RESULTS.integrity.quality_notes}</EvidenceBox>
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: TX2 }}>Response consistency:</span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
              background: GRNBG, color: GRN, border: `1px solid ${GRNBD}`,
            }}>
              {RESULTS.integrity.consistency_rating}
            </span>
          </div>
        </Card>

        {/* ── 4. Pressure-Fit ── */}
        <div style={{
          marginBottom: 20,
          background: `linear-gradient(135deg, #0f2137 0%, #0d3349 100%)`,
          border: `1px solid rgba(91,191,189,0.25)`,
          borderRadius: 14, overflow: 'hidden',
        }}>
          <div style={{
            padding: '22px 26px 18px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
          }}>
            <div>
              <h2 style={{ fontFamily: F, fontSize: 16, fontWeight: 800, color: '#fff', margin: '0 0 4px', letterSpacing: '-0.2px' }}>
                Pressure-Fit Assessment
              </h2>
              <p style={{ fontFamily: F, fontSize: 12.5, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                How this candidate performs when it matters most.
              </p>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
              padding: '10px 18px', borderRadius: 10,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <div style={{ fontFamily: FM, fontSize: 44, fontWeight: 800, color: pfScoreColor(RESULTS.pressure_fit_score), lineHeight: 1, letterSpacing: '-2px' }}>
                {RESULTS.pressure_fit_score}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: pfScoreColor(RESULTS.pressure_fit_score) }}>Moderate</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>overall / 100</div>
              </div>
            </div>
          </div>

          <div style={{ padding: '20px 26px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {PF_DIMENSIONS.map(({ key, label, icon }) => {
              const dim = RESULTS.pressure_fit[key]
              if (!dim) return null
              const vs = verdictStyle(dim.verdict)
              const sc = dim.score
              const sCol = pfScoreColor(sc)
              return (
                <div key={key}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: 7,
                        background: 'rgba(255,255,255,0.08)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <Ic name={icon} size={14} color={TEAL} />
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{label}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      <div style={{ fontFamily: FM, fontSize: 28, fontWeight: 800, color: sCol, lineHeight: 1 }}>
                        {sc}
                      </div>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '3px 10px', borderRadius: 20,
                        fontSize: 11, fontWeight: 700,
                        background: vs.bg, color: vs.color, border: `1px solid ${vs.bd}`,
                      }}>
                        {dim.verdict}
                      </span>
                    </div>
                  </div>
                  {/* Score bar */}
                  <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.1)', marginBottom: 10, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${sc}%`,
                      background: sCol, borderRadius: 99,
                    }} />
                  </div>
                  <p style={{ margin: 0, fontSize: 12.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.65 }}>
                    {dim.narrative}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── 5. Skills breakdown ── */}
        <Card style={{ marginBottom: 20 }}>
          <SectionHeading>Skills Breakdown</SectionHeading>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {Object.entries(RESULTS.scores).map(([skill, sc]) => (
              <div key={skill}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: TX }}>{skill}</span>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center',
                      padding: '2px 10px', borderRadius: 50, fontSize: 11, fontWeight: 700,
                      background: sbg(sc), color: scolor(sc), border: `1px solid ${sbd(sc)}`,
                    }}>
                      {slabel(sc)}
                    </span>
                  </div>
                  <span style={{ fontFamily: FM, fontSize: 24, fontWeight: 800, color: scolor(sc), lineHeight: 1 }}>
                    {sc}
                  </span>
                </div>
                <div style={{ height: 6, borderRadius: 99, background: BD, overflow: 'hidden', marginBottom: 10 }}>
                  <div style={{
                    height: '100%', width: `${sc}%`,
                    background: `linear-gradient(90deg, ${scolor(sc)}, ${scolor(sc)}cc)`,
                    borderRadius: 99, transition: 'width 0.6s ease',
                  }} />
                </div>
                <p style={{ margin: 0, fontSize: 13, color: TX2, lineHeight: 1.65 }}>
                  {RESULTS.score_narratives[skill]}
                </p>
              </div>
            ))}
          </div>
        </Card>

        {/* ── 6. AI Summary ── */}
        <Card style={{ marginBottom: 20 }}>
          <SectionHeading>AI Assessment Summary</SectionHeading>
          {RESULTS.ai_summary.split('\n\n').map((para, i) => (
            <p key={i} style={{ fontFamily: F, fontSize: 13.5, color: TX2, lineHeight: 1.75, margin: i === 0 ? '0 0 14px' : '14px 0 0' }}>
              {para}
            </p>
          ))}
        </Card>

        {/* ── 7. Strengths ── */}
        <Card style={{ marginBottom: 20 }}>
          <SectionHeading>Strengths</SectionHeading>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {RESULTS.strengths.map((s, i) => {
              const sv = sevStyle(s.severity)
              return (
                <div key={i} style={{ padding: '14px 16px', borderRadius: 10, background: GRNBG, border: `1px solid ${GRNBD}` }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <Ic name="check" size={16} color={GRN} />
                      <span style={{ fontSize: 14, fontWeight: 700, color: TX }}>{s.text}</span>
                    </div>
                    <span style={{
                      display: 'inline-flex', padding: '2px 9px', borderRadius: 50,
                      fontSize: 10.5, fontWeight: 700, flexShrink: 0,
                      background: sv.bg, color: sv.color, border: `1px solid ${sv.border}`,
                    }}>
                      {s.severity}
                    </span>
                  </div>
                  <EvidenceBox color={GRN}>{s.evidence}</EvidenceBox>
                </div>
              )
            })}
          </div>
        </Card>

        {/* ── 8. Watch-outs ── */}
        <Card style={{ marginBottom: 20 }}>
          <SectionHeading>Watch-outs</SectionHeading>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {RESULTS.watchouts.map((w, i) => {
              const sv = sevStyle(w.severity)
              return (
                <div key={i} style={{ padding: '14px 16px', borderRadius: 10, background: sv.bg, border: `1px solid ${sv.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <Ic name="alert" size={16} color={sv.color} />
                      <span style={{ fontSize: 14, fontWeight: 700, color: TX }}>{w.text}</span>
                    </div>
                    <span style={{
                      display: 'inline-flex', padding: '2px 9px', borderRadius: 50,
                      fontSize: 10.5, fontWeight: 700, flexShrink: 0,
                      background: sv.bg, color: sv.color, border: `1px solid ${sv.border}`,
                    }}>
                      {w.severity}
                    </span>
                  </div>
                  <EvidenceBox color={sv.color}>{w.evidence}</EvidenceBox>
                  <ActionBox>{w.action}</ActionBox>
                </div>
              )
            })}
          </div>
        </Card>

        {/* ── 9. Onboarding plan ── */}
        <Card style={{ marginBottom: 20 }}>
          <SectionHeading>Suggested Onboarding Plan</SectionHeading>
          <p style={{ fontFamily: F, fontSize: 13, color: TX3, margin: '-6px 0 18px' }}>
            Based on Sarah's assessment profile, we suggest this structured induction to set her up to pass probation.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {RESULTS.onboarding_plan.map((step, i) => (
              <div key={i} style={{
                display: 'flex', gap: 14, alignItems: 'flex-start',
                padding: '12px 16px', borderRadius: 10,
                background: i % 2 === 0 ? BG : TEALLT,
                border: `1px solid ${i % 2 === 0 ? BD : TEAL + '44'}`,
              }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                  background: TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: FM, fontSize: 11, fontWeight: 800, color: NAVY, marginTop: 1,
                }}>
                  {i + 1}
                </div>
                <p style={{ margin: 0, fontSize: 13.5, color: TX, lineHeight: 1.65 }}>{step}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* ── 10. Interview questions ── */}
        <Card style={{ marginBottom: 32 }}>
          <SectionHeading>Tailored Interview Questions</SectionHeading>
          <p style={{ fontFamily: F, fontSize: 13, color: TX3, margin: '-6px 0 18px' }}>
            Generated from what this specific assessment surfaced, to help you probe the areas that matter most.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {RESULTS.interview_questions.map((q, i) => (
              <div key={i} style={{
                display: 'flex', gap: 12, alignItems: 'flex-start',
                padding: '13px 16px', borderRadius: 10,
                background: CARD, border: `1px solid ${BD}`,
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  background: TEALLT, border: `1px solid ${TEAL}55`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: FM, fontSize: 11, fontWeight: 800, color: TEALD, marginTop: 1,
                }}>
                  {i + 1}
                </div>
                <p style={{ margin: 0, fontSize: 13.5, color: TX, lineHeight: 1.65 }}>{q}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* ── Bottom sign-up CTA ── */}
        <div className="no-print" style={{
          background: NAVY, borderRadius: 16, padding: '36px 40px',
          textAlign: 'center', marginBottom: 48,
        }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '3px 12px', borderRadius: 20,
            background: `${TEAL}22`, border: `1px solid ${TEAL}44`,
            fontSize: 11, fontWeight: 700, color: TEAL, letterSpacing: '0.06em',
            marginBottom: 16,
          }}>
            PRODICTA
          </div>
          <h2 style={{ margin: '0 0 10px', fontSize: 24, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>
            Assess your own candidates like this
          </h2>
          <p style={{ margin: '0 0 24px', fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, maxWidth: 440, marginLeft: 'auto', marginRight: 'auto' }}>
            Paste a job description. Get four AI-generated scenarios. Receive a full evidence-backed report like this one, within minutes of your candidate finishing.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button
              onClick={() => router.push('/login')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '13px 28px', borderRadius: 9,
                background: TEAL, color: NAVY,
                border: 'none', fontFamily: F, fontSize: 15, fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Get started
              <Ic name="right" size={16} color={NAVY} />
            </button>
            <button
              onClick={() => router.push('/how-it-works')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '13px 28px', borderRadius: 9,
                background: 'transparent', color: 'rgba(255,255,255,0.75)',
                border: '1.5px solid rgba(255,255,255,0.2)',
                fontFamily: F, fontSize: 15, fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              How it works
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

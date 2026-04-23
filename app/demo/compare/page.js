'use client'
import { useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { DemoLayout, SignUpModal } from '@/components/DemoShell'
import { Ic } from '@/components/Icons'
import InfoTooltip from '@/components/InfoTooltip'
import Avatar from '@/components/Avatar'
import { DEMO_ASSESSMENTS, DEMO_CANDIDATES, getDemoCandidatesFull } from '@/lib/demo-data'
import { NAVY, TEAL, TEALD, TEALLT, BG, CARD, BD, TX, TX2, TX3, GRN, GRNBG, GRNBD, AMB, AMBBG, AMBBD, RED, REDBG, REDBD, F, FM, riskBg, riskCol, riskBd } from '@/lib/constants'

const _mSub = (cb) => { window.addEventListener('resize', cb); return () => window.removeEventListener('resize', cb) }
const _mSnap = () => window.innerWidth <= 768
const _mServer = () => false
function useIsMobile() { return useSyncExternalStore(_mSub, _mSnap, _mServer) }

const sc   = s => s >= 85 ? GRN  : s >= 70 ? TEAL : s >= 50 ? AMB  : RED
const sbg  = s => s >= 85 ? GRNBG : s >= 70 ? TEALLT : s >= 50 ? AMBBG : REDBG
const sbd  = s => s >= 85 ? GRNBD : s >= 70 ? `${TEAL}55` : s >= 50 ? AMBBD : REDBD
const slbl = s => s >= 85 ? 'Excellent' : s >= 75 ? 'Strong' : s >= 65 ? 'Good' : s >= 50 ? 'Developing' : 'Concern'
const dL   = s => s >= 80 ? 'Strong hire' : s >= 70 ? 'Hire with plan' : s >= 55 ? 'Proceed with caution' : 'Not recommended'
const dC   = s => s >= 80 ? GRN : s >= 70 ? TEALD : s >= 55 ? AMB : RED

const SHADOW = '0 2px 12px rgba(15,33,55,0.08)'

function ScoreRing({ score, size = 80, strokeWidth = 7 }) {
  const r = (size - strokeWidth * 2) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = sc(score)
  return (
    <svg width={size} height={size} style={{ filter: `drop-shadow(0 0 6px ${color}55)` }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={`${color}22`} strokeWidth={strokeWidth} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        fill={color} fontFamily={FM} fontSize={size * 0.22} fontWeight={700}>{score}</text>
    </svg>
  )
}

const completedCandidates = getDemoCandidatesFull()

function CandidateSelector({ value, onChange, exclude }) {
  const options = completedCandidates.filter(c => !exclude.includes(c.id))
  return (
    <select
      value={value || ''}
      onChange={e => onChange(e.target.value || null)}
      style={{
        width: '100%', padding: '9px 12px', borderRadius: 8, border: `1.5px solid ${BD}`,
        fontFamily: F, fontSize: 13, color: value ? TX : TX3, background: CARD,
        cursor: 'pointer', outline: 'none', appearance: 'none',
      }}
    >
      <option value="">Select candidate</option>
      {completedCandidates.map(c => (
        <option key={c.id} value={c.id} disabled={exclude.includes(c.id) && c.id !== value}>
          {c.name} ({c.assessments.role_title})
        </option>
      ))}
    </select>
  )
}

function Col({ candidateId, onClear, onViewReport }) {
  const c = candidateId ? completedCandidates.find(x => x.id === candidateId) : null
  const r = c?.results?.[0]

  if (!c || !r) {
    return (
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, background: BG, borderRadius: 12, border: `2px dashed ${BD}`, gap: 12 }}>
        <Ic name="user" size={32} color={TX3} />
        <p style={{ fontFamily: F, fontSize: 13.5, color: TX3, margin: 0, textAlign: 'center' }}>Select a candidate above to compare</p>
      </div>
    )
  }

  const pfColor = s => s == null ? TX3 : s >= 80 ? GRN : s >= 55 ? TEALD : RED

  return (
    <div style={{ flex: 1, minWidth: 0, background: CARD, border: `1px solid ${BD}`, borderRadius: 12, overflow: 'hidden', boxShadow: SHADOW }}>
      {/* Header */}
      <div style={{ background: NAVY, padding: '20px 20px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar name={c.name} size={40} />
            <div>
              <p style={{ fontFamily: F, fontSize: 16, fontWeight: 800, color: '#fff', margin: '0 0 3px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {c.name}
                {c.assessments?.employment_type && (
                  <span style={{
                    fontSize: 9, fontWeight: 800, letterSpacing: '0.04em',
                    padding: '1px 6px', borderRadius: 4,
                    background: c.assessments.employment_type === 'temporary' ? TEAL : 'rgba(255,255,255,0.2)',
                    color: c.assessments.employment_type === 'temporary' ? NAVY : '#fff',
                  }}>
                    {c.assessments.employment_type === 'temporary' ? 'TEMP' : 'PERM'}
                  </span>
                )}
              </p>
              <p style={{ fontFamily: F, fontSize: 12, color: 'rgba(255,255,255,0.55)', margin: 0 }}>{c.assessments.role_title}</p>
            </div>
          </div>
          <button onClick={onClear} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 6, padding: '5px 7px', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center' }}>
            <Ic name="x" size={14} color="rgba(255,255,255,0.5)" />
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <ScoreRing score={r.overall_score} size={72} strokeWidth={6} />
          <div>
            <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 50, fontSize: 11, fontWeight: 700, background: riskBg(r.risk_level), color: riskCol(r.risk_level), marginBottom: 6 }}>{r.risk_level} Risk</span>
            <p style={{ fontFamily: F, fontSize: 12.5, color: 'rgba(255,255,255,0.7)', margin: '0 0 2px' }}>{r.percentile}</p>
            <p style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: dC(r.overall_score), margin: 0 }}>{dL(r.overall_score)}</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Pressure Fit */}
        <div>
          <p style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: TX3, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pressure Fit</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, height: 8, borderRadius: 99, background: BG, overflow: 'hidden' }}>
              <div style={{ width: `${r.pressure_fit_score}%`, height: '100%', borderRadius: 99, background: pfColor(r.pressure_fit_score) }} />
            </div>
            <span style={{ fontFamily: FM, fontSize: 13, fontWeight: 700, color: pfColor(r.pressure_fit_score), minWidth: 28 }}>{r.pressure_fit_score}</span>
          </div>
        </div>

        {/* Skill scores */}
        {r.scores && (
          <div>
            <p style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: TX3, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Skill Scores</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.entries(r.scores).map(([skill, score]) => (
                <div key={skill}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontFamily: F, fontSize: 12.5, color: TX2 }}>{skill}</span>
                    <span style={{ fontFamily: FM, fontSize: 12, fontWeight: 700, color: sc(score) }}>{score}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 99, background: BG, overflow: 'hidden' }}>
                    <div style={{ width: `${score}%`, height: '100%', borderRadius: 99, background: sc(score) }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Strengths */}
        {r.strengths?.length > 0 && (
          <div>
            <p style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: TX3, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Key Strengths</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {r.strengths.slice(0, 3).map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                  <svg width={13} height={13} viewBox="0 0 24 24" fill={GRN} style={{ flexShrink: 0, marginTop: 1 }}>
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                  <span style={{ fontFamily: F, fontSize: 12.5, color: TX2, lineHeight: 1.4 }}>{s.strength}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Watch-outs */}
        {r.watchouts?.length > 0 && (
          <div>
            <p style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: TX3, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Watch-outs</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {r.watchouts.slice(0, 2).map((w, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                  <Ic name="alert-triangle" size={13} color={AMB} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontFamily: F, fontSize: 12.5, color: TX2, lineHeight: 1.4 }}>{w.watchout}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => onViewReport(c.id)}
          style={{ width: '100%', padding: '11px 0', borderRadius: 8, border: 'none', background: TEAL, color: NAVY, fontFamily: F, fontSize: 13.5, fontWeight: 800, cursor: 'pointer', marginTop: 4 }}
        >
          View full report →
        </button>
      </div>
    </div>
  )
}

const DEMO_REPLAY_SCENARIO = {
  type: 'Stakeholder management',
  title: 'Flagship launch slipping by three weeks',
  context: `You are the Marketing Manager for a consumer tech brand. The product team has just confirmed that the flagship Q4 launch will slip by three weeks. The CEO is expecting the campaign to go live on the original date, the PR agency has already pitched journalists, and paid media is booked from next Monday. You have 24 hours to decide how to handle it and send a single written update to the CEO and Head of Product.`,
  task: 'Write your update. Set out the decision you are recommending, what you will do in the next 24 hours, and how you will hold the launch moment together.',
  candidates: [
    {
      id: 'demo-sophie',
      name: 'Sophie Chen',
      employment_type: 'permanent',
      overall_score: 87,
      score_10: 9,
      observation: 'Led with a clear recommendation, sequenced stakeholder actions, and protected the launch moment with a specific contingency plan.',
      response_text: `My recommendation is that we do not slide the campaign by three weeks. We hold the launch date, pull paid media back by seven days, and convert the first ten days into a teaser phase built around the founder story and two beta customer interviews we already have signed off.

In the next 24 hours I will do three things. First, I will call the PR agency personally and brief them that the embargo date holds but the product review units land three weeks later, so we move journalist briefings from demo-led to narrative-led and protect two exclusives for the actual product reveal. Second, I will draft a one-page note for the CEO with three options ranked by revenue impact and reputational risk, and recommend option one. Third, I will pause spend on the bottom-of-funnel creative and redirect the budget into the teaser phase.

The risk I am managing for is a journalist feeling misled, so transparency with the two tier-one titles matters more than protecting the narrative.`,
    },
    {
      id: 'demo-marcus',
      name: 'Marcus Williams',
      employment_type: 'permanent',
      overall_score: 68,
      score_10: 6,
      observation: 'Identified the right stakeholders and the need to communicate, but the plan was general and the trade-offs were not owned.',
      response_text: `This is a difficult situation and the most important thing is to make sure everyone is aligned. I would start by having a conversation with the product team to really understand why the three-week delay has happened and whether there is anything that can be done to pull the date back in.

I would then speak to the PR agency and let them know what is going on so that we can work out the best way forward together. We might need to shift some of the paid media or talk to the publications about rescheduling. The CEO will obviously want to know, so I would put together an update explaining the situation and asking for a decision on the new timing.

Throughout, the key is keeping communication clear and making sure we protect the brand. I would look at what other teams have done in similar situations and make sure we are taking a sensible approach. We can always adjust as more information comes in.`,
    },
  ],
}

export default function DemoComparePage() {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [modal, setModal] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  // Six slots lets recruiters hold a full shortlist in view. The grid
   // uses auto-fit/minmax below, so it collapses gracefully on smaller screens.
  const [slots, setSlots] = useState([null, null, null, null, null, null])

  const setSlot = (i, val) => setSlots(prev => prev.map((v, idx) => idx === i ? val : v))

  const excluded = (i) => slots.filter((v, idx) => v !== null && idx !== i)

  return (
    <DemoLayout active="compare">
      {modal && <SignUpModal onClose={() => setModal(false)} />}
      <main style={{ marginLeft: isMobile ? 0 : 220, marginTop: isMobile ? 96 : 46, minHeight: '100vh', background: BG, padding: isMobile ? '16px 16px 32px' : '32px 32px 48px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {/* Page header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ fontFamily: F, fontSize: 22, fontWeight: 800, color: TX, margin: '0 0 4px', letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: 8 }}>Compare Candidates <InfoTooltip text="Side-by-side comparison of up to 6 candidates across all metrics." /></h1>
              <p style={{ fontFamily: F, fontSize: 14, color: TX2, margin: 0 }}>Select up to 6 completed candidates to compare side by side</p>
            </div>
            <button
              onClick={() => setModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 8, border: 'none', background: TEAL, color: NAVY, fontFamily: F, fontSize: 13.5, fontWeight: 800, cursor: 'pointer' }}
            >
              <Ic name="download" size={15} color={NAVY} />
              Export comparison
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: `1px solid ${BD}` }}>
            {[
              { key: 'overview', label: 'Overview' },
              { key: 'replay', label: 'Scenario Replay' },
            ].map(t => {
              const active = activeTab === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  style={{
                    padding: '10px 16px', border: 'none', background: 'transparent',
                    fontFamily: F, fontSize: 13, fontWeight: 700,
                    color: active ? NAVY : TX3, cursor: 'pointer',
                    borderBottom: `2px solid ${active ? TEAL : 'transparent'}`,
                    marginBottom: -1,
                  }}
                >
                  {t.label}
                </button>
              )
            })}
          </div>

          {activeTab === 'replay' ? (
            <DemoScenarioReplay isMobile={isMobile} />
          ) : (
          <>

          {/* Selectors */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: 16, marginBottom: 24 }}>
            {slots.map((val, i) => (
              <div key={i}>
                <p style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: TX3, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Candidate {i + 1}</p>
                <CandidateSelector
                  value={val}
                  onChange={v => setSlot(i, v)}
                  exclude={excluded(i)}
                />
              </div>
            ))}
          </div>

          {/* Columns */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: 16, alignItems: 'start' }}>
            {slots.map((val, i) => (
              <Col
                key={i}
                candidateId={val}
                onClear={() => setSlot(i, null)}
                onViewReport={id => router.push(`/demo/candidate/${id}`)}
              />
            ))}
          </div>

          {/* Empty state hint */}
          {slots.every(v => !v) && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: TX3 }}>
              <Ic name="sliders" size={36} color={TX3} />
              <p style={{ fontFamily: F, fontSize: 15, margin: '14px 0 0' }}>Choose candidates from the dropdowns above to start comparing</p>
            </div>
          )}
          </>
          )}
        </div>
      </main>
    </DemoLayout>
  )
}

function DemoScenarioReplay({ isMobile }) {
  const scenario = DEMO_REPLAY_SCENARIO
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: F, fontSize: 12.5, fontWeight: 700, color: TX2 }}>
          Scenario 1 of 1 shared
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            disabled
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, border: `1px solid ${BD}`, background: CARD, fontFamily: F, fontSize: 12, fontWeight: 600, color: TX3, cursor: 'not-allowed', opacity: 0.5 }}
          >
            <Ic name="left" size={13} color={TX3} />
            Previous
          </button>
          <button
            disabled
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, border: `1px solid ${BD}`, background: CARD, fontFamily: F, fontSize: 12, fontWeight: 600, color: TX3, cursor: 'not-allowed', opacity: 0.5 }}
          >
            Next
            <Ic name="right" size={13} color={TX3} />
          </button>
        </div>
      </div>

      <div style={{
        background: BG, border: `1px solid ${BD}`, borderRadius: 12,
        padding: '18px 22px', marginBottom: 16,
        position: isMobile ? 'sticky' : 'static', top: isMobile ? 0 : undefined, zIndex: isMobile ? 2 : undefined,
      }}>
        <div style={{ fontFamily: F, fontSize: 10.5, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
          {scenario.type}
        </div>
        <div style={{ fontFamily: F, fontSize: 15, fontWeight: 800, color: NAVY, marginBottom: 8 }}>
          {scenario.title}
        </div>
        <p style={{ fontFamily: F, fontSize: 13, color: TX2, fontStyle: 'italic', margin: 0, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
          {scenario.context}
        </p>
        <div style={{ marginTop: 12, background: TEALLT, border: `1px solid ${TEAL}40`, borderRadius: 8, padding: '10px 14px' }}>
          <div style={{ fontFamily: F, fontSize: 10, fontWeight: 700, color: TEALD, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Task</div>
          <p style={{ fontFamily: F, fontSize: 12.5, color: TEALD, fontWeight: 600, margin: 0, lineHeight: 1.55 }}>
            {scenario.task}
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
        {scenario.candidates.map(c => {
          const isStrong = c.score_10 >= 7
          const isModerate = c.score_10 >= 5 && c.score_10 < 7
          const accent = isStrong ? TEAL : isModerate ? AMB : TX3
          return (
            <div key={c.id} style={{
              background: CARD, border: `1px solid ${BD}`, borderRadius: 12,
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}>
              <div style={{ padding: '14px 16px', borderBottom: `1px solid ${BD}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Avatar name={c.name} size={28} />
                  <div style={{ fontFamily: F, fontSize: 13.5, fontWeight: 700, color: TX, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.name}
                  </div>
                  <span style={{
                    fontSize: 9, fontWeight: 800, letterSpacing: '0.04em',
                    padding: '1px 6px', borderRadius: 4, flexShrink: 0,
                    background: c.employment_type === 'temporary' ? TEAL : NAVY, color: '#fff',
                  }}>
                    {c.employment_type === 'temporary' ? 'TEMP' : 'PERM'}
                  </span>
                </div>
                <span style={{
                  display: 'inline-block', fontFamily: FM, fontSize: 11, fontWeight: 800,
                  padding: '2px 8px', borderRadius: 999,
                  background: sc(c.overall_score) === GRN ? GRNBG : sc(c.overall_score) === TEAL ? TEALLT : sc(c.overall_score) === AMB ? AMBBG : REDBG,
                  color: sc(c.overall_score),
                  border: `1px solid ${sc(c.overall_score)}33`,
                }}>
                  Overall {c.overall_score}/100
                </span>
              </div>
              <div style={{ padding: '16px 18px', flex: 1, background: BG }}>
                <p style={{ fontFamily: F, fontSize: 13, color: TX, margin: 0, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
                  {c.response_text}
                </p>
              </div>
              <div style={{ padding: '12px 16px', borderTop: `1px solid ${BD}`, background: CARD, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{
                  alignSelf: 'flex-start', fontFamily: FM, fontSize: 11, fontWeight: 800,
                  padding: '2px 8px', borderRadius: 999,
                  background: isStrong ? GRNBG : isModerate ? AMBBG : BG,
                  color: isStrong ? GRN : isModerate ? AMB : TX3,
                  border: `1px solid ${isStrong ? GRNBD : isModerate ? AMBBD : BD}`,
                }}>
                  Scenario score {c.score_10}/10
                </span>
                <div style={{ fontFamily: F, fontSize: 12, color: TX2, lineHeight: 1.55 }}>
                  {c.observation}
                </div>
              </div>
              <div style={{ height: 4, background: accent }} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

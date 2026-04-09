'use client'

import { useState, useEffect } from 'react'

const NAVY = '#0f2137'
const TEAL = '#00BFA5'
const TEALD = '#00897B'
const TEALLT = '#e6f7f4'
const BG = '#f7f9fb'
const CARD = '#ffffff'
const BD = '#e4e9f0'
const TX = '#1a202c'
const TX2 = '#4a5568'
const TX3 = '#94a1b3'
const F = "'Outfit', system-ui, sans-serif"

export default function CandidateFeedbackPage({ params }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/assess/${params.uniqueToken}/feedback`)
        const json = await res.json()
        if (!res.ok) {
          if (json.error === 'feedback_disabled') setError('Feedback is not available for this assessment.')
          else if (json.error === 'not_ready') setError('Your assessment is still being scored. Please check back shortly.')
          else setError(json.error || 'Unable to load feedback')
        } else {
          setData(json)
        }
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.uniqueToken])

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: F, color: TX }}>
      <header style={{ background: NAVY, padding: '20px 24px', textAlign: 'center' }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: TEAL, letterSpacing: '-0.5px' }}>PRODICTA</span>
      </header>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px 80px' }}>
        {loading && (
          <div style={{ textAlign: 'center', color: TX3, fontSize: 14 }}>Loading your development report...</div>
        )}

        {!loading && error && (
          <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 14, padding: 32, textAlign: 'center' }}>
            <p style={{ fontSize: 15, color: TX2, lineHeight: 1.6, margin: 0 }}>{error}</p>
          </div>
        )}

        {!loading && data && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 36 }}>
              <div style={{
                display: 'inline-block', background: TEALLT, color: TEALD,
                padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16,
              }}>
                Your Development Report
              </div>
              <h1 style={{ fontSize: 30, fontWeight: 800, color: NAVY, margin: '0 0 10px', lineHeight: 1.2 }}>
                {data.candidate_name}
              </h1>
              <p style={{ fontSize: 15, color: TX2, lineHeight: 1.65, margin: 0 }}>
                Assessment for {data.role_title} with {data.company_name}
              </p>
            </div>

            {/* What You Did Well */}
            {data.strengths && data.strengths.length > 0 && (
              <div style={{ background: CARD, border: `1px solid ${BD}`, borderLeft: `5px solid ${TEAL}`, borderRadius: 14, padding: '26px 28px', marginBottom: 20 }}>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: NAVY, margin: '0 0 16px' }}>What You Did Well</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {data.strengths.map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', background: TEALLT,
                        border: `1px solid ${TEAL}55`, flexShrink: 0, marginTop: 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={TEALD} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                      <div>
                        <div style={{ fontSize: 14.5, fontWeight: 700, color: TX, lineHeight: 1.5 }}>{s.text}</div>
                        {s.detail && (
                          <p style={{ fontSize: 13.5, color: TX2, lineHeight: 1.65, margin: '4px 0 0' }}>{s.detail}</p>
                        )}
                        {s.evidence && (
                          <p style={{ fontSize: 12.5, color: TX3, lineHeight: 1.55, margin: '4px 0 0', fontStyle: 'italic' }}>
                            Evidence: {s.evidence}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Personal Development Plan */}
            {data.development_plan && data.development_plan.length > 0 && (
              <div style={{ background: CARD, border: `1px solid ${BD}`, borderLeft: `5px solid ${TEALD}`, borderRadius: 14, padding: '26px 28px', marginBottom: 20 }}>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: NAVY, margin: '0 0 16px' }}>Personal Development Plan</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {data.development_plan.map((d, i) => (
                    <div key={i} style={{ background: BG, border: `1px solid ${BD}`, borderRadius: 10, padding: '18px 20px' }}>
                      <h3 style={{ fontSize: 14.5, fontWeight: 700, color: NAVY, margin: '0 0 8px' }}>{d.area}</h3>
                      <p style={{ fontSize: 13.5, color: TX2, lineHeight: 1.65, margin: '0 0 12px' }}>{d.advice}</p>
                      {d.actions && d.actions.length > 0 && (
                        <ul style={{ margin: 0, padding: '0 0 0 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {d.actions.map((action, j) => (
                            <li key={j} style={{ fontSize: 13, color: TX, lineHeight: 1.6 }}>{action}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Benchmarks */}
            <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 14, padding: '26px 28px', marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: NAVY, margin: '0 0 16px' }}>Your Benchmark</h2>
              {data.benchmarks && data.benchmarks.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {data.benchmarks.map((b, i) => (
                    <div key={i} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      background: TEALLT, border: `1px solid ${TEAL}55`, borderRadius: 50,
                      padding: '8px 16px',
                    }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: TEALD }}>{b.skill}</span>
                      <span style={{
                        background: TEAL, color: '#fff', borderRadius: 50,
                        padding: '2px 10px', fontSize: 12, fontWeight: 800,
                      }}>
                        Top {100 - b.percentile}%
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 13.5, color: TX3, lineHeight: 1.6, margin: 0 }}>
                  Benchmark data is not yet available for this role type. As more candidates complete assessments for similar roles, your benchmark will appear here.
                </p>
              )}
            </div>

            {/* Growth Trajectory */}
            {data.growth_trajectory && data.growth_trajectory.length > 0 && (
              <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 14, padding: '26px 28px', marginBottom: 20 }}>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: NAVY, margin: '0 0 16px' }}>Growth Trajectory</h2>
                <p style={{ fontSize: 13, color: TX2, lineHeight: 1.6, margin: '0 0 14px' }}>
                  You have completed multiple assessments. Here is how your skills have changed over time.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {data.growth_trajectory.map((g, i) => {
                    const latest = g.assessments[g.assessments.length - 1]
                    const change = latest?.score_change
                    const improved = change != null && change > 0
                    const declined = change != null && change < 0
                    return (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: BG, border: `1px solid ${BD}`, borderRadius: 8, padding: '10px 16px',
                      }}>
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: TX }}>{g.skill}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {g.assessments.map((a, j) => (
                            <span key={j} style={{ fontSize: 11, color: TX3 }}>{a.date}</span>
                          ))}
                          {change != null && (
                            <span style={{
                              fontSize: 12, fontWeight: 700,
                              color: improved ? '#10b981' : declined ? '#ef4444' : TX3,
                            }}>
                              {improved ? '+' : ''}{change} pts
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Download PDF button */}
            <div style={{ textAlign: 'center', marginTop: 24, marginBottom: 12 }}>
              <a
                href={`/api/assess/${params.uniqueToken}/feedback-pdf`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: NAVY, color: '#fff', border: 'none', borderRadius: 10,
                  padding: '12px 24px', fontSize: 14, fontWeight: 700, fontFamily: F,
                  textDecoration: 'none', cursor: 'pointer',
                }}
              >
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download Your Development Plan
              </a>
            </div>

            <p style={{ fontSize: 12, color: TX3, textAlign: 'center', marginTop: 24, lineHeight: 1.6 }}>
              This feedback is for your personal development only. It does not reflect the hiring decision, which is made independently by {data.company_name}. Scores, risk assessments, and hiring recommendations are never shared with candidates.
            </p>
          </>
        )}
      </main>
    </div>
  )
}

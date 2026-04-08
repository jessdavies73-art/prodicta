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

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '48px 20px 80px' }}>
        {loading && (
          <div style={{ textAlign: 'center', color: TX3, fontSize: 14 }}>Loading your feedback...</div>
        )}

        {!loading && error && (
          <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 14, padding: 32, textAlign: 'center' }}>
            <p style={{ fontSize: 15, color: TX2, lineHeight: 1.6, margin: 0 }}>{error}</p>
          </div>
        )}

        {!loading && data && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div style={{
                display: 'inline-block', background: TEALLT, color: TEALD,
                padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16,
              }}>
                Your feedback
              </div>
              <h1 style={{ fontSize: 32, fontWeight: 800, color: NAVY, margin: '0 0 12px', lineHeight: 1.2 }}>
                Thank you for completing your assessment
              </h1>
              <p style={{ fontSize: 15, color: TX2, lineHeight: 1.65, margin: 0 }}>
                Here is some feedback to help you reflect and develop, whatever the outcome.
              </p>
            </div>

            {data.strengths && data.strengths.length > 0 && (
              <div style={{ background: CARD, border: `1px solid ${BD}`, borderLeft: `5px solid ${TEAL}`, borderRadius: 14, padding: '26px 28px', marginBottom: 20 }}>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: NAVY, margin: '0 0 14px' }}>What you did well</h2>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {data.strengths.map((s, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%', background: TEALLT,
                        border: `1px solid ${TEAL}55`, flexShrink: 0, marginTop: 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={TEALD} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                      <div style={{ fontSize: 14.5, color: TX, lineHeight: 1.65 }}>{s}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {data.development && data.development.length > 0 && (
              <div style={{ background: CARD, border: `1px solid ${BD}`, borderLeft: `5px solid ${TEALD}`, borderRadius: 14, padding: '26px 28px', marginBottom: 20 }}>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: NAVY, margin: '0 0 14px' }}>Ideas for your continued development</h2>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {data.development.map((s, i) => (
                    <li key={i} style={{ background: BG, border: `1px solid ${BD}`, borderRadius: 10, padding: '14px 16px', fontSize: 14, color: TX, lineHeight: 1.65 }}>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p style={{ fontSize: 12.5, color: TX3, textAlign: 'center', marginTop: 28, lineHeight: 1.6 }}>
              This feedback is for your personal development. The hiring decision is made by {data.company_name}.
            </p>
          </>
        )}
      </main>
    </div>
  )
}

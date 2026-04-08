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

export default function ExtraScenarioPage({ params }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [response, setResponse] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [startedAt] = useState(() => Date.now())

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/assess/${params.uniqueToken}/extra`)
        const json = await res.json()
        if (!res.ok) {
          if (json.error === 'already_completed') setSubmitted(true)
          else setError(json.error || 'Unable to load scenario')
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

  async function handleSubmit() {
    if (response.trim().length < 30) {
      setError('Please write a more detailed response.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const seconds = Math.round((Date.now() - startedAt) / 1000)
      const res = await fetch(`/api/assess/${params.uniqueToken}/extra/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response_text: response, time_taken_seconds: seconds }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Submission failed')
      setSubmitted(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: F, color: TX }}>
      <header style={{ background: NAVY, padding: '20px 24px', textAlign: 'center' }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: TEAL, letterSpacing: '-0.5px' }}>PRODICTA</span>
      </header>

      <main style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px 80px' }}>
        {loading && <div style={{ textAlign: 'center', color: TX3 }}>Loading...</div>}

        {!loading && submitted && (
          <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 14, padding: 36, textAlign: 'center' }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: NAVY, margin: '0 0 12px' }}>Thank you</h2>
            <p style={{ fontSize: 15, color: TX2, lineHeight: 1.65, margin: 0 }}>
              Your response has been submitted to the hiring team.
            </p>
          </div>
        )}

        {!loading && !submitted && data && (
          <>
            <div style={{ marginBottom: 24 }}>
              <div style={{
                display: 'inline-block', background: TEALLT, color: TEALD,
                padding: '5px 12px', borderRadius: 20, fontSize: 11.5, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12,
              }}>
                Additional scenario
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: NAVY, margin: '0 0 6px', lineHeight: 1.2 }}>
                {data.scenario?.title || 'One additional scenario'}
              </h1>
              <p style={{ fontSize: 13.5, color: TX3, margin: 0 }}>
                {data.role_title} · approximately {data.scenario?.timeMinutes || 8} minutes
              </p>
            </div>

            {data.scenario?.context && (
              <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 12, padding: '22px 26px', marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: TX3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Context</div>
                <p style={{ fontSize: 14.5, color: TX, lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
                  {data.scenario.context}
                </p>
              </div>
            )}

            {data.scenario?.task && (
              <div style={{ background: TEALLT, border: `1px solid ${TEAL}55`, borderLeft: `5px solid ${TEAL}`, borderRadius: 12, padding: '18px 22px', marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: TEALD, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Your task</div>
                <p style={{ fontSize: 14.5, color: TX, lineHeight: 1.65, margin: 0 }}>{data.scenario.task}</p>
              </div>
            )}

            <textarea
              value={response}
              onChange={e => setResponse(e.target.value)}
              rows={12}
              placeholder="Write your response here..."
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '16px 18px', borderRadius: 12, border: `1px solid ${BD}`,
                fontSize: 14, color: TX, fontFamily: F, lineHeight: 1.65,
                background: CARD, outline: 'none', resize: 'vertical',
              }}
            />

            {error && (
              <p style={{ fontSize: 13, color: '#dc2626', margin: '12px 0 0' }}>{error}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                marginTop: 16, width: '100%',
                background: submitting ? TX3 : TEAL, color: '#fff', border: 'none',
                padding: '14px 24px', borderRadius: 10, fontSize: 15, fontWeight: 700,
                cursor: submitting ? 'wait' : 'pointer', fontFamily: F,
              }}
            >
              {submitting ? 'Submitting...' : 'Submit response'}
            </button>
          </>
        )}

        {!loading && !submitted && error && !data && (
          <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 14, padding: 32, textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: TX2, margin: 0 }}>{error}</p>
          </div>
        )}
      </main>
    </div>
  )
}

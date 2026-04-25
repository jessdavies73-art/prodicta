'use client'

import { useState } from 'react'

const NAVY = '#0f2137'
const TEAL = '#00BFA5'
const TEALD = '#00897B'
const TEALLT = '#e6f7f4'
const BD = '#e4e9f0'
const TX = '#1a202c'
const TX2 = '#4a5568'
const TX3 = '#94a1b3'
const RED = '#dc2626'
const F = "'Outfit', system-ui, sans-serif"

export default function EmailCaptureForm() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState('idle')
  const [error, setError] = useState('')

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    const trimmed = email.trim()
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email address.')
      return
    }
    setState('submitting')
    try {
      const res = await fetch('/api/blog/ssp-rules-april-2026-download', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Something went wrong sending the PDF.')
      }
      setState('success')
    } catch (err) {
      setError(err.message || 'Something went wrong sending the PDF.')
      setState('idle')
    }
  }

  return (
    <div style={{
      background: '#ffffff', border: `1.5px solid ${TEAL}55`,
      borderLeft: `5px solid ${TEAL}`,
      borderRadius: 14, padding: '28px 30px',
      boxShadow: '0 2px 14px rgba(0,191,165,0.08)',
      marginTop: 40,
    }}>
      <h2 style={{ fontFamily: F, fontSize: 22, fontWeight: 800, color: NAVY, margin: '0 0 8px', letterSpacing: '-0.3px' }}>
        Download the full PDF guide
      </h2>
      <p style={{ fontFamily: F, fontSize: 14.5, color: TX2, lineHeight: 1.7, margin: '0 0 18px' }}>
        Worked examples, linked period flowchart, and action checklist for employers and agencies.
      </p>

      {state === 'success' ? (
        <div style={{
          background: TEALLT, border: `1px solid ${TEAL}55`, borderRadius: 10,
          padding: '14px 18px',
        }}>
          <div style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TEALD, marginBottom: 4 }}>
            Check your inbox.
          </div>
          <div style={{ fontFamily: F, fontSize: 13.5, color: TX2, lineHeight: 1.6 }}>
            If you cannot find it, check your junk folder and mark as not junk.
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            type="email"
            required
            placeholder="you@company.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={state === 'submitting'}
            style={{
              fontFamily: F, fontSize: 15, padding: '13px 16px',
              border: `1.5px solid ${BD}`, borderRadius: 10, color: TX,
              background: '#fff', outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={state === 'submitting'}
            style={{
              fontFamily: F, fontSize: 15, fontWeight: 700,
              padding: '13px 22px', borderRadius: 10, border: 'none',
              background: TEAL, color: NAVY, cursor: state === 'submitting' ? 'wait' : 'pointer',
              opacity: state === 'submitting' ? 0.7 : 1,
            }}
          >
            {state === 'submitting' ? 'Sending the PDF...' : 'Send me the PDF'}
          </button>
          {error && (
            <div style={{ fontFamily: F, fontSize: 13, color: RED, marginTop: 2 }}>
              {error}
            </div>
          )}
          <div style={{ fontFamily: F, fontSize: 12, color: TX3, lineHeight: 1.55, marginTop: 4 }}>
            We will email the PDF to this address. PRODICTA will occasionally send related guidance. You can unsubscribe at any time.
          </div>
        </form>
      )}
    </div>
  )
}

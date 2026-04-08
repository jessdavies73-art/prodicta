'use client'

import { useState } from 'react'
import Link from 'next/link'

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
const RED = '#dc2626'
const REDBG = '#fef2f2'
const GRN = '#16a34a'
const GRNBG = '#f0fdf4'
const F = "'Outfit', system-ui, sans-serif"

export default function AuditPage() {
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [jds, setJds] = useState(['', '', ''])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function updateJd(i, value) {
    const next = [...jds]
    next[i] = value
    setJds(next)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!companyName.trim() || !email.trim()) {
      setError('Company name and email are required')
      return
    }
    const valid = jds.filter(j => j.trim().length >= 50)
    if (valid.length === 0) {
      setError('Add at least one job description (minimum 50 characters)')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_name: companyName, email, jds }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Audit failed')
      setSuccess(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: F, color: TX }}>
      <header style={{ background: NAVY, padding: '18px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: TEAL, letterSpacing: '-0.5px' }}>PRODICTA</span>
        </Link>
        <Link href="/" style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>Back to home</Link>
      </header>

      <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'inline-block', background: TEALLT, color: TEALD, padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
            Free Audit
          </div>
          <h1 style={{ fontSize: 38, fontWeight: 800, color: NAVY, margin: '0 0 12px', lineHeight: 1.15 }}>
            Free Hiring Risk Audit
          </h1>
          <p style={{ fontSize: 16, color: TX2, lineHeight: 1.6, margin: 0, maxWidth: 580, marginLeft: 'auto', marginRight: 'auto' }}>
            Paste up to 3 job descriptions and PRODICTA will analyse each one for the structural hiring risks built into the role. You will receive a branded PDF report by email within a few minutes.
          </p>
        </div>

        {success ? (
          <div style={{ background: GRNBG, border: `1px solid ${GRN}55`, borderRadius: 14, padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: GRN, marginBottom: 10 }}>Audit on its way</div>
            <p style={{ fontSize: 15, color: TX2, lineHeight: 1.6, margin: '0 0 18px' }}>
              Your PRODICTA Hiring Risk Audit has been sent to <strong>{email}</strong>. It can take a few minutes to arrive.
            </p>
            <Link href="/demo" style={{ display: 'inline-block', background: TEAL, color: '#fff', padding: '12px 24px', borderRadius: 10, fontWeight: 700, textDecoration: 'none', fontSize: 14 }}>
              See PRODICTA in action
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 14, padding: 32 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: TX2, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Company name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '11px 14px', border: `1px solid ${BD}`, borderRadius: 8, fontSize: 14, fontFamily: F, color: TX, boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: TX2, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  style={{ width: '100%', padding: '11px 14px', border: `1px solid ${BD}`, borderRadius: 8, fontSize: 14, fontFamily: F, color: TX, boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {jds.map((jd, i) => (
              <div key={i} style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: TX2, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Job description {i + 1} {i > 0 && <span style={{ color: TX3, textTransform: 'none', fontWeight: 500 }}>(optional)</span>}
                </label>
                <textarea
                  value={jd}
                  onChange={e => updateJd(i, e.target.value)}
                  rows={6}
                  placeholder={i === 0 ? 'Paste the full job description here...' : 'Optional. Paste another job description.'}
                  style={{ width: '100%', padding: '12px 14px', border: `1px solid ${BD}`, borderRadius: 8, fontSize: 13.5, fontFamily: F, color: TX, lineHeight: 1.55, resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>
            ))}

            {error && (
              <div style={{ background: REDBG, border: `1px solid ${RED}33`, borderLeft: `4px solid ${RED}`, padding: '12px 16px', borderRadius: 8, marginBottom: 18, fontSize: 13, color: RED }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%', background: submitting ? TX3 : TEAL, color: '#fff', border: 'none',
                padding: '14px 24px', borderRadius: 10, fontSize: 15, fontWeight: 700,
                cursor: submitting ? 'wait' : 'pointer', fontFamily: F,
              }}
            >
              {submitting ? 'Analysing your roles, this can take up to a minute...' : 'Send my free audit'}
            </button>
            <p style={{ fontSize: 11.5, color: TX3, textAlign: 'center', margin: '12px 0 0', lineHeight: 1.5 }}>
              We will email the audit to the address you provide. We never share your job descriptions.
            </p>
          </form>
        )}
      </main>
    </div>
  )
}

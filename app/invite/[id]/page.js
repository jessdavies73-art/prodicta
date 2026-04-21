'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import ProdictaLogo from '@/components/ProdictaLogo'
import { NAVY, TEAL, TEALD, TEALLT, BG, CARD, BD, TX, TX2, TX3, RED, F } from '@/lib/constants'

export default function AcceptInvitePage() {
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = useState(true)
  const [invite, setInvite] = useState(null)
  const [loadError, setLoadError] = useState('')

  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/team/invite/${params.id}`)
        const data = await res.json()
        if (!res.ok) {
          setLoadError(data?.error || 'Could not load invitation.')
          setLoading(false)
          return
        }
        setInvite(data)
        setName(data.name || '')
      } catch (err) {
        setLoadError(err?.message || 'Could not load invitation.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params?.id])

  async function handleSubmit(e) {
    e?.preventDefault()
    setSubmitError('')
    if (!name.trim()) { setSubmitError('Please enter your name.'); return }
    if (password.length < 8) { setSubmitError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setSubmitError('Passwords do not match.'); return }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/team/invite/${params.id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), password }),
      })
      const data = await res.json()
      if (!res.ok) { setSubmitError(data?.error || 'Could not accept invitation.'); setSubmitting(false); return }

      // Sign in with the email + password we just set so the user lands on
      // /dashboard as an authenticated session.
      try {
        const supabase = createClient()
        await supabase.auth.signInWithPassword({ email: data.email || invite?.email, password })
      } catch (_) {}

      setDone(true)
      setTimeout(() => router.push('/dashboard'), 900)
    } catch (err) {
      setSubmitError(err?.message || 'Network error. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: F, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{
        width: '100%', maxWidth: 480,
        background: CARD, borderRadius: 14, border: `1px solid ${BD}`,
        boxShadow: '0 16px 48px rgba(15,33,55,0.12)',
        overflow: 'hidden',
      }}>
        <div style={{
          background: NAVY, padding: '24px 28px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <ProdictaLogo textColor="#ffffff" size={32} />
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 600 }}>
            Team invitation
          </span>
        </div>

        <div style={{ padding: '28px 28px 32px' }}>
          {loading ? (
            <div style={{ padding: '40px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 28, height: 28, border: `3px solid ${BD}`, borderTopColor: TEAL, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : loadError ? (
            <div style={{ padding: '12px 0' }}>
              <h1 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: TX }}>
                Invitation unavailable
              </h1>
              <p style={{ margin: 0, fontSize: 14, color: TX2, lineHeight: 1.6 }}>
                {loadError}
              </p>
            </div>
          ) : invite?.status === 'active' ? (
            <div style={{ padding: '12px 0' }}>
              <h1 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: TX }}>
                You have already joined this team
              </h1>
              <p style={{ margin: '0 0 18px', fontSize: 14, color: TX2, lineHeight: 1.6 }}>
                Sign in with {invite.email} to continue.
              </p>
              <button
                type="button"
                onClick={() => router.push('/login')}
                style={{
                  padding: '11px 20px', borderRadius: 9, border: 'none',
                  background: TEAL, color: NAVY,
                  fontFamily: F, fontSize: 14, fontWeight: 800, cursor: 'pointer',
                }}
              >
                Go to sign in
              </button>
            </div>
          ) : done ? (
            <div style={{ padding: '12px 0' }}>
              <h1 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: TX }}>
                Welcome to the team
              </h1>
              <p style={{ margin: 0, fontSize: 14, color: TX2, lineHeight: 1.6 }}>
                Redirecting to your dashboard...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800, color: TX, letterSpacing: '-0.3px' }}>
                Join {invite?.companyName || 'the team'}
              </h1>
              <p style={{ margin: '0 0 22px', fontSize: 13.5, color: TX2, lineHeight: 1.6 }}>
                You have been invited as a <strong style={{ color: TX }}>{(invite?.role || 'consultant').replace(/^./, c => c.toUpperCase())}</strong>. Set up your account to accept.
              </p>

              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: TX2, marginBottom: 6 }}>Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '10px 14px', marginBottom: 14,
                  borderRadius: 8, border: `1px solid ${BD}`, background: BG,
                  fontFamily: F, fontSize: 14, color: TX, outline: 'none',
                }}
                placeholder="Your full name"
                required
              />

              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: TX2, marginBottom: 6 }}>Email</label>
              <input
                type="email"
                value={invite?.email || ''}
                readOnly
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '10px 14px', marginBottom: 14,
                  borderRadius: 8, border: `1px solid ${BD}`, background: '#F5F7FA',
                  fontFamily: F, fontSize: 14, color: TX3, outline: 'none',
                }}
              />

              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: TX2, marginBottom: 6 }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '10px 14px', marginBottom: 14,
                  borderRadius: 8, border: `1px solid ${BD}`, background: BG,
                  fontFamily: F, fontSize: 14, color: TX, outline: 'none',
                }}
                placeholder="At least 8 characters"
                required
                minLength={8}
              />

              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: TX2, marginBottom: 6 }}>Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '10px 14px', marginBottom: 18,
                  borderRadius: 8, border: `1px solid ${BD}`, background: BG,
                  fontFamily: F, fontSize: 14, color: TX, outline: 'none',
                }}
                placeholder="Repeat your password"
                required
                minLength={8}
              />

              {submitError && (
                <div style={{
                  padding: '10px 14px', borderRadius: 8,
                  background: '#FEE2E2', border: '1px solid #FCA5A5',
                  color: RED, fontSize: 13, marginBottom: 14,
                }}>
                  {submitError}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: '100%', padding: '12px 0', borderRadius: 9, border: 'none',
                  background: submitting ? '#a8d5d4' : TEAL, color: NAVY,
                  fontFamily: F, fontSize: 14.5, fontWeight: 800,
                  cursor: submitting ? 'wait' : 'pointer',
                }}
              >
                {submitting ? 'Setting up...' : 'Accept invitation'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

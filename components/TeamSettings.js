'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  NAVY, TEAL, TEALD, TEALLT, BG, CARD, BD, TX, TX2, TX3,
  GRN, GRNBG, GRNBD, AMB, AMBBG, AMBBD, RED, REDBG, REDBD,
  F, FM,
} from '@/lib/constants'
import { Ic } from './Icons'

const ROLE_LABELS = { owner: 'Owner', manager: 'Manager', consultant: 'Consultant' }
const STATUS_STYLES = {
  active:    { label: 'Active',    bg: GRNBG, color: GRN, bd: GRNBD },
  invited:   { label: 'Invited',   bg: AMBBG, color: AMB, bd: AMBBD },
  suspended: { label: 'Suspended', bg: REDBG, color: RED, bd: REDBD },
}

function fmtDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const PLAN_LABELS = { starter: 'Starter', professional: 'Professional', business: 'Business', growth: 'Professional', agency: 'Business', scale: 'Business', founding: 'Founding Member', payg: 'Pay as you go' }

export default function TeamSettings({ toast, userEmail, emailInitial }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [members, setMembers] = useState([])
  const [viewerRole, setViewerRole] = useState('owner')
  const [plan, setPlan] = useState('starter')
  const [planType, setPlanType] = useState(null)
  const [userLimit, setUserLimit] = useState(2)
  const [extraSeats, setExtraSeats] = useState(0)
  const [used, setUsed] = useState(0)
  const [seatCheckoutBusy, setSeatCheckoutBusy] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('consultant')
  const [inviteSaving, setInviteSaving] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [busyMember, setBusyMember] = useState(null) // id currently being mutated
  const [confirmRemove, setConfirmRemove] = useState(null)

  const canManage = viewerRole === 'owner' || viewerRole === 'manager'
  const isPayg = planType === 'payg' || plan === 'payg'
  const atLimit = !isPayg && userLimit > 0 && used >= userLimit
  const planLabel = PLAN_LABELS[plan] || (plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : 'your')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/team/members')
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || 'Could not load team members.')
        setMembers([])
      } else {
        setMembers(data.members || [])
        setViewerRole(data.viewerRole || 'owner')
        setPlan(data.plan || 'starter')
        setPlanType(data.planType || null)
        setUserLimit(typeof data.userLimit === 'number' ? data.userLimit : 2)
        setExtraSeats(data.extraSeats || 0)
        setUsed(typeof data.used === 'number' ? data.used : 0)
      }
    } catch (err) {
      setError(err?.message || 'Network error.')
    } finally {
      setLoading(false)
    }
  }, [])

  async function handleBuySeat() {
    setSeatCheckoutBusy(true)
    try {
      const res = await fetch('/api/billing/extra-seat', { method: 'POST' })
      const data = await res.json()
      if (!res.ok || !data?.url) {
        if (toast) toast(data?.error || 'Could not start checkout', 'error')
        setSeatCheckoutBusy(false)
        return
      }
      window.location.href = data.url
    } catch (err) {
      if (toast) toast(err?.message || 'Network error', 'error')
      setSeatCheckoutBusy(false)
    }
  }

  useEffect(() => { load() }, [load])

  async function handleInvite(e) {
    e?.preventDefault()
    setInviteError('')
    const email = inviteEmail.trim().toLowerCase()
    if (!email) { setInviteError('Please enter an email address.'); return }
    setInviteSaving(true)
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: inviteName.trim(), role: inviteRole }),
      })
      const data = await res.json()
      if (!res.ok) { setInviteError(data?.error || 'Could not send invite.'); setInviteSaving(false); return }
      setInviteOpen(false)
      setInviteName(''); setInviteEmail(''); setInviteRole('consultant')
      if (toast) toast(`Invitation sent to ${email}`)
      load()
    } catch (err) {
      setInviteError(err?.message || 'Network error.')
    } finally {
      setInviteSaving(false)
    }
  }

  async function patchMember(id, body) {
    setBusyMember(id)
    try {
      const res = await fetch(`/api/team/members/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { if (toast) toast(data?.error || 'Update failed', 'error'); return }
      setMembers(prev => prev.map(m => m.id === id ? { ...m, ...body } : m))
      if (toast) toast('Team member updated')
    } catch (err) {
      if (toast) toast(err?.message || 'Network error', 'error')
    } finally {
      setBusyMember(null)
    }
  }

  async function handleRemove(id) {
    setConfirmRemove(null)
    setBusyMember(id)
    try {
      const res = await fetch(`/api/team/members/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) { if (toast) toast(data?.error || 'Remove failed', 'error'); return }
      setMembers(prev => prev.filter(m => m.id !== id))
      if (toast) toast('Team member removed')
    } catch (err) {
      if (toast) toast(err?.message || 'Network error', 'error')
    } finally {
      setBusyMember(null)
    }
  }

  async function handleResend(id) {
    setBusyMember(id)
    try {
      const res = await fetch(`/api/team/members/${id}/resend`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { if (toast) toast(data?.error || 'Could not resend', 'error'); return }
      if (toast) toast('Invitation resent')
    } catch (err) {
      if (toast) toast(err?.message || 'Network error', 'error')
    } finally {
      setBusyMember(null)
    }
  }

  const active = members.filter(m => m.status === 'active' || m.status === 'suspended')
  const pending = members.filter(m => m.status === 'invited')

  const usagePct = userLimit > 0 ? Math.min(100, Math.round((used / userLimit) * 100)) : 0
  const usageColor = atLimit ? RED : usagePct >= 80 ? AMB : TEAL
  const usageBg = atLimit ? REDBG : usagePct >= 80 ? AMBBG : TEALLT
  const usageBd = atLimit ? REDBD : usagePct >= 80 ? AMBBD : `${TEAL}55`

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 14, padding: '24px 26px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 800, color: TX }}>
              Team members
            </h2>
            <p style={{ margin: 0, fontSize: 12.5, color: TX3 }}>
              Invite managers and consultants. Managers can see all data. Consultants see only their own.
            </p>
          </div>
          {canManage && !isPayg && (
            <button
              type="button"
              onClick={() => { setInviteError(''); setInviteOpen(true) }}
              disabled={atLimit}
              title={atLimit ? `You have reached your ${planLabel} limit of ${userLimit} users.` : undefined}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '10px 18px', borderRadius: 8, border: 'none',
                background: atLimit ? BD : TEAL, color: atLimit ? TX3 : NAVY,
                fontFamily: F, fontSize: 13, fontWeight: 800,
                cursor: atLimit ? 'not-allowed' : 'pointer',
                opacity: atLimit ? 0.7 : 1,
              }}
            >
              <Ic name="plus" size={14} color={atLimit ? TX3 : NAVY} />
              Invite team member
            </button>
          )}
        </div>

        {/* PAYG banner */}
        {!loading && isPayg && (
          <div style={{
            background: AMBBG, border: `1px solid ${AMBBD}`, borderLeft: `4px solid ${AMB}`,
            borderRadius: 10, padding: '14px 16px', marginBottom: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
          }}>
            <div style={{ fontSize: 13, color: TX, lineHeight: 1.55 }}>
              <strong>Team management is available on Starter, Professional, and Business plans.</strong>
              <div style={{ fontSize: 12.5, color: TX2, marginTop: 2 }}>
                Upgrade to a subscription to invite colleagues.
              </div>
            </div>
            <a
              href="/settings?tab=billing"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '9px 16px', borderRadius: 8, border: 'none',
                background: TEAL, color: NAVY, textDecoration: 'none',
                fontFamily: F, fontSize: 13, fontWeight: 800,
              }}
            >
              View subscription plans
            </a>
          </div>
        )}

        {/* Usage strip (subscription accounts only) */}
        {!loading && !isPayg && (
          <div style={{
            background: usageBg, border: `1px solid ${usageBd}`,
            borderRadius: 10, padding: '12px 16px', marginBottom: 18,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
              <div style={{ fontSize: 13, color: TX }}>
                <strong>Team members: {used} of {userLimit} used</strong>
                {extraSeats > 0 && (
                  <span style={{ fontSize: 12, color: TX3, marginLeft: 8 }}>
                    (includes {extraSeats} extra seat{extraSeats === 1 ? '' : 's'})
                  </span>
                )}
              </div>
              {atLimit && canManage && (
                <button
                  type="button"
                  onClick={handleBuySeat}
                  disabled={seatCheckoutBusy}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '7px 14px', borderRadius: 7, border: 'none',
                    background: NAVY, color: '#fff',
                    fontFamily: F, fontSize: 12, fontWeight: 700,
                    cursor: seatCheckoutBusy ? 'wait' : 'pointer',
                    opacity: seatCheckoutBusy ? 0.7 : 1,
                  }}
                >
                  {seatCheckoutBusy ? 'Opening checkout...' : 'Add an extra seat, £35/month'}
                </button>
              )}
            </div>
            <div style={{ height: 6, borderRadius: 3, background: 'rgba(15,33,55,0.08)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${usagePct}%`, background: usageColor, borderRadius: 3, transition: 'width 0.3s ease' }} />
            </div>
            {atLimit && (
              <div style={{ marginTop: 8, fontSize: 12, color: RED, fontWeight: 600 }}>
                You have reached your {planLabel} limit of {userLimit} user{userLimit === 1 ? '' : 's'}. Add an extra seat to invite another colleague, or upgrade your plan.
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div style={{ padding: '28px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 24, height: 24, border: `3px solid ${BD}`, borderTopColor: TEAL, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : error ? (
          <div style={{ padding: '14px 16px', borderRadius: 8, background: REDBG, border: `1px solid ${REDBD}`, color: RED, fontSize: 13 }}>
            {error}
          </div>
        ) : (
          <>
            {/* Active + suspended */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: pending.length > 0 ? 24 : 0 }}>
              {active.length === 0 && (
                <div style={{ padding: '14px 16px', borderRadius: 10, background: BG, border: `1px dashed ${BD}`, fontSize: 13, color: TX3 }}>
                  Only you on the team so far. Invite a colleague to get started.
                </div>
              )}
              {active.map(m => {
                const status = STATUS_STYLES[m.status] || STATUS_STYLES.active
                const initial = (m.name || m.email || '?').trim().charAt(0).toUpperCase()
                return (
                  <div key={m.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px',
                    background: BG, border: `1px solid ${BD}`, borderRadius: 10,
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: TEALLT, border: `1.5px solid ${TEAL}55`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: FM, fontSize: 14, fontWeight: 800, color: TEALD,
                      flexShrink: 0,
                    }}>
                      {initial}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: TX, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.name || m.email}
                      </div>
                      <div style={{ fontSize: 11.5, color: TX3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.email}{m.joined_at ? ` · Joined ${fmtDate(m.joined_at)}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {m.role === 'owner' || !canManage ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center',
                          padding: '3px 10px', borderRadius: 50,
                          fontSize: 11, fontWeight: 700,
                          background: TEALLT, color: TEALD, border: `1px solid ${TEAL}55`,
                        }}>
                          {ROLE_LABELS[m.role] || m.role}
                        </span>
                      ) : (
                        <select
                          value={m.role}
                          onChange={e => patchMember(m.id, { role: e.target.value })}
                          disabled={busyMember === m.id}
                          style={{
                            padding: '5px 8px', borderRadius: 6,
                            border: `1px solid ${BD}`, background: CARD,
                            fontFamily: F, fontSize: 12, fontWeight: 700, color: TX, cursor: 'pointer',
                          }}
                        >
                          <option value="manager">Manager</option>
                          <option value="consultant">Consultant</option>
                        </select>
                      )}
                      <span style={{
                        display: 'inline-flex', alignItems: 'center',
                        padding: '3px 10px', borderRadius: 50,
                        fontSize: 11, fontWeight: 700,
                        background: status.bg, color: status.color, border: `1px solid ${status.bd}`,
                      }}>
                        {status.label}
                      </span>
                      {m.role !== 'owner' && canManage && (
                        <>
                          {m.status === 'active' ? (
                            <button
                              type="button"
                              onClick={() => patchMember(m.id, { status: 'suspended' })}
                              disabled={busyMember === m.id}
                              style={{
                                padding: '5px 10px', borderRadius: 6,
                                border: `1px solid ${BD}`, background: 'transparent',
                                fontFamily: F, fontSize: 11.5, fontWeight: 700, color: TX3, cursor: 'pointer',
                              }}
                            >
                              Suspend
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => patchMember(m.id, { status: 'active' })}
                              disabled={busyMember === m.id}
                              style={{
                                padding: '5px 10px', borderRadius: 6,
                                border: `1px solid ${TEAL}55`, background: TEALLT,
                                fontFamily: F, fontSize: 11.5, fontWeight: 700, color: TEALD, cursor: 'pointer',
                              }}
                            >
                              Restore
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setConfirmRemove(m)}
                            disabled={busyMember === m.id}
                            style={{
                              padding: '5px 10px', borderRadius: 6,
                              border: `1px solid ${BD}`, background: 'transparent',
                              fontFamily: F, fontSize: 11.5, fontWeight: 700, color: RED, cursor: 'pointer',
                            }}
                          >
                            Remove
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pending invites */}
            {pending.length > 0 && (
              <>
                <div style={{
                  fontFamily: F, fontSize: 11, fontWeight: 700, color: TX3,
                  letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10,
                }}>
                  Pending invitations
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {pending.map(m => (
                    <div key={m.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 14px',
                      background: BG, border: `1px solid ${BD}`, borderRadius: 10,
                      borderLeft: `3px solid ${AMB}`,
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: TX }}>
                          {m.name || m.email}
                        </div>
                        <div style={{ fontSize: 11.5, color: TX3 }}>
                          {m.email} · {ROLE_LABELS[m.role] || m.role} · Invited {fmtDate(m.invited_at)}
                        </div>
                      </div>
                      {canManage && (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => handleResend(m.id)}
                            disabled={busyMember === m.id}
                            style={{
                              padding: '5px 12px', borderRadius: 6,
                              border: `1px solid ${TEAL}55`, background: TEALLT,
                              fontFamily: F, fontSize: 11.5, fontWeight: 700, color: TEALD, cursor: 'pointer',
                            }}
                          >
                            Resend
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmRemove(m)}
                            disabled={busyMember === m.id}
                            style={{
                              padding: '5px 12px', borderRadius: 6,
                              border: `1px solid ${BD}`, background: 'transparent',
                              fontFamily: F, fontSize: 11.5, fontWeight: 700, color: RED, cursor: 'pointer',
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Invite modal */}
      {inviteOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(15,33,55,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}
          onClick={() => !inviteSaving && setInviteOpen(false)}
        >
          <form
            onClick={e => e.stopPropagation()}
            onSubmit={handleInvite}
            style={{
              background: CARD, borderRadius: 14, padding: '24px 28px',
              maxWidth: 440, width: '100%',
              boxShadow: '0 16px 48px rgba(15,33,55,0.2)',
            }}
          >
            <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: TX }}>
              Invite a team member
            </h3>
            <p style={{ margin: '0 0 18px', fontSize: 13, color: TX3, lineHeight: 1.55 }}>
              They will receive an email with a link to set up their account.
            </p>

            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: TX2, marginBottom: 6 }}>Name</label>
            <input
              type="text"
              value={inviteName}
              onChange={e => setInviteName(e.target.value)}
              placeholder="Optional"
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '9px 12px', marginBottom: 12,
                borderRadius: 8, border: `1px solid ${BD}`, background: BG,
                fontFamily: F, fontSize: 13.5, color: TX, outline: 'none',
              }}
            />

            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: TX2, marginBottom: 6 }}>Email</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="name@company.com"
              required
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '9px 12px', marginBottom: 12,
                borderRadius: 8, border: `1px solid ${BD}`, background: BG,
                fontFamily: F, fontSize: 13.5, color: TX, outline: 'none',
              }}
            />

            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: TX2, marginBottom: 6 }}>Role</label>
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value)}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '9px 12px', marginBottom: 18,
                borderRadius: 8, border: `1px solid ${BD}`, background: BG,
                fontFamily: F, fontSize: 13.5, color: TX, outline: 'none', cursor: 'pointer',
              }}
            >
              <option value="consultant">Consultant, can only see their own candidates</option>
              <option value="manager">Manager, can see everything and manage team</option>
            </select>

            {inviteError && (
              <div style={{ padding: '10px 12px', marginBottom: 14, borderRadius: 8, background: REDBG, border: `1px solid ${REDBD}`, color: RED, fontSize: 12.5 }}>
                {inviteError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setInviteOpen(false)}
                disabled={inviteSaving}
                style={{
                  padding: '9px 16px', borderRadius: 8,
                  border: `1.5px solid ${BD}`, background: 'transparent',
                  fontFamily: F, fontSize: 13, fontWeight: 700, color: TX2, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={inviteSaving}
                style={{
                  padding: '9px 16px', borderRadius: 8, border: 'none',
                  background: inviteSaving ? '#a8d5d4' : TEAL, color: NAVY,
                  fontFamily: F, fontSize: 13, fontWeight: 800,
                  cursor: inviteSaving ? 'wait' : 'pointer',
                }}
              >
                {inviteSaving ? 'Sending...' : 'Send invitation'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Remove confirm */}
      {confirmRemove && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(15,33,55,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}
          onClick={() => setConfirmRemove(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: CARD, borderRadius: 14, padding: '24px 28px',
              maxWidth: 420, width: '100%',
              boxShadow: '0 16px 48px rgba(15,33,55,0.2)',
            }}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 800, color: TX }}>
              {confirmRemove.status === 'invited' ? 'Cancel invitation?' : 'Remove team member?'}
            </h3>
            <p style={{ margin: '0 0 18px', fontSize: 13.5, color: TX2, lineHeight: 1.55 }}>
              {confirmRemove.status === 'invited'
                ? <>The invitation to <strong>{confirmRemove.email}</strong> will no longer be valid.</>
                : <><strong>{confirmRemove.name || confirmRemove.email}</strong> will lose access to this account. Their assessments remain in the system owned by their user.</>
              }
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setConfirmRemove(null)}
                style={{
                  padding: '9px 16px', borderRadius: 8,
                  border: `1.5px solid ${BD}`, background: 'transparent',
                  fontFamily: F, fontSize: 13, fontWeight: 700, color: TX2, cursor: 'pointer',
                }}
              >
                Keep
              </button>
              <button
                type="button"
                onClick={() => handleRemove(confirmRemove.id)}
                style={{
                  padding: '9px 16px', borderRadius: 8, border: 'none',
                  background: RED, color: '#fff',
                  fontFamily: F, fontSize: 13, fontWeight: 800, cursor: 'pointer',
                }}
              >
                {confirmRemove.status === 'invited' ? 'Cancel invitation' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

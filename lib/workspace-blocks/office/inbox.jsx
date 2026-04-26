'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { BLOCK_CATALOGUE } from './catalogue'
import BlockScenarioHeader from './_BlockScenarioHeader'

export const metadata = BLOCK_CATALOGUE['inbox']

const NAVY = '#0f2137'
const TEAL = '#00BFA5'
const F = "'Outfit', system-ui, sans-serif"
const FM = "'IBM Plex Mono', monospace"

// Relationship pill colours. Senior + external are the loaded ones; the
// candidate's tone choices on those say more than tone on a peer ping.
const RELATIONSHIP_STYLES = {
  external: { label: 'External',  bg: '#fff7ed', fg: '#9a3412', bd: '#fdba74' },
  senior:   { label: 'Senior',    bg: '#fef2f2', fg: '#b91c1c', bd: '#fecaca' },
  peer:     { label: 'Peer',      bg: '#eff6ff', fg: '#1d4ed8', bd: '#bfdbfe' },
  junior:   { label: 'Junior',    bg: '#f0f9ff', fg: '#075985', bd: '#bae6fd' },
  internal: { label: 'Internal',  bg: '#f8fafc', fg: '#475569', bd: '#cbd5e1' },
}

function useIsMobile(threshold = 760) {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const check = () => setMobile(typeof window !== 'undefined' && window.innerWidth < threshold)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [threshold])
  return mobile
}

export default function InboxBlock({ role_profile, block_content, scenario_context, onComplete }) {
  const isMobile = useIsMobile()

  // The scenario generator now ships a typed `emails` array on inbox
  // block_content. If it's missing (stale cache, fallback path) we render
  // a non-interactive view so the candidate isn't stranded.
  const emails = useMemo(
    () => Array.isArray(block_content?.emails) ? block_content.emails : [],
    [block_content]
  )

  const [openId, setOpenId] = useState(emails[0]?.id || null)
  const [readIds, setReadIds] = useState(emails[0]?.id ? [emails[0].id] : [])
  const [replies, setReplies] = useState({})
  const openTimeRef = useRef({})
  const startedAtRef = useRef(new Date().toISOString())

  // When emails come from a different generation, reset open/read state.
  useEffect(() => {
    setOpenId(emails[0]?.id || null)
    setReadIds(emails[0]?.id ? [emails[0].id] : [])
    setReplies({})
    openTimeRef.current = {}
    startedAtRef.current = new Date().toISOString()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emails.map(e => e.id).join(',')])

  // Junior gets a softer requirement; everyone else needs at least 2 considered replies.
  const minReplies = role_profile?.seniority_band === 'junior' ? 1 : 2
  const repliedIds = Object.keys(replies).filter(id => (replies[id]?.text || '').trim().length >= 12)
  const repliedCount = repliedIds.length
  const canSubmit = emails.length === 0 || repliedCount >= Math.min(minReplies, emails.length)

  const handleOpen = (id) => {
    setOpenId(id)
    if (!readIds.includes(id)) setReadIds(prev => [...prev, id])
    if (!openTimeRef.current[id]) openTimeRef.current[id] = new Date().toISOString()
  }

  const handleReplyChange = (id, text) => {
    setReplies(prev => ({
      ...prev,
      [id]: {
        text,
        first_typed_at: prev[id]?.first_typed_at || new Date().toISOString(),
        last_typed_at: new Date().toISOString(),
      },
    }))
  }

  const handleSubmit = () => {
    onComplete && onComplete({
      block_id: 'inbox',
      email_replies: replies,
      email_read: readIds,
      time_per_email: openTimeRef.current,
      replied_count: repliedCount,
      total_emails: emails.length,
      started_at: startedAtRef.current,
      completed_at: new Date().toISOString(),
    })
  }

  const openEmail = emails.find(e => e.id === openId) || null

  return (
    <div style={{ fontFamily: F }}>
      <BlockScenarioHeader
        scenario_context={scenario_context}
        block_content={block_content}
        blockName="Inbox"
      />

      {emails.length === 0 ? (
        <NoEmailsFallback block_content={block_content} onComplete={handleSubmit} />
      ) : (
        <>
          <div style={{
            maxWidth: 980, margin: '0 auto 18px',
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'minmax(280px, 360px) 1fr',
            gap: 14,
          }}>
            <EmailList
              emails={emails}
              openId={openId}
              readIds={readIds}
              repliedIds={repliedIds}
              onOpen={handleOpen}
            />
            <EmailDetail
              email={openEmail}
              reply={replies[openEmail?.id]?.text || ''}
              onReplyChange={(text) => openEmail && handleReplyChange(openEmail.id, text)}
            />
          </div>

          <SubmitFooter
            repliedCount={repliedCount}
            totalEmails={emails.length}
            minReplies={Math.min(minReplies, emails.length)}
            canSubmit={canSubmit}
            onSubmit={handleSubmit}
          />
        </>
      )}
    </div>
  )
}

function EmailList({ emails, openId, readIds, repliedIds, onOpen }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '10px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
        fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#475569',
        textTransform: 'uppercase', letterSpacing: '0.08em',
      }}>
        Inbox &middot; {emails.length} messages
      </div>
      <div style={{ maxHeight: 520, overflowY: 'auto' }}>
        {emails.map(email => {
          const isOpen = openId === email.id
          const isRead = readIds.includes(email.id)
          const hasReply = repliedIds.includes(email.id)
          const rel = RELATIONSHIP_STYLES[email.from_relationship] || RELATIONSHIP_STYLES.internal
          return (
            <button
              key={email.id}
              type="button"
              onClick={() => onOpen(email.id)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '12px 14px',
                background: isOpen ? `${TEAL}10` : '#fff',
                border: 'none',
                borderLeft: isOpen ? `3px solid ${TEAL}` : '3px solid transparent',
                borderBottom: '1px solid #f1f5f9',
                cursor: 'pointer',
                fontFamily: F,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                {!isRead ? (
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: TEAL, display: 'inline-block', flex: '0 0 auto' }} />
                ) : (
                  <span style={{ width: 7, height: 7, display: 'inline-block', flex: '0 0 auto' }} />
                )}
                <span style={{ fontFamily: F, fontSize: 13, fontWeight: isRead ? 600 : 800, color: NAVY, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {email.from_name}
                </span>
                <span style={{
                  fontFamily: FM, fontSize: 10, fontWeight: 700,
                  padding: '2px 7px', borderRadius: 10,
                  background: rel.bg, color: rel.fg, border: `1px solid ${rel.bd}`,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  flex: '0 0 auto',
                }}>
                  {rel.label}
                </span>
              </div>
              <div style={{ fontFamily: F, fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 2, lineHeight: 1.3 }}>
                {email.subject}
              </div>
              <div style={{ fontFamily: F, fontSize: 12, color: '#64748b', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {email.preview || email.body?.slice(0, 120)}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, gap: 6 }}>
                <span style={{ fontFamily: FM, fontSize: 11, color: '#94a3b8' }}>
                  {email.received_at}
                </span>
                {hasReply ? (
                  <span style={{ fontFamily: FM, fontSize: 10, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Replied
                  </span>
                ) : null}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function EmailDetail({ email, reply, onReplyChange }) {
  if (!email) {
    return (
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 24, fontFamily: F, color: '#64748b', fontSize: 14 }}>
        Select a message to read it.
      </div>
    )
  }
  const rel = RELATIONSHIP_STYLES[email.from_relationship] || RELATIONSHIP_STYLES.internal
  const toneHint = toneHintFor(email.from_relationship)

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: 18, borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          <span style={{
            fontFamily: FM, fontSize: 10, fontWeight: 700,
            padding: '3px 9px', borderRadius: 10,
            background: rel.bg, color: rel.fg, border: `1px solid ${rel.bd}`,
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            {rel.label}
          </span>
          <span style={{ fontFamily: FM, fontSize: 11, color: '#64748b' }}>
            {email.received_at}
          </span>
        </div>
        <h3 style={{ fontFamily: F, fontSize: 18, fontWeight: 800, color: NAVY, lineHeight: 1.25, margin: '0 0 6px' }}>
          {email.subject}
        </h3>
        <div style={{ fontFamily: F, fontSize: 13, color: '#475569' }}>
          From <b style={{ color: NAVY }}>{email.from_name}</b>
          {email.from_role ? <span style={{ color: '#64748b' }}> &middot; {email.from_role}</span> : null}
        </div>
      </div>

      <div style={{ padding: 18, borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ fontFamily: F, fontSize: 14, color: NAVY, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
          {email.body || email.preview}
        </div>
      </div>

      <div style={{ padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Your reply
          </div>
          <div style={{ fontFamily: F, fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>
            Tone hint: {toneHint}
          </div>
        </div>
        <textarea
          value={reply}
          onChange={(e) => onReplyChange(e.target.value)}
          rows={6}
          placeholder="Type your reply. Aim for the tone the relationship calls for."
          style={{
            width: '100%', boxSizing: 'border-box',
            fontFamily: F, fontSize: 14, color: NAVY, lineHeight: 1.5,
            padding: 12, borderRadius: 8,
            border: '1px solid #cbd5e1', background: '#f8fafc',
            outline: 'none', resize: 'vertical', minHeight: 120,
          }}
        />
        <div style={{ marginTop: 6, fontFamily: FM, fontSize: 11, color: '#94a3b8', textAlign: 'right' }}>
          {(reply || '').trim().length} characters
        </div>
      </div>
    </div>
  )
}

function toneHintFor(rel) {
  switch (rel) {
    case 'external': return 'professional, on-brand, hold the line on commitments'
    case 'senior': return 'concise, decision-oriented, surface the trade-off'
    case 'peer': return 'direct, collaborative, propose next step'
    case 'junior': return 'clear, supportive, name the action'
    case 'internal':
    default: return 'plain English, action-oriented'
  }
}

function SubmitFooter({ repliedCount, totalEmails, minReplies, canSubmit, onSubmit }) {
  return (
    <div style={{
      maxWidth: 980, margin: '0 auto', padding: 16,
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      flexWrap: 'wrap',
    }}>
      <div style={{ fontFamily: F, fontSize: 13, color: '#475569' }}>
        Replied to <b style={{ color: NAVY }}>{repliedCount}</b> of {totalEmails} messages.
        {minReplies > 0 ? ` Minimum ${minReplies} considered reply${minReplies === 1 ? '' : 'ies'} to move on.` : ''}
      </div>
      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit}
        style={{
          fontFamily: F, fontSize: 14, fontWeight: 700,
          padding: '10px 18px', borderRadius: 8, border: 'none',
          background: canSubmit ? TEAL : '#cbd5e1', color: '#fff',
          cursor: canSubmit ? 'pointer' : 'not-allowed',
        }}
      >
        Continue
      </button>
    </div>
  )
}

function NoEmailsFallback({ block_content, onComplete }) {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: 22, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontFamily: F }}>
      <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        Email payload missing
      </div>
      <p style={{ fontFamily: F, fontSize: 14, color: '#475569', lineHeight: 1.55, marginBottom: 14 }}>
        This scenario was generated before the typed inbox payload shipped. Re-generate the workspace_scenario to populate emails. Showing the scenario summary below so the run can continue.
      </p>
      {block_content?.setup ? (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, marginBottom: 12, fontFamily: F, fontSize: 13, color: NAVY, lineHeight: 1.55 }}>
          {block_content.setup}
        </div>
      ) : null}
      {Array.isArray(block_content?.key_items) && block_content.key_items.length ? (
        <ul style={{ margin: '0 0 14px', paddingLeft: 18, fontFamily: F, fontSize: 13, color: NAVY, lineHeight: 1.6 }}>
          {block_content.key_items.map((it, i) => <li key={i}>{it}</li>)}
        </ul>
      ) : null}
      <button
        type="button"
        onClick={() => onComplete && onComplete({ block_id: 'inbox', fallback: true, completed_at: new Date().toISOString() })}
        style={{
          fontFamily: F, fontSize: 14, fontWeight: 700,
          padding: '10px 18px', borderRadius: 8, border: 'none',
          background: TEAL, color: '#fff', cursor: 'pointer',
        }}
      >
        Skip and continue
      </button>
    </div>
  )
}

'use client'
import { useState, useRef, useEffect } from 'react'

const NAVY = '#0f2137'
const TEAL = '#00BFA5'
const TEALD = '#009688'
const TEALLT = '#e0f2f0'
const BG = '#f7f9fb'
const BD = '#e4e9f0'
const TX = '#0f172a'
const TX2 = '#5e6b7f'
const TX3 = '#94a1b3'
const F = "'Outfit',system-ui,sans-serif"
const FM = "'IBM Plex Mono',monospace"

const DEMO_CONTENT = {
  emails: [
    { id: 'e1', from: 'Sarah Mitchell (Client Director)', subject: 'Urgent: Q2 campaign performance concerns', preview: 'Hi, I need to flag some issues with the current campaign metrics...', body: 'Hi,\n\nI need to flag some issues with the current campaign metrics before the board meeting on Thursday. Our lead generation is tracking 22% below target and the client has raised concerns about ROI.\n\nCan you pull together a quick analysis of what is driving the underperformance and recommend 2-3 immediate actions we can take this week?\n\nThis is time-sensitive as the board paper needs to go out by Wednesday afternoon.\n\nThanks,\nSarah' },
    { id: 'e2', from: 'James Chen (Finance)', subject: 'Marketing budget reallocation request', preview: 'Following the quarterly review, we need to discuss the proposed 15% reallocation...', body: 'Hi,\n\nFollowing the quarterly review, the CFO has approved a 15% reallocation from your digital advertising budget to the new product launch campaign.\n\nCan you confirm which channels you would reduce spend on and provide an impact assessment by end of week?\n\nWe need to process this before the next billing cycle.\n\nRegards,\nJames' },
    { id: 'e3', from: 'Tom Richards (Creative Agency)', subject: 'Brand refresh assets ready for review', preview: 'The first round of brand refresh concepts are ready. We have three directions...', body: 'Hi,\n\nThe first round of brand refresh concepts are ready for your review. We have prepared three creative directions based on the brief.\n\nCould you review the attached concepts and provide initial feedback? The design team has capacity to make revisions this week only, after which we lose them to another project.\n\nLet me know when you are free for a 30-minute walkthrough.\n\nBest,\nTom' },
  ],
  messages: [
    { id: 'm1', from: 'Alex', role: 'Content Manager', text: 'Morning! Quick question — should I hold the blog post about the rebrand until after the board meeting or publish as planned?', time: '09:12' },
    { id: 'm2', from: 'Priya', role: 'Social Media Lead', text: 'The client just DM\'d us on LinkedIn asking about the campaign numbers. Should I respond or leave it for you?', time: '09:18' },
  ],
  surprise_message: { id: 'm3', from: 'David', role: 'Managing Director', text: 'Can you give me a 2-minute update on where we are with the Q2 numbers before my 10:30 call?', time: '09:35' },
  tasks: [
    { id: 't1', title: 'Review Q2 campaign performance data', priority: 'high', context: 'Board paper due Wednesday' },
    { id: 't2', title: 'Call creative agency about brand refresh', priority: 'high', context: 'Design team only available this week' },
    { id: 't3', title: 'Prepare budget reallocation impact assessment', priority: 'medium', context: 'Finance needs by end of week' },
    { id: 't4', title: 'Brief team on stakeholder update format', priority: 'medium', context: 'Monthly standup tomorrow' },
    { id: 't5', title: 'Update marketing dashboard metrics', priority: 'low', context: 'Regular weekly task' },
  ],
  calendar_gaps: [
    { time: '10:00-10:30', context: 'Free slot between meetings' },
    { time: '11:30-12:00', context: 'Free slot before lunch' },
  ],
  fixed_meetings: [
    { time: '09:00', title: 'Team standup' },
    { time: '10:30', title: 'Client strategy call' },
    { time: '14:00', title: '1-to-1 with line manager' },
  ],
}

export default function DemoWorkspacePage() {
  const [emailOpen, setEmailOpen] = useState(null)
  const [timeLeft, setTimeLeft] = useState(15 * 60)

  useEffect(() => {
    const t = setInterval(() => setTimeLeft(p => Math.max(p - 1, 0)), 1000)
    return () => clearInterval(t)
  }, [])

  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60

  return (
    <div style={{ minHeight: '100vh', background: '#f3f5f8', fontFamily: F }}>
      <div style={{ background: NAVY, padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: TEAL }}>PRODICTA</span>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Marketing Manager — Day 1, 9:00am</span>
          <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', background: TEAL, padding: '2px 8px', borderRadius: 4 }}>DEMO</span>
        </div>
        <span style={{ fontFamily: FM, fontSize: 14, fontWeight: 700, color: '#fff' }}>{mins}:{String(secs).padStart(2, '0')}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: 16, maxWidth: 1200, margin: '0 auto' }}>
        {/* Emails */}
        <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BD}` }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: TX }}>Email Inbox</span>
          </div>
          {DEMO_CONTENT.emails.map(email => (
            <div key={email.id}>
              <div onClick={() => setEmailOpen(emailOpen === email.id ? null : email.id)} style={{ padding: '12px 18px', borderBottom: `1px solid ${BD}`, cursor: 'pointer' }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: TX }}>{email.from}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: TX }}>{email.subject}</div>
                <div style={{ fontSize: 12, color: TX3 }}>{email.preview}</div>
              </div>
              {emailOpen === email.id && (
                <div style={{ padding: '14px 18px', background: BG, borderBottom: `1px solid ${BD}` }}>
                  <p style={{ fontSize: 13, color: TX, lineHeight: 1.65, margin: '0 0 10px', whiteSpace: 'pre-wrap' }}>{email.body}</p>
                  <textarea rows={2} disabled placeholder="Replies available with subscription" style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: 6, border: `1px solid ${BD}`, fontFamily: F, fontSize: 13, color: TX3, opacity: 0.5 }} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Tasks */}
        <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BD}` }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: TX }}>Tasks</span>
          </div>
          {DEMO_CONTENT.tasks.map(task => (
            <div key={task.id} style={{ padding: '10px 18px', borderBottom: `1px solid ${BD}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: task.priority === 'high' ? '#dc2626' : task.priority === 'medium' ? '#E8B84B' : TX3, textTransform: 'uppercase' }}>{task.priority}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: TX }}>{task.title}</span>
              </div>
              <div style={{ fontSize: 12, color: TX3 }}>{task.context}</div>
            </div>
          ))}
        </div>

        {/* Messages */}
        <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BD}` }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: TX }}>Messages</span>
          </div>
          <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {DEMO_CONTENT.messages.map(msg => (
              <div key={msg.id} style={{ display: 'flex', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: TEAL, flexShrink: 0 }}>{msg.from[0]}</div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: TX }}>{msg.from} <span style={{ fontWeight: 500, color: TX3 }}>{msg.time}</span></div>
                  <div style={{ fontSize: 13, color: TX2 }}>{msg.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Calendar */}
        <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BD}` }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: TX }}>Today's Schedule</span>
          </div>
          <div style={{ padding: '12px 18px' }}>
            {DEMO_CONTENT.fixed_meetings.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: `1px solid ${BD}` }}>
                <span style={{ fontFamily: FM, fontSize: 11, color: TX3, width: 44 }}>{m.time}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: TX }}>{m.title}</span>
              </div>
            ))}
            {DEMO_CONTENT.calendar_gaps.map((g, i) => (
              <div key={`g${i}`} style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: `1px solid ${BD}` }}>
                <span style={{ fontFamily: FM, fontSize: 11, color: TEAL, width: 44 }}>{g.time}</span>
                <span style={{ fontSize: 12, color: TEAL, fontWeight: 600 }}>{g.context}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: NAVY, padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderTop: `2px solid ${TEAL}` }}>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontFamily: F }}>This is a demo workspace. Full interactive version available with Strategy-Fit assessments.</span>
      </div>
    </div>
  )
}

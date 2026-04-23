'use client'

import { useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { DemoLayout } from '@/components/DemoShell'
import {
  NAVY, TEAL, TEALD, TEALLT, BG, CARD, BD, TX, TX2, TX3, F,
} from '@/lib/constants'

const _mSub = (cb) => { window.addEventListener('resize', cb); return () => window.removeEventListener('resize', cb) }
const _mSnap = () => window.innerWidth <= 768
const _mServer = () => false
function useIsMobile() { return useSyncExternalStore(_mSub, _mSnap, _mServer) }

const SLATE = '#64748B'

// Hardcoded demo forced choice — Marketing Manager Pressure Test ranking task.
// Lets prospects experience the mechanic without submitting any data.
const DEMO_SPEC = {
  scenarioTitle: 'Pressure Test, Marketing Manager',
  scenarioContext: 'It is Tuesday, 9:10am. Your flagship campaign launches at 2pm today. The design team have just told you the hero asset has the wrong regulatory disclaimer and legal are not in the office until 11. The client has emailed twice this morning chasing an update. Your line manager Priya is waiting to be briefed before her 10am exec review.',
  instruction: 'Rank these actions in the order you would tackle them. Drag to reorder or use the arrow buttons.',
  items: [
    'Call the client directly to explain the delay',
    'Brief your line manager before taking any action',
    'Draft a revised project timeline and share with all stakeholders',
    'Identify the root cause of the delay before communicating externally',
    'Ask the brand team to approve a reduced scope for immediate release',
  ],
}

export default function ForcedChoiceDemoPage() {
  const isMobile = useIsMobile()
  const [order, setOrder] = useState(DEMO_SPEC.items)
  const [dragIndex, setDragIndex] = useState(null)
  const [openText, setOpenText] = useState('')
  const touched = JSON.stringify(order) !== JSON.stringify(DEMO_SPEC.items)

  function move(i, dir) {
    const j = i + dir
    if (j < 0 || j >= order.length) return
    const next = [...order]
    ;[next[i], next[j]] = [next[j], next[i]]
    setOrder(next)
  }
  function handleDrop(targetIndex) {
    if (dragIndex == null || dragIndex === targetIndex) return
    const next = [...order]
    const [moved] = next.splice(dragIndex, 1)
    next.splice(targetIndex, 0, moved)
    setDragIndex(null)
    setOrder(next)
  }

  return (
    <DemoLayout active="dashboard">
      <main style={{
        marginLeft: isMobile ? 0 : 220,
        marginTop: isMobile ? 96 : 46,
        padding: isMobile ? '20px 16px 40px' : '36px 40px 56px',
        minHeight: '100vh', background: BG, flex: 1, minWidth: 0,
      }}>
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          <div style={{ fontFamily: F, fontSize: 11.5, fontWeight: 800, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            Try a decision task
          </div>
          <h1 style={{ fontFamily: F, fontSize: isMobile ? 24 : 30, fontWeight: 800, color: NAVY, margin: '0 0 10px', letterSpacing: '-0.3px' }}>
            {DEMO_SPEC.scenarioTitle}
          </h1>
          <p style={{ fontFamily: F, fontSize: 15, color: TX2, margin: '0 0 22px', lineHeight: 1.6 }}>
            This is a sample forced choice task. Reorder the actions the way you would handle them in the role, then explain your reasoning. Nothing is submitted or scored.
          </p>

          <div style={{
            background: CARD, border: `1px solid ${BD}`, borderRadius: 14,
            padding: isMobile ? '18px 18px' : '22px 26px',
            boxShadow: '0 2px 14px rgba(15,33,55,0.06)',
          }}>
            <div style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Context
            </div>
            <p style={{ fontFamily: F, fontSize: 14.5, color: TX, margin: 0, lineHeight: 1.7 }}>
              {DEMO_SPEC.scenarioContext}
            </p>
          </div>

          <div style={{
            marginTop: 22, padding: '18px 22px',
            background: '#f8fafb', border: '1px solid #e4e9f0', borderRadius: 14,
            borderLeft: `4px solid ${NAVY}`,
          }}>
            <div style={{ fontFamily: F, fontSize: 13, fontWeight: 800, color: NAVY, marginBottom: 6, letterSpacing: '-0.1px' }}>
              Step 1: Make your decisions
            </div>
            <div style={{ fontFamily: F, fontSize: 13, color: TX2, marginBottom: 16, lineHeight: 1.55 }}>
              {DEMO_SPEC.instruction}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {order.map((item, i) => (
                <div
                  key={item}
                  draggable
                  onDragStart={() => setDragIndex(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(i)}
                  onDragEnd={() => setDragIndex(null)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: '#fff', border: `1px solid ${NAVY}22`, borderRadius: 10,
                    padding: '12px 14px', cursor: 'grab',
                    opacity: dragIndex === i ? 0.6 : 1,
                    transition: 'opacity 0.15s',
                  }}
                >
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={SLATE} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }} aria-hidden="true">
                    <circle cx="9" cy="6" r="1.2" /><circle cx="9" cy="12" r="1.2" /><circle cx="9" cy="18" r="1.2" />
                    <circle cx="15" cy="6" r="1.2" /><circle cx="15" cy="12" r="1.2" /><circle cx="15" cy="18" r="1.2" />
                  </svg>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 26, height: 26, borderRadius: 999, flexShrink: 0,
                    background: TEAL, color: NAVY,
                    fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 800,
                  }}>
                    {i + 1}
                  </span>
                  <span style={{ fontFamily: F, fontSize: 13.5, color: NAVY, flex: 1, lineHeight: 1.5 }}>{item}</span>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      aria-label="Move up"
                      style={{
                        width: 30, height: 30, borderRadius: 7, border: '1px solid #e4e9f0', background: '#fff',
                        cursor: i === 0 ? 'not-allowed' : 'pointer', opacity: i === 0 ? 0.35 : 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#0f2137" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i === order.length - 1}
                      aria-label="Move down"
                      style={{
                        width: 30, height: 30, borderRadius: 7, border: '1px solid #e4e9f0', background: '#fff',
                        cursor: i === order.length - 1 ? 'not-allowed' : 'pointer', opacity: i === order.length - 1 ? 0.35 : 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#0f2137" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {touched && (
              <div style={{
                marginTop: 14, padding: '10px 14px',
                background: TEALLT, border: `1px solid ${TEAL}55`, borderRadius: 10,
                fontFamily: F, fontSize: 13, color: TEALD, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8,
              }}>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={TEALD} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                Your ranking has been saved. Now explain your thinking below.
              </div>
            )}
          </div>

          <div style={{ marginTop: 22 }}>
            <label style={{ fontFamily: F, fontSize: 13, fontWeight: 700, color: NAVY, display: 'block', marginBottom: 6 }}>
              Step 2: Explain your thinking
            </label>
            <div style={{ fontFamily: F, fontSize: 13, color: TX2, marginBottom: 10, lineHeight: 1.55 }}>
              Now explain the reasoning behind your decisions above. What factors drove your choices?
            </div>
            <textarea
              value={openText}
              onChange={e => setOpenText(e.target.value)}
              placeholder="Write your reasoning here..."
              rows={6}
              style={{
                width: '100%', minHeight: 140, fontFamily: F, fontSize: 14.5, color: TX,
                background: CARD, border: `1.5px solid ${BD}`, borderRadius: 10,
                padding: '12px 14px', resize: 'vertical', outline: 'none',
                lineHeight: 1.7, boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginTop: 26, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link
              href="/demo"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '10px 16px', borderRadius: 8, textDecoration: 'none',
                background: TEAL, color: NAVY,
                fontFamily: F, fontSize: 13.5, fontWeight: 800,
              }}
            >
              Back to demo
            </Link>
            <span style={{ fontFamily: F, fontSize: 12.5, color: TX3, alignSelf: 'center' }}>
              No data is submitted from this page.
            </span>
          </div>
        </div>
      </main>
    </DemoLayout>
  )
}

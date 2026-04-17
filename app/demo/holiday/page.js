'use client'

import { useState, useEffect, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { Ic } from '@/components/Icons'
import { DemoLayout, SignUpModal } from '@/components/DemoShell'
import {
  NAVY, TEAL, TEALD, TEALLT, BG, CARD, BD, TX, TX2, TX3,
  F, cs,
} from '@/lib/constants'

const _mSub = (cb) => { window.addEventListener('resize', cb); return () => window.removeEventListener('resize', cb) }
const _mSnap = () => window.innerWidth <= 768
const _mServer = () => false
function useIsMobile() { return useSyncExternalStore(_mSub, _mSnap, _mServer) }

const WORKER = {
  name: 'Sophie Chen',
  role: 'Marketing Manager',
  holidayYearStart: '1 April 2026',
  holidayYearEnd: '31 March 2027',
  entitlement: 28,
  daysTaken: 8,
}

export default function DemoHolidayPage() {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [modal, setModal] = useState(false)
  const [demoEmploymentType, setDemoEmploymentType] = useState(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try { setDemoEmploymentType(localStorage.getItem('prodicta_demo_employment_type')) } catch {}
  }, [])

  const daysRemaining = WORKER.entitlement - WORKER.daysTaken
  const progressPct = Math.round((WORKER.daysTaken / WORKER.entitlement) * 100)

  return (
    <DemoLayout active="holiday" demoEmploymentType={demoEmploymentType}>
      {modal && <SignUpModal onClose={() => setModal(false)} />}
      <main style={{
        marginLeft: isMobile ? 0 : 220,
        marginTop: isMobile ? 56 : 0,
        padding: isMobile ? '80px 16px 32px' : '60px 40px 32px',
        minHeight: '100vh', background: BG, fontFamily: F,
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: TX, margin: '0 0 6px' }}>Holiday Pay Tracker</h1>
            <p style={{ fontSize: 13.5, color: TX2, margin: 0, lineHeight: 1.55 }}>
              Statutory holiday entitlement, accrual, and usage across every worker. Designed for the 2026 reference period rules.
            </p>
          </div>

          {/* Retention notice */}
          <div style={{ ...cs, borderLeft: `4px solid ${TEAL}`, marginBottom: 22, padding: '14px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Ic name="shield" size={16} color={TEALD} />
              <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: 0, lineHeight: 1.55 }}>
                Holiday pay records retained for 6 years. HMRC compliant.
              </p>
            </div>
          </div>

          {/* Record card: Sophie Chen */}
          <div style={{ ...cs, marginBottom: 20, padding: 0, overflow: 'hidden' }}>
            <div style={{
              padding: '16px 22px', borderBottom: `1px solid ${BD}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexWrap: 'wrap', gap: 10,
            }}>
              <div>
                <div style={{ fontFamily: F, fontSize: 15, fontWeight: 800, color: TX }}>{WORKER.name}</div>
                <div style={{ fontFamily: F, fontSize: 12, color: TX3, marginTop: 2 }}>{WORKER.role}</div>
              </div>
              <span style={{
                fontFamily: F, fontSize: 11, fontWeight: 700, color: TX2,
                background: BG, border: `1px solid ${BD}`, borderRadius: 50,
                padding: '3px 10px',
              }}>
                Holiday year: {WORKER.holidayYearStart} to {WORKER.holidayYearEnd}
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
              gap: 14, padding: '20px 22px', borderBottom: `1px solid ${BD}`,
            }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Total entitlement</div>
                <div style={{ fontFamily: F, fontSize: 18, fontWeight: 800, color: NAVY }}>{WORKER.entitlement} days</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Days taken</div>
                <div style={{ fontFamily: F, fontSize: 18, fontWeight: 800, color: NAVY }}>{WORKER.daysTaken} days</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Days remaining</div>
                <div style={{ fontFamily: F, fontSize: 18, fontWeight: 800, color: TEALD }}>{daysRemaining} days</div>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ padding: '18px 22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: TX2 }}>
                  {WORKER.daysTaken} of {WORKER.entitlement} days used
                </span>
                <span style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: TX2 }}>
                  {progressPct}%
                </span>
              </div>
              <div style={{ width: '100%', height: 8, background: BG, borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  width: `${progressPct}%`, height: '100%', background: TEAL,
                  borderRadius: 4, transition: 'width 0.4s ease',
                }} />
              </div>
              <p style={{ fontFamily: F, fontSize: 11, color: TX3, margin: '10px 0 0' }}>
                Based on a 28-day statutory entitlement for a full-time worker.
              </p>
            </div>
          </div>

          {/* Signup prompt card */}
          <div style={{
            background: CARD, border: `1px solid ${BD}`, borderRadius: 14,
            borderTop: `3px solid ${TEAL}`,
            padding: isMobile ? '22px 20px' : '26px 28px',
            textAlign: 'center',
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: TEALLT, border: `1px solid ${TEAL}44`,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 14,
            }}>
              <Ic name="calendar" size={22} color={TEALD} />
            </div>
            <h2 style={{ fontFamily: F, fontSize: 17, fontWeight: 800, color: NAVY, margin: '0 0 8px', letterSpacing: '-0.2px' }}>
              This is a preview
            </h2>
            <p style={{ fontFamily: F, fontSize: 13.5, color: TX2, margin: '0 0 18px', lineHeight: 1.6, maxWidth: 460, marginLeft: 'auto', marginRight: 'auto' }}>
              Sign up to track holiday pay for all your workers.
            </p>
            <button
              onClick={() => router.push('/login')}
              style={{
                padding: '11px 26px', borderRadius: 9, border: 'none',
                background: TEAL, color: NAVY,
                fontFamily: F, fontSize: 14, fontWeight: 800, cursor: 'pointer',
              }}
            >
              Get Started
            </button>
          </div>

        </div>
      </main>
    </DemoLayout>
  )
}

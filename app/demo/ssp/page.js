'use client'

import { useState, useEffect, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { Ic } from '@/components/Icons'
import { DemoLayout, SignUpModal } from '@/components/DemoShell'
import { isDemoAgencyPerm } from '@/lib/account-helpers'
import {
  NAVY, TEAL, TEALD, TEALLT, BG, CARD, BD, TX, TX2, TX3,
  GRN, GRNBG, GRNBD, AMB, AMBBG, AMBBD, F, cs,
} from '@/lib/constants'

const _mSub = (cb) => { window.addEventListener('resize', cb); return () => window.removeEventListener('resize', cb) }
const _mSnap = () => window.innerWidth <= 768
const _mServer = () => false
function useIsMobile() { return useSyncExternalStore(_mSub, _mSnap, _mServer) }

const TABS = [
  { key: 'checker', label: 'SSP Checker' },
  { key: 'records', label: 'SSP Records' },
  { key: 'linked',  label: 'Linked Periods' },
]

const MANAGER_STEPS = [
  { label: 'Confirm first sick day',                   done: true },
  { label: 'Request self-certification or fit note',    done: true },
  { label: 'Notify client of cover needs',              done: true },
  { label: 'Log SSP payment into weekly payroll',       done: false },
  { label: 'File return-to-work plan once recovered',   done: false },
]

export default function DemoSspPage() {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [modal, setModal] = useState(false)
  const [activeTab, setActiveTab] = useState('checker')
  const [demoEmploymentType, setDemoEmploymentType] = useState(null)
  const [redirecting, setRedirecting] = useState(false)

  // Mirrors the live /ssp guard: SSP belongs to the legal employer of record,
  // and permanent recruitment agencies are not it. If a demo viewer URL-jumps
  // here in agency-perm mode, send them back to the demo dashboard rather
  // than render a page that does not apply to them.
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const acct = localStorage.getItem('prodicta_demo_account_type')
      const empType = localStorage.getItem('prodicta_demo_employment_type')
      setDemoEmploymentType(empType)
      if (isDemoAgencyPerm(acct, empType)) {
        setRedirecting(true)
        router.replace('/demo')
      }
    } catch {}
  }, [])

  if (redirecting) return null

  const stepsDone = MANAGER_STEPS.filter(s => s.done).length
  const stepsTotal = MANAGER_STEPS.length
  const progressPct = Math.round((stepsDone / stepsTotal) * 100)

  return (
    <DemoLayout active="ssp" demoEmploymentType={demoEmploymentType}>
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
            <h1 style={{ fontSize: 22, fontWeight: 800, color: TX, margin: '0 0 6px' }}>SSP Management</h1>
            <p style={{ fontSize: 13.5, color: TX2, margin: 0, lineHeight: 1.55 }}>
              Statutory Sick Pay for every temporary placement, handled automatically. Eligibility, weekly calculations, and manager guidance in one place.
            </p>
          </div>

          {/* Sub-nav tabs */}
          <div style={{
            display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 22,
            padding: 6, background: CARD, border: `1px solid ${BD}`, borderRadius: 10,
          }}>
            {TABS.map(t => {
              const isActive = activeTab === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => {
                    if (t.key === 'records' || t.key === 'linked') {
                      setModal(true)
                    } else {
                      setActiveTab(t.key)
                    }
                  }}
                  style={{
                    padding: '8px 16px', borderRadius: 7, border: 'none',
                    background: isActive ? NAVY : 'transparent',
                    color: isActive ? '#fff' : TX2,
                    fontFamily: F, fontSize: 13, fontWeight: 700,
                    cursor: 'pointer', transition: 'background 0.15s, color 0.15s',
                  }}
                >
                  {t.label}
                </button>
              )
            })}
          </div>

          {/* Record card: James O'Brien */}
          <div style={{ ...cs, marginBottom: 20, padding: 0, overflow: 'hidden' }}>
            <div style={{
              padding: '16px 22px', borderBottom: `1px solid ${BD}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexWrap: 'wrap', gap: 10,
            }}>
              <div>
                <div style={{ fontFamily: F, fontSize: 15, fontWeight: 800, color: TX }}>James O'Brien</div>
                <div style={{ fontFamily: F, fontSize: 12, color: TX3, marginTop: 2 }}>
                  Temp Customer Service Advisor
                </div>
              </div>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 12px', borderRadius: 50,
                background: TEALLT, color: TEALD,
                border: `1px solid ${TEAL}55`,
                fontFamily: F, fontSize: 11, fontWeight: 800, letterSpacing: '0.04em',
              }}>
                <Ic name="shield" size={11} color={TEALD} />
                ELIGIBLE FROM DAY ONE
              </span>
            </div>

            {/* Details grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
              gap: 14, padding: '18px 22px', borderBottom: `1px solid ${BD}`,
            }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Sick date</div>
                <div style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TX }}>8 April 2026</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Weekly SSP</div>
                <div style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TX }}>&pound;98.60</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Evidence required</div>
                <div style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TX }}>Self-certification</div>
              </div>
            </div>

            {/* Manager Guidance Panel */}
            <div style={{ padding: '18px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: TX, fontFamily: F, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Manager Guidance
                </div>
                <div style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: TX2 }}>
                  {stepsDone} of {stepsTotal} steps complete
                </div>
              </div>
              <div style={{ width: '100%', height: 8, background: BG, borderRadius: 4, overflow: 'hidden', marginBottom: 16 }}>
                <div style={{
                  width: `${progressPct}%`, height: '100%', background: TEAL,
                  borderRadius: 4, transition: 'width 0.4s ease',
                }} />
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {MANAGER_STEPS.map((step, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                      background: step.done ? GRNBG : BG,
                      border: `1px solid ${step.done ? GRNBD : BD}`,
                    }}>
                      <Ic name={step.done ? 'check' : 'clock'} size={12} color={step.done ? GRN : TX3} />
                    </span>
                    <span style={{
                      fontFamily: F, fontSize: 13, lineHeight: 1.45,
                      color: step.done ? TX2 : TX,
                      textDecoration: step.done ? 'line-through' : 'none',
                      opacity: step.done ? 0.75 : 1,
                    }}>
                      {step.label}
                    </span>
                  </li>
                ))}
              </ul>
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
              <Ic name="award" size={22} color={TEALD} />
            </div>
            <h2 style={{ fontFamily: F, fontSize: 17, fontWeight: 800, color: NAVY, margin: '0 0 8px', letterSpacing: '-0.2px' }}>
              This is a preview
            </h2>
            <p style={{ fontFamily: F, fontSize: 13.5, color: TX2, margin: '0 0 18px', lineHeight: 1.6, maxWidth: 460, marginLeft: 'auto', marginRight: 'auto' }}>
              Sign up to manage SSP for your candidates.
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

'use client'

import { useState, useEffect, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { Ic } from '@/components/Icons'
import { DemoLayout, SignUpModal } from '@/components/DemoShell'
import {
  NAVY, TEAL, TEALD, TEALLT, BG, CARD, BD, TX, TX2, TX3,
  AMB, AMBBG, AMBBD,
  F, cs,
} from '@/lib/constants'

const _mSub = (cb) => { window.addEventListener('resize', cb); return () => window.removeEventListener('resize', cb) }
const _mSnap = () => window.innerWidth <= 768
const _mServer = () => false
function useIsMobile() { return useSyncExternalStore(_mSub, _mSnap, _mServer) }

const SSP_TEMPLATES = [
  { id: 'self-cert',       name: 'Self-Certification Form',      note: 'For absences up to 7 days' },
  { id: 'rtw-interview',   name: 'Return to Work Interview Form', note: 'After any period of absence' },
  { id: 'fit-note',        name: 'Fit Note Request Letter',       note: 'For absences over 7 days' },
  { id: 'ssp1',            name: 'SSP1 Form',                     note: 'When SSP ends or cannot be paid' },
]

const ASSIGNMENT_TEMPLATES = [
  { id: 'assignment-confirm',  name: 'Assignment Confirmation Letter', note: 'Confirm start date, role, rate, and terms' },
  { id: 'assignment-extend',   name: 'Assignment Extension Letter',    note: 'Extend an existing temporary placement' },
  { id: 'assignment-end',      name: 'Assignment End Letter',          note: 'Notify worker of assignment end' },
  { id: 'between-assignments', name: 'Between Assignments Confirmation', note: 'Maintain continuous service record' },
]

export default function DemoDocumentsPage() {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [modal, setModal] = useState(false)
  const [demoEmploymentType, setDemoEmploymentType] = useState(null)
  const [demoAccountType, setDemoAccountType] = useState('agency')
  const [search, setSearch] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const et = localStorage.getItem('prodicta_demo_employment_type')
      setDemoEmploymentType(et)
      const at = localStorage.getItem('prodicta_demo_account_type')
      if (at === 'agency' || at === 'employer') setDemoAccountType(at)
    } catch {}
  }, [])

  const isAgency = demoAccountType === 'agency'

  const openModal = () => setModal(true)

  function TemplateCard({ name, note }) {
    return (
      <div style={{
        ...cs, padding: '16px 18px',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: TEALLT, border: `1px solid ${TEAL}33`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Ic name="file" size={16} color={TEALD} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: F, fontSize: 14, fontWeight: 800, color: TX, marginBottom: 2 }}>
              {name}
            </div>
            <div style={{ fontFamily: F, fontSize: 12, color: TX3, lineHeight: 1.5 }}>
              {note}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={openModal}
          style={{
            alignSelf: 'flex-start', marginTop: 4,
            padding: '8px 16px', borderRadius: 8, border: 'none',
            background: TEAL, color: NAVY,
            fontFamily: F, fontSize: 12.5, fontWeight: 800, cursor: 'pointer',
          }}
        >
          Generate
        </button>
      </div>
    )
  }

  return (
    <DemoLayout active="documents" demoEmploymentType={demoEmploymentType}>
      {modal && <SignUpModal onClose={() => setModal(false)} />}
      <main style={{
        marginLeft: isMobile ? 0 : 220,
        marginTop: isMobile ? 56 : 0,
        padding: isMobile ? '80px 16px 32px' : '60px 40px 32px',
        minHeight: '100vh', background: BG, fontFamily: F,
      }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: TX, margin: '0 0 6px' }}>
              Document Templates
            </h1>
            <p style={{ fontSize: 13.5, color: TX2, margin: 0, lineHeight: 1.55 }}>
              Pre-filled SSP and assignment paperwork ready for review and dispatch. Every template pulls directly from your candidate and worker profiles so you never start from a blank page.
            </p>
          </div>

          {/* Disclaimer */}
          <div style={{
            background: AMBBG, border: `1px solid ${AMBBD}`, borderLeft: `4px solid ${AMB}`,
            borderRadius: '0 10px 10px 0', padding: '12px 16px', marginBottom: 20,
          }}>
            <p style={{ fontFamily: F, fontSize: 12.5, color: '#92400E', margin: 0, lineHeight: 1.55 }}>
              Templates pre-fill from your candidate and worker profiles. Review all highlighted sections before sending.
            </p>
          </div>

          {/* Candidate search */}
          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: 'block', fontFamily: F, fontSize: 11, fontWeight: 700,
              color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6,
            }}>
              Find a candidate to pre-fill from
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}>
                <Ic name="search" size={14} color={TX3} />
              </div>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onFocus={() => { setSearchFocused(true); openModal() }}
                onBlur={() => setSearchFocused(false)}
                placeholder="Search candidates by name or email..."
                style={{
                  width: '100%', padding: '11px 14px 11px 38px',
                  borderRadius: 10, border: `1.5px solid ${searchFocused ? TEAL : BD}`,
                  background: CARD, fontFamily: F, fontSize: 14, color: TX,
                  outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color 0.15s',
                }}
              />
            </div>
          </div>

          {/* SSP Documents */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
              <h2 style={{ fontFamily: F, fontSize: 15, fontWeight: 800, color: TX, margin: 0 }}>
                SSP Documents
              </h2>
              <span style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                All accounts
              </span>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 12,
            }}>
              {SSP_TEMPLATES.map(t => <TemplateCard key={t.id} name={t.name} note={t.note} />)}
            </div>
          </div>

          {/* Assignment Documents — agency only */}
          {isAgency && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                <h2 style={{ fontFamily: F, fontSize: 15, fontWeight: 800, color: TX, margin: 0 }}>
                  Assignment Documents
                </h2>
                <span style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: TEALD, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Agency only
                </span>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: 12,
              }}>
                {ASSIGNMENT_TEMPLATES.map(t => <TemplateCard key={t.id} name={t.name} note={t.note} />)}
              </div>
            </div>
          )}

          {/* Signup prompt */}
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
              <Ic name="file" size={22} color={TEALD} />
            </div>
            <h2 style={{ fontFamily: F, fontSize: 17, fontWeight: 800, color: NAVY, margin: '0 0 8px', letterSpacing: '-0.2px' }}>
              This is a preview
            </h2>
            <p style={{ fontFamily: F, fontSize: 13.5, color: TX2, margin: '0 0 18px', lineHeight: 1.6, maxWidth: 460, marginLeft: 'auto', marginRight: 'auto' }}>
              Sign up to generate and download pre-filled documents for your candidates and workers.
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

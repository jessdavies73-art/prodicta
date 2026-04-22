'use client'
import { useState, useEffect, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { Ic } from '@/components/Icons'
import {
  NAVY, TEAL, TEALD, BG, BD, TX, TX2, TX3,
  AMB, AMBBG, RED, REDBG,
  F, FM,
} from '@/lib/constants'

const _mSub = (cb) => { window.addEventListener('resize', cb); return () => window.removeEventListener('resize', cb) }
const _mSnap = () => window.innerWidth <= 768
const _mServer = () => false
function useIsMobile() { return useSyncExternalStore(_mSub, _mSnap, _mServer) }

// Agency variant: commercial cost of a failed placement (lost fee + search + rep damage).
function PlacementRiskCard() {
  const [fee, setFee] = useState('5000')
  const [feeFocused, setFeeFocused] = useState(false)
  const [showBreakdown, setShowBreakdown] = useState(false)

  const feeVal = Math.max(0, parseInt(fee.replace(/[^0-9]/g, '')) || 0)
  const replacementSearch = 3000
  const totalLoss = feeVal + replacementSearch

  function gbp(n) { return '£' + n.toLocaleString('en-GB') }

  const inputStyle = focused => ({
    fontFamily: F, fontSize: 15, fontWeight: 700, width: '100%',
    padding: '10px 14px', borderRadius: 8,
    border: `1.5px solid ${focused ? TEAL : BD}`,
    background: '#fff', color: NAVY, outline: 'none',
    boxSizing: 'border-box', transition: 'border-color 0.15s',
  })

  return (
    <div style={{
      background: '#0f2137',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 14,
      overflow: 'hidden',
      marginBottom: 24,
    }}>
      <div style={{ padding: '20px 24px' }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
            Placement risk / cost of failed placement
          </div>
          <div style={{ width: 36, height: 2, background: '#00BFA5', borderRadius: 2 }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, flexWrap: 'wrap', marginBottom: 10 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 6, fontFamily: F }}>
              Average placement fee
            </label>
            <div style={{ position: 'relative', width: 180 }}>
              <span style={{
                position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
                fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.4)', pointerEvents: 'none',
              }}>£</span>
              <input
                type="text"
                value={fee}
                onChange={e => setFee(e.target.value.replace(/[^0-9]/g, ''))}
                onFocus={() => setFeeFocused(true)}
                onBlur={() => setFeeFocused(false)}
                style={{ ...inputStyle(feeFocused), paddingLeft: 26, background: 'rgba(255,255,255,0.08)', color: '#fff', border: `1.5px solid ${feeFocused ? TEAL : 'rgba(255,255,255,0.18)'}` }}
                placeholder="5000"
              />
            </div>
          </div>
          <div style={{ paddingBottom: 2 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Total exposure</div>
            <div style={{ fontFamily: FM, fontSize: 30, fontWeight: 800, color: AMB, lineHeight: 1 }}>
              {gbp(totalLoss)}
            </div>
          </div>
        </div>

        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 14 }}>
          Lost fee + replacement search + reputational damage.
        </div>

        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 12.5, fontWeight: 700, color: TEAL, fontFamily: F,
            padding: 0, display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          {showBreakdown ? 'Hide breakdown' : 'Show breakdown'}
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: showBreakdown ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {showBreakdown && (
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Lost placement fee',         value: gbp(feeVal),            note: 'Not recovered on failed placement',              color: RED  },
              { label: 'Replacement search cost',    value: gbp(replacementSearch), note: 'Average cost to source a replacement',           color: AMB  },
              { label: 'Client relationship damage', value: 'Reputational',         note: 'Loss of future instructions, hard to quantify',  color: TEAL },
            ].map(({ label, value, note, color }) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderRadius: 8,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                gap: 12,
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{label}</div>
                  <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>{note}</div>
                </div>
                <div style={{ fontFamily: FM, fontSize: 17, fontWeight: 800, color, flexShrink: 0 }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Direct employer variant: ERA 2025 exposure across predicted failing hires.
function ERA2025RiskCalculator() {
  const [salary, setSalary] = useState('30000')
  const [hires, setHires] = useState('5')
  const [salFocused, setSalFocused] = useState(false)
  const [hiresFocused, setHiresFocused] = useState(false)
  const [showBreakdown, setShowBreakdown] = useState(false)

  const sal = Math.max(0, parseInt(salary.replace(/[^0-9]/g, '')) || 0)
  const h   = Math.max(1, parseInt(hires.replace(/[^0-9]/g, '')) || 1)

  const recruitment  = Math.round(sal * 0.15)
  const training     = 3000
  const productivity = Math.round(sal * 0.25)
  const tribunal     = Math.round(sal * 0.75)
  const totalPerHire = recruitment + training + productivity + tribunal

  const failCount     = Math.max(1, Math.round(h * 0.2))
  const totalExposure = totalPerHire * failCount

  function gbp(n) { return '£' + n.toLocaleString('en-GB') }

  const inputStyle = focused => ({
    fontFamily: F, fontSize: 15, fontWeight: 700, width: '100%',
    padding: '10px 14px', borderRadius: 8,
    border: `1.5px solid ${focused ? TEAL : BD}`,
    background: '#fff', color: NAVY, outline: 'none',
    boxSizing: 'border-box', transition: 'border-color 0.15s',
  })

  const BREAK = [
    { label: 'Recruitment cost',       value: recruitment,  note: '15% of salary',             color: AMB, bg: AMBBG },
    { label: 'Training and onboarding', value: training,    note: 'Average cost per hire',     color: AMB, bg: AMBBG },
    { label: 'Lost productivity',      value: productivity, note: 'Roughly 3 months in role',  color: AMB, bg: AMBBG },
    { label: 'ERA 2025 tribunal risk', value: tribunal,     note: 'Uncapped from Jan 2027',    color: RED, bg: REDBG },
  ]

  return (
    <div style={{
      background: '#0f2137',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 14,
      overflow: 'hidden',
      marginBottom: 24,
    }}>
      <div style={{ padding: '20px 24px' }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
            ERA 2025 risk calculator
          </div>
          <div style={{ width: 36, height: 2, background: '#00BFA5', borderRadius: 2 }} />
        </div>

        <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '0 0 auto' }}>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 6, fontFamily: F }}>
              Average salary
            </label>
            <div style={{ position: 'relative', width: 160 }}>
              <span style={{
                position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
                fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.4)', pointerEvents: 'none',
              }}>£</span>
              <input
                type="text"
                value={salary}
                onChange={e => setSalary(e.target.value.replace(/[^0-9]/g, ''))}
                onFocus={() => setSalFocused(true)}
                onBlur={() => setSalFocused(false)}
                style={{ ...inputStyle(salFocused), paddingLeft: 26, background: 'rgba(255,255,255,0.08)', color: '#fff', border: `1.5px solid ${salFocused ? TEAL : 'rgba(255,255,255,0.18)'}` }}
                placeholder="30000"
              />
            </div>
          </div>
          <div style={{ flex: '0 0 auto' }}>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 6, fontFamily: F }}>
              Hires this year
            </label>
            <input
              type="text"
              value={hires}
              onChange={e => setHires(e.target.value.replace(/[^0-9]/g, ''))}
              onFocus={() => setHiresFocused(true)}
              onBlur={() => setHiresFocused(false)}
              style={{ ...inputStyle(hiresFocused), width: 100, background: 'rgba(255,255,255,0.08)', color: '#fff', border: `1.5px solid ${hiresFocused ? TEAL : 'rgba(255,255,255,0.18)'}` }}
              placeholder="5"
            />
          </div>
          <div style={{ paddingBottom: 2 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Total exposure</div>
            <div style={{ fontFamily: FM, fontSize: 30, fontWeight: 800, color: AMB, lineHeight: 1 }}>
              {gbp(totalExposure)}
            </div>
            <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>
              {failCount} of {h} hire{h !== 1 ? 's' : ''} failing · 20% industry average
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 12.5, fontWeight: 700, color: TEAL, fontFamily: F,
            padding: 0, display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          {showBreakdown ? 'Hide breakdown' : 'Show breakdown'}
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: showBreakdown ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {showBreakdown && (
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {BREAK.map(({ label, value, note, color }) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderRadius: 8,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                gap: 12,
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{label}</div>
                  <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>{note}</div>
                </div>
                <div style={{ fontFamily: FM, fontSize: 17, fontWeight: 800, color, flexShrink: 0 }}>
                  {gbp(value)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function PlacementCalculatorPage() {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }
        const { data: prof } = await supabase.from('users').select('account_type').eq('id', user.id).maybeSingle()
        setProfile(prof)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  const isAgency = profile?.account_type === 'agency'

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar active="placements" />
      <main style={{
        marginLeft: isMobile ? 0 : 220,
        padding: isMobile ? '72px 16px 32px' : '32px 40px',
        minHeight: '100vh', background: BG, flex: 1, minWidth: 0,
        fontFamily: F,
      }}>
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'transparent', border: `1px solid ${BD}`, borderRadius: 8,
            padding: '7px 14px', fontFamily: F, fontSize: 12.5, fontWeight: 700,
            color: TX2, cursor: 'pointer', marginBottom: 18,
          }}
        >
          <Ic name="left" size={12} color={TX2} />
          Back to dashboard
        </button>

        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: NAVY, letterSpacing: '-0.5px' }}>
          Placement Risk Calculator
        </h1>
        <p style={{ margin: '6px 0 22px', fontFamily: F, fontSize: 14, color: TX2, lineHeight: 1.55, maxWidth: 640 }}>
          Calculate the commercial cost of placement failure and see how PRODICTA protects your revenue.
        </p>

        {loading ? (
          <div style={{ padding: '28px 0', display: 'flex', alignItems: 'center', gap: 10, color: TX3, fontSize: 13 }}>
            <div style={{ width: 20, height: 20, border: `3px solid ${BD}`, borderTopColor: TEAL, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            Loading...
          </div>
        ) : isAgency ? (
          <PlacementRiskCard />
        ) : (
          <ERA2025RiskCalculator />
        )}
      </main>
    </div>
  )
}

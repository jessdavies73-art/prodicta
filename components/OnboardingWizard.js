'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import ProdictaLogo from './ProdictaLogo'
import { NAVY, TEAL, TEALD, TEALLT, BD, TX, TX2, TX3, F } from '../lib/constants'

// ── Onboarding Wizard ─────────────────────────────────────────────────────────
// Shows once after first sign-up. 3 steps: Welcome → Account type → First assessment

export default function OnboardingWizard({ userId, initialAccountType, onComplete }) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [accountType, setAccountType] = useState(initialAccountType || 'employer')
  const [saving, setSaving] = useState(false)

  async function finishAndClose(goToNew = false) {
    setSaving(true)
    try {
      const supabase = createClient()
      await supabase.from('users').update({
        account_type: accountType,
        onboarding_complete: true,
      }).eq('id', userId)
    } catch {}
    setSaving(false)
    onComplete(accountType)
    if (goToNew) router.push('/assessment/new')
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(10, 25, 41, 0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, width: '100%', maxWidth: 500,
        boxShadow: '0 32px 80px rgba(0,0,0,0.3)',
        overflow: 'hidden', position: 'relative',
        animation: 'fadeInUp 0.3s ease-out',
      }}>
        <style>{`@keyframes fadeInUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>

        {/* Progress bar */}
        <div style={{ height: 4, background: '#f1f5f9' }}>
          <div style={{
            height: '100%',
            width: `${(step / 3) * 100}%`,
            background: `linear-gradient(90deg, ${TEAL}, ${TEALD})`,
            transition: 'width 0.4s ease',
          }} />
        </div>

        <div style={{ padding: 'clamp(20px, 4vw, 40px) clamp(20px, 4vw, 40px) clamp(20px, 3vw, 32px)' }}>

          {/* Step 1: Welcome */}
          {step === 1 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 24,
                filter: 'drop-shadow(0 0 12px rgba(0,191,165,0.35))',
              }}>
                <ProdictaLogo size={56} textColor={NAVY} />
              </div>
              <h2 style={{ fontFamily: F, fontSize: 24, fontWeight: 800, color: NAVY, margin: '0 0 12px', letterSpacing: '-0.4px' }}>
                Welcome to Prodicta
              </h2>
              <p style={{ fontFamily: F, fontSize: 15, color: TX2, margin: '0 0 32px', lineHeight: 1.7 }}>
                You're set up and ready to start assessing candidates. We'll have you running your first assessment in under 2 minutes.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  onClick={() => setStep(2)}
                  style={{
                    width: '100%', padding: '13px 0', borderRadius: 10, border: 'none',
                    background: `linear-gradient(135deg, ${TEAL}, ${TEALD})`,
                    color: NAVY, fontFamily: F, fontSize: 15, fontWeight: 800, cursor: 'pointer',
                    letterSpacing: '-0.1px',
                  }}
                >
                  Let's go →
                </button>
              </div>
              <div style={{ marginTop: 12, fontFamily: F, fontSize: 11.5, color: TX3 }}>Step 1 of 3</div>
            </div>
          )}

          {/* Step 2: Account type */}
          {step === 2 && (
            <div>
              <h2 style={{ fontFamily: F, fontSize: 22, fontWeight: 800, color: NAVY, margin: '0 0 8px', letterSpacing: '-0.3px' }}>
                What best describes you?
              </h2>
              <p style={{ fontFamily: F, fontSize: 14, color: TX2, margin: '0 0 28px', lineHeight: 1.6 }}>
                This helps us show the right features for your workflow.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
                {[
                  {
                    value: 'employer',
                    title: 'Direct Employer',
                    desc: 'I hire for my own company or team.',
                    icon: (
                      <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                        <rect x={2} y={7} width={20} height={14} rx={2}/>
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                      </svg>
                    ),
                  },
                  {
                    value: 'agency',
                    title: 'Recruitment Agency',
                    desc: 'I place candidates with client businesses.',
                    icon: (
                      <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx={9} cy={7} r={4}/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                      </svg>
                    ),
                  },
                ].map(opt => {
                  const active = accountType === opt.value
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setAccountType(opt.value)}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 16,
                        padding: '18px 20px', borderRadius: 12, border: 'none', cursor: 'pointer', textAlign: 'left',
                        background: active ? TEALLT : '#f8fafc',
                        outline: `2px solid ${active ? TEAL : '#e2e8f0'}`,
                        outlineOffset: -2,
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{
                        width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                        background: active ? `${TEAL}20` : '#e2e8f0',
                        color: active ? TEAL : TX3,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {opt.icon}
                      </div>
                      <div>
                        <div style={{ fontFamily: F, fontSize: 15, fontWeight: 700, color: active ? TEALD : TX, marginBottom: 3 }}>
                          {opt.title}
                          {active && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: TEAL, background: `${TEAL}18`, padding: '1px 7px', borderRadius: 50 }}>Selected</span>}
                        </div>
                        <div style={{ fontFamily: F, fontSize: 13.5, color: TX2 }}>{opt.desc}</div>
                      </div>
                    </button>
                  )
                })}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setStep(1)}
                  style={{
                    padding: '12px 20px', borderRadius: 9, border: `1.5px solid ${BD}`,
                    background: 'transparent', color: TX2, fontFamily: F, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  style={{
                    flex: 1, padding: '12px 0', borderRadius: 9, border: 'none',
                    background: `linear-gradient(135deg, ${TEAL}, ${TEALD})`,
                    color: NAVY, fontFamily: F, fontSize: 14.5, fontWeight: 800, cursor: 'pointer',
                  }}
                >
                  Continue →
                </button>
              </div>
              <div style={{ marginTop: 12, fontFamily: F, fontSize: 11.5, color: TX3, textAlign: 'center' }}>Step 2 of 3</div>
            </div>
          )}

          {/* Step 3: Create first assessment */}
          {step === 3 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 64, height: 64, borderRadius: 16, background: TEALLT,
                border: `1px solid ${TEAL}44`, display: 'flex', alignItems: 'center',
                justifyContent: 'center', margin: '0 auto 20px',
              }}>
                <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={TEALD} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <h2 style={{ fontFamily: F, fontSize: 22, fontWeight: 800, color: NAVY, margin: '0 0 10px', letterSpacing: '-0.3px' }}>
                You're ready to go!
              </h2>
              <p style={{ fontFamily: F, fontSize: 14.5, color: TX2, margin: '0 0 32px', lineHeight: 1.7 }}>
                Create your first assessment and start inviting candidates. It only takes a couple of minutes.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  onClick={() => finishAndClose(true)}
                  disabled={saving}
                  style={{
                    width: '100%', padding: '13px 0', borderRadius: 10, border: 'none',
                    background: saving ? '#a8d5d4' : `linear-gradient(135deg, ${TEAL}, ${TEALD})`,
                    color: NAVY, fontFamily: F, fontSize: 15, fontWeight: 800,
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? 'Setting up…' : 'Create first assessment →'}
                </button>
                <button
                  onClick={() => finishAndClose(false)}
                  disabled={saving}
                  style={{
                    width: '100%', padding: '11px 0', borderRadius: 10,
                    border: `1.5px solid ${BD}`, background: 'transparent',
                    color: TX2, fontFamily: F, fontSize: 13.5, fontWeight: 600,
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  Explore the dashboard first
                </button>
              </div>
              <div style={{ marginTop: 12, fontFamily: F, fontSize: 11.5, color: TX3 }}>Step 3 of 3</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import ProdictaLogo from './ProdictaLogo'
import { NAVY, TEAL, TEALD, TEALLT, BD, TX, TX2, TX3, F, FM } from '../lib/constants'
import { getJourneySteps } from '../lib/journey-steps'

// ── Onboarding Wizard ─────────────────────────────────────────────────────────
// Shows once after first sign-up. 3 steps: Welcome → Account type → Journey
// explainer (also acts as the "ready to go" CTA, replacing the previous
// generic ready screen so the new user sees the six-step PRODICTA workflow
// before they encounter the same indicator on their dashboard).

// Prospect-friendly descriptions, paired by step id. Lives next to the
// wizard rather than in lib/journey-steps so the dashboard indicator
// stays compact while the wizard can use longer narrative copy.
const EXPLAINER_COPY = {
  'create-role':                    'Where you create roles, write job descriptions, and prepare assessments to send to candidates.',
  'screen-candidates':              'Where candidates take their assessment and PRODICTA’s AI analyses their responses against the role.',
  'send-to-client':                 'Where you send shortlisted candidates to your client, with proof, evidence, and a Highlight Reel.',
  'make-hiring-decision':           'Where you make hiring decisions based on the assessment evidence and your own judgment.',
  'make-placement-decision':        'Where you make placement decisions based on the assessment evidence and your own judgment.',
  'track-placement':                'Where you protect your placement, track rebate periods, monitor placement health, and catch risk before it becomes a problem.',
  'track-assignment':               'Where you keep assignments running smoothly, track performance, address issues, and maintain client confidence.',
  'track-placement-assignment':     'Where you protect placements and assignments, track rebate periods, monitor health, and catch risk early.',
  'track-probation':                'Where you guide new hires through probation, track ERA 2025 compliance, monitor health, and catch risk before it becomes a problem.',
  'track-probation-assignment':     'Where you guide new hires and keep temps performing, track probation, ERA 2025 compliance, and operational health.',
  'fix-risk':                       'Where PRODICTA flags risks and recommends interventions to keep placements on track.',
  'document-outcome':               'Where every assessment, decision, and outcome is documented for compliance and audit.',
}

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
        background: '#fff', borderRadius: 20, width: '100%',
        maxWidth: step === 3 ? 640 : 500,
        maxHeight: 'calc(100vh - 48px)', overflowY: 'auto',
        boxShadow: '0 32px 80px rgba(0,0,0,0.3)',
        position: 'relative',
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
                    title: 'HR & Direct Employer',
                    desc: 'I hire for my own company or team, or run an internal HR function.',
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

          {/* Step 3: Journey explainer.
              Shows the six-step PRODICTA workflow tailored to the
              account type captured in step 2. Replaces the previous
              generic "ready to go" screen so the new user sees the
              same six steps they will encounter on their dashboard
              (commit 26735bb). employment_type is not captured in
              this wizard yet, so getJourneySteps falls through to
              the 'permanent' default; the dashboard indicator picks
              up any later change from settings automatically. */}
          {step === 3 && (() => {
            const steps = getJourneySteps(accountType, undefined)
            return (
              <div>
                <div style={{ textAlign: 'center', marginBottom: 22 }}>
                  <h2 style={{ fontFamily: F, fontSize: 22, fontWeight: 800, color: NAVY, margin: '0 0 8px', letterSpacing: '-0.3px' }}>
                    Here is how PRODICTA works
                  </h2>
                  <p style={{ fontFamily: F, fontSize: 14, color: TX2, margin: 0, lineHeight: 1.6 }}>
                    Six steps that turn good candidates into protected placements.
                  </p>
                </div>

                <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                  {steps.map((s, i) => (
                    <li key={s.id} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 14,
                      padding: '12px 14px', borderRadius: 10,
                      background: '#f8fafc', border: `1px solid ${BD}`, borderLeft: `3px solid ${TEAL}`,
                    }}>
                      <span aria-hidden style={{
                        width: 26, height: 26, borderRadius: '50%',
                        background: TEAL, color: '#fff',
                        fontFamily: FM, fontSize: 13, fontWeight: 800,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>{i + 1}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: F, fontSize: 14, fontWeight: 800, color: NAVY, marginBottom: 2 }}>
                          {s.label}
                        </div>
                        <div style={{ fontFamily: F, fontSize: 13, color: TX2, lineHeight: 1.55 }}>
                          {EXPLAINER_COPY[s.id] || ''}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>

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
                    {saving ? 'Setting up…' : 'Create your first role →'}
                  </button>
                  <button
                    onClick={() => finishAndClose(false)}
                    disabled={saving}
                    style={{
                      background: 'none', border: 'none', padding: '4px 0',
                      color: TX2, fontFamily: F, fontSize: 13, fontWeight: 600,
                      cursor: saving ? 'not-allowed' : 'pointer',
                      textDecoration: 'underline', textAlign: 'center',
                    }}
                  >
                    Or take me to my dashboard
                  </button>
                </div>
                <div style={{ marginTop: 12, fontFamily: F, fontSize: 11.5, color: TX3, textAlign: 'center' }}>Step 3 of 3</div>
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}

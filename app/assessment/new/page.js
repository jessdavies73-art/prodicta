'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { Ic } from '@/components/Icons'
import { useToast } from '@/components/ToastProvider'

const F = "'Outfit',system-ui,sans-serif"
const FM = "'IBM Plex Mono',monospace"

const SKILLS = ['Communication', 'Problem solving', 'Prioritisation', 'Leadership']

const GEN_STEPS = [
  'Analysing role requirements…',
  'Generating work scenarios…',
  'Tailoring to your role…',
  'Finalising simulations…',
]

function GeneratingLoader() {
  const [step, setStep]       = useState(0)
  const [progress, setProgress] = useState(8)
  const stepRef = useRef(0)

  useEffect(() => {
    const id = setInterval(() => {
      stepRef.current = Math.min(stepRef.current + 1, GEN_STEPS.length - 1)
      setStep(stepRef.current)
      setProgress(Math.min(8 + stepRef.current * 24, 88))
    }, 2400)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{ padding: '12px 0', textAlign: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 18 }}>
        <div style={{
          width: 20, height: 20,
          border: '2.5px solid #e0f2f0',
          borderTopColor: '#00BFA5',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          flexShrink: 0,
        }} />
        <span style={{ fontSize: 14.5, color: '#009688', fontWeight: 700, fontFamily: F, minWidth: 240, textAlign: 'left' }}>
          {GEN_STEPS[step]}
        </span>
      </div>
      <div style={{ height: 5, borderRadius: 99, background: '#e4e9f0', overflow: 'hidden', maxWidth: 320, margin: '0 auto' }}>
        <div style={{
          height: '100%', borderRadius: 99,
          background: 'linear-gradient(90deg, #00BFA5, #009688)',
          width: `${progress}%`,
          transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1)',
        }} />
      </div>
    </div>
  )
}

function detectRoleType(jd) {
  const t = jd.toLowerCase()
  if (/sales|revenue|pipeline/.test(t)) return 'Sales'
  if (/marketing|campaign|brand/.test(t)) return 'Marketing'
  if (/engineer|developer|software/.test(t)) return 'Engineering'
  return 'General'
}

function wordCount(text) {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length
}

const roleTypeBadgeStyle = type => {
  const map = {
    Sales:       { background: '#ecfdf5', color: '#16a34a' },
    Marketing:   { background: '#fffbeb', color: '#d97706' },
    Engineering: { background: '#e0f2f0', color: '#009688' },
    General:     { background: '#f1f5f9', color: '#5e6b7f' },
  }
  return map[type] || map.General
}

export default function NewAssessmentPage() {
  const router = useRouter()
  const toast = useToast()
  const [companyName, setCompanyName] = useState('')
  const [roleTitle, setRoleTitle] = useState('')
  const [jd, setJd] = useState('')
  const [weights, setWeights] = useState({ Communication: 25, 'Problem solving': 25, Prioritisation: 25, Leadership: 25 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [atLimit, setAtLimit] = useState(false)
  const [limitInfo, setLimitInfo] = useState({ used: 0, limit: 10 })

  // Templates
  const [templates, setTemplates] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [saveAsTemplate, setSaveAsTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [rapidMode, setRapidMode] = useState(false)

  // Context questions
  const [contextQuestions, setContextQuestions] = useState([])
  const [contextAnswers, setContextAnswers] = useState({})
  const [generatingContext, setGeneratingContext] = useState(false)
  const [contextError, setContextError] = useState('')

  useEffect(() => {
    const PLAN_LIMITS = { starter: 10, growth: 30, scale: null, founding: null }
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase.from('users').select('company_name, plan').eq('id', user.id).single()
      if (profile?.company_name) setCompanyName(profile.company_name)

      // Check monthly usage limit
      const planKey = (profile?.plan || 'starter').toLowerCase()
      const planLimit = PLAN_LIMITS[planKey] ?? PLAN_LIMITS.starter
      if (planLimit !== null) {
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const { count } = await supabase.from('assessments')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', startOfMonth)
        const used = count || 0
        setLimitInfo({ used, limit: planLimit })
        if (used >= planLimit) setAtLimit(true)
      }

      // Load saved templates
      const { data: tmpl } = await supabase
        .from('assessments')
        .select('id, template_name, role_title, job_description, skill_weights')
        .eq('user_id', user.id)
        .eq('is_template', true)
        .order('created_at', { ascending: false })
      setTemplates(tmpl || [])
    }
    init()
  }, [router])

  function applyTemplate(templateId) {
    const tmpl = templates.find(t => t.id === templateId)
    if (!tmpl) return
    setRoleTitle(tmpl.role_title || '')
    setJd(tmpl.job_description || '')
    if (tmpl.skill_weights) setWeights(tmpl.skill_weights)
    setSelectedTemplate(templateId)
  }

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0)
  const words = wordCount(jd)
  const roleType = jd.length > 0 ? detectRoleType(jd) : null
  const canGenerate = roleTitle.trim().length > 0 && jd.length >= 50 && totalWeight === 100

  const setWeight = (skill, val) => {
    const n = Math.max(0, Math.min(100, Number(val)))
    setWeights(prev => ({ ...prev, [skill]: n }))
  }

  const resetEqual = () => setWeights({ Communication: 25, 'Problem solving': 25, Prioritisation: 25, Leadership: 25 })

  const handleGenerateContextQs = async () => {
    setContextError('')
    setGeneratingContext(true)
    setContextQuestions([])
    setContextAnswers({})
    try {
      const res = await fetch('/api/assessment/context-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_title: roleTitle, job_description: jd }),
      })
      const data = await res.json()
      if (data.questions) setContextQuestions(data.questions)
      else setContextError(data.error || 'Failed to generate questions.')
    } catch {
      setContextError('Something went wrong. Please try again.')
    } finally {
      setGeneratingContext(false)
    }
  }

  const handleGenerate = async () => {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/assessment/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role_title: roleTitle,
          job_description: jd,
          skill_weights: weights,
          save_as_template: saveAsTemplate,
          template_name: saveAsTemplate ? (templateName.trim() || roleTitle.trim()) : undefined,
          context_answers: Object.keys(contextAnswers).length > 0 ? contextAnswers : undefined,
          assessment_mode: rapidMode ? 'rapid' : 'standard',
        })
      })
      const data = await res.json()
      if (data.id) { toast('Assessment created'); router.push(`/assessment/${data.id}`) }
      else setError(data.error || 'Failed to generate')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const badgeStyle = roleTypeBadgeStyle(roleType)

  if (atLimit) {
    return (
      <div style={{ fontFamily: F, background: '#f7f9fb', minHeight: '100vh' }}>
        <Sidebar companyName={companyName} />
        <main style={{ marginLeft: 220, padding: '32px 40px', minHeight: '100vh', background: '#f7f9fb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ maxWidth: 480, width: '100%', background: '#fff', borderRadius: 16, padding: '40px 40px', boxShadow: '0 2px 16px rgba(15,33,55,0.08)', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: '#fffbeb', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1={12} y1={9} x2={12} y2={13}/><line x1={12} y1={17} x2="12.01" y2={17}/>
              </svg>
            </div>
            <h2 style={{ fontFamily: F, fontSize: 21, fontWeight: 800, color: '#0f2137', margin: '0 0 10px' }}>
              Assessment limit reached
            </h2>
            <p style={{ fontFamily: F, fontSize: 14, color: '#5e6b7f', margin: '0 0 6px', lineHeight: 1.65 }}>
              You've used <strong>{limitInfo.used} of {limitInfo.limit}</strong> assessments this month.
            </p>
            <p style={{ fontFamily: F, fontSize: 14, color: '#5e6b7f', margin: '0 0 28px', lineHeight: 1.65 }}>
              Upgrade your plan to continue creating assessments.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <a
                href="mailto:hello@prodicta.co.uk?subject=Upgrade my plan"
                style={{
                  display: 'block', padding: '12px 0', borderRadius: 10,
                  background: '#00BFA5', color: '#0f2137', fontFamily: F, fontSize: 14.5, fontWeight: 800,
                  textDecoration: 'none', textAlign: 'center',
                }}
              >
                Upgrade my plan →
              </a>
              <button
                onClick={() => router.push('/dashboard')}
                style={{ padding: '11px 0', borderRadius: 10, border: '1.5px solid #e4e9f0', background: 'transparent', color: '#5e6b7f', fontFamily: F, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}
              >
                Back to dashboard
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: F, background: '#f7f9fb', minHeight: '100vh' }}>
      <Sidebar companyName={companyName} />
      <main style={{ marginLeft: 220, padding: '32px 40px', minHeight: '100vh', background: '#f7f9fb' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 36, height: 36, borderRadius: 8, border: '1px solid #e4e9f0',
              background: '#fff', cursor: 'pointer', color: '#5e6b7f', flexShrink: 0
            }}
          >
            <Ic name="arrow-left" size={18} />
          </button>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#0f172a', fontFamily: F }}>
            New Assessment
          </h1>
        </div>

        {/* Templates dropdown */}
        {templates.length > 0 && (
          <div style={{
            background: '#fff', borderRadius: 14, border: '1px solid #e4e9f0',
            padding: '20px 28px', marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Ic name="file" size={16} color="#009688" />
              <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
                Start from a template
              </span>
            </div>
            <select
              value={selectedTemplate}
              onChange={e => applyTemplate(e.target.value)}
              style={{
                flex: 1, minWidth: 200, padding: '9px 13px',
                borderRadius: 8, border: '1px solid #e4e9f0',
                fontSize: 14, fontFamily: F, color: '#0f172a',
                background: '#fff', outline: 'none', cursor: 'pointer',
              }}
            >
              <option value="">Choose a saved template…</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.template_name || t.role_title}
                </option>
              ))}
            </select>
            {selectedTemplate && (
              <button
                onClick={() => {
                  setSelectedTemplate('')
                  setRoleTitle('')
                  setJd('')
                  resetEqual()
                }}
                style={{
                  fontSize: 12, fontWeight: 600, color: '#94a1b3',
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '4px 8px', fontFamily: F,
                }}
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* Card 1: Role details */}
        <div style={{
          background: '#fff', borderRadius: 14, border: '1px solid #e4e9f0',
          padding: '28px 32px', marginBottom: 24
        }}>
          <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#0f172a', fontFamily: F }}>
            Role details
          </h2>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 6 }}>
              Role title
            </label>
            <input
              type="text"
              value={roleTitle}
              onChange={e => setRoleTitle(e.target.value)}
              placeholder="e.g. Senior Account Manager"
              style={{
                width: '100%', boxSizing: 'border-box', padding: '10px 14px',
                borderRadius: 8, border: '1px solid #e4e9f0', fontSize: 14,
                color: '#0f172a', fontFamily: F, background: '#fff', outline: 'none',
                transition: 'border-color 0.15s'
              }}
              onFocus={e => e.target.style.borderColor = '#00BFA5'}
              onBlur={e => e.target.style.borderColor = '#e4e9f0'}
            />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                Job description
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {roleType && (
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 20,
                    background: badgeStyle.background, color: badgeStyle.color, fontFamily: F
                  }}>
                    {roleType}
                  </span>
                )}
                <span style={{ fontSize: 12, color: '#94a1b3', fontFamily: FM }}>
                  {words} word{words !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <textarea
              rows={8}
              value={jd}
              onChange={e => setJd(e.target.value)}
              placeholder="Paste the job description here…"
              style={{
                width: '100%', boxSizing: 'border-box', padding: '10px 14px',
                borderRadius: 8, border: '1px solid #e4e9f0', fontSize: 14,
                color: '#0f172a', fontFamily: F, background: '#fff', outline: 'none',
                resize: 'vertical', lineHeight: 1.6, transition: 'border-color 0.15s'
              }}
              onFocus={e => e.target.style.borderColor = '#00BFA5'}
              onBlur={e => e.target.style.borderColor = '#e4e9f0'}
            />
            {jd.length > 0 && jd.length < 50 && (
              <p style={{ margin: '6px 0 0', fontSize: 12, color: '#dc2626' }}>
                Please enter at least 50 characters in the job description.
              </p>
            )}
          </div>

          {/* Context questions */}
          {jd.length >= 50 && roleTitle.trim().length > 0 && (
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #f1f5f9' }}>
              {contextQuestions.length === 0 ? (
                <div>
                  <button
                    onClick={handleGenerateContextQs}
                    disabled={generatingContext}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      padding: '9px 18px', borderRadius: 8,
                      border: '1.5px solid #00BFA5', background: '#f0fdf8',
                      color: '#009688', fontSize: 13.5, fontWeight: 700,
                      fontFamily: F, cursor: generatingContext ? 'not-allowed' : 'pointer',
                      opacity: generatingContext ? 0.65 : 1,
                      transition: 'background 0.15s',
                    }}
                  >
                    {generatingContext ? (
                      <>
                        <div style={{
                          width: 14, height: 14,
                          border: '2px solid #a7f3d0',
                          borderTopColor: '#009688',
                          borderRadius: '50%',
                          animation: 'spin 0.8s linear infinite',
                          flexShrink: 0,
                        }} />
                        Generating questions...
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#009688" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                        Generate context questions
                      </>
                    )}
                  </button>
                  <p style={{ margin: '8px 0 0', fontSize: 12, color: '#94a1b3', fontFamily: F }}>
                    Optional. Let the AI ask 3-5 short follow-up questions to help build more accurate scenarios.
                  </p>
                  {contextError && (
                    <p style={{ margin: '6px 0 0', fontSize: 12.5, color: '#dc2626', fontFamily: F }}>{contextError}</p>
                  )}
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#009688" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                      </svg>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a', fontFamily: F }}>Help us understand the role better</span>
                      <span style={{ fontSize: 12, color: '#94a1b3', fontFamily: F }}>(all optional)</span>
                    </div>
                    <button
                      onClick={() => { setContextQuestions([]); setContextAnswers({}) }}
                      style={{ fontSize: 12, color: '#94a1b3', background: 'none', border: 'none', cursor: 'pointer', fontFamily: F, padding: '4px 8px' }}
                    >
                      Clear
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {contextQuestions.map((q, i) => (
                      <div key={i}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0f2137', marginBottom: 6, fontFamily: F }}>
                          {q}
                        </label>
                        <input
                          type="text"
                          value={contextAnswers[i] || ''}
                          onChange={e => setContextAnswers(prev => ({ ...prev, [i]: e.target.value }))}
                          placeholder="Your answer (optional)..."
                          style={{
                            width: '100%', boxSizing: 'border-box',
                            padding: '9px 13px', borderRadius: 8,
                            border: '1px solid #e4e9f0', fontSize: 13.5,
                            color: '#0f172a', fontFamily: F, background: '#fff',
                            outline: 'none', transition: 'border-color 0.15s',
                          }}
                          onFocus={e => e.target.style.borderColor = '#00BFA5'}
                          onBlur={e => e.target.style.borderColor = '#e4e9f0'}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Card 2: Skill weights */}
        <div style={{
          background: '#fff', borderRadius: 14, border: '1px solid #e4e9f0',
          padding: '28px 32px', marginBottom: 24
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
            <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: '#0f172a', fontFamily: F }}>
              Skill weights
            </h2>
            <button
              onClick={resetEqual}
              style={{
                fontSize: 12, fontWeight: 600, color: '#009688', background: 'none',
                border: '1px solid #00BFA5', borderRadius: 7, padding: '5px 12px',
                cursor: 'pointer', fontFamily: F
              }}
            >
              Reset to equal
            </button>
          </div>
          <p style={{ margin: '0 0 24px', fontSize: 13, color: '#5e6b7f', lineHeight: 1.5 }}>
            Adjust how each skill is weighted in the overall score. Weights must total 100%.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {SKILLS.map(skill => (
              <div key={skill}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <label style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', fontFamily: F }}>
                    {skill}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={weights[skill]}
                    onChange={e => setWeight(skill, e.target.value)}
                    style={{
                      width: 64, padding: '5px 8px', borderRadius: 7, border: '1px solid #e4e9f0',
                      fontSize: 14, fontFamily: FM, color: '#0f172a', textAlign: 'right',
                      outline: 'none', background: '#f7f9fb'
                    }}
                  />
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={weights[skill]}
                  onChange={e => setWeight(skill, e.target.value)}
                  style={{ width: '100%', accentColor: '#00BFA5', cursor: 'pointer' }}
                />
              </div>
            ))}
          </div>

          <div style={{
            marginTop: 20, padding: '10px 14px', borderRadius: 8,
            background: totalWeight === 100 ? '#ecfdf5' : '#fef2f2',
            display: 'inline-flex', alignItems: 'center', gap: 6
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: totalWeight === 100 ? '#16a34a' : '#dc2626', fontFamily: FM }}>
              Total: {totalWeight}%
            </span>
            {totalWeight !== 100 && (
              <span style={{ fontSize: 12, color: '#dc2626' }}>
                Must equal 100%
              </span>
            )}
          </div>
        </div>

        {/* Save as template */}
        <div style={{
          background: '#fff', borderRadius: 14, border: '1px solid #e4e9f0',
          padding: '20px 28px', marginBottom: 20,
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={saveAsTemplate}
              onChange={e => setSaveAsTemplate(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: '#00BFA5', cursor: 'pointer' }}
            />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', fontFamily: F }}>
              Save as template
            </span>
            <span style={{ fontSize: 13, color: '#94a1b3' }}>
              Reuse this JD and weights for future assessments
            </span>
          </label>

          {saveAsTemplate && (
            <div style={{ marginTop: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 6 }}>
                Template name (optional)
              </label>
              <input
                type="text"
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                placeholder={roleTitle.trim() || 'e.g. Standard Sales Manager template'}
                style={{
                  width: '100%', maxWidth: 400, boxSizing: 'border-box',
                  padding: '9px 13px', borderRadius: 8, border: '1px solid #e4e9f0',
                  fontSize: 14, fontFamily: F, color: '#0f172a', outline: 'none',
                }}
                onFocus={e => e.target.style.borderColor = '#00BFA5'}
                onBlur={e => e.target.style.borderColor = '#e4e9f0'}
              />
            </div>
          )}
        </div>

        {/* Rapid Assessment toggle */}
        <div style={{
          background: rapidMode ? '#fffbeb' : '#fff',
          borderRadius: 14,
          border: `1.5px solid ${rapidMode ? '#fcd34d' : '#e4e9f0'}`,
          padding: '20px 28px', marginBottom: 20,
          transition: 'border-color 0.15s, background 0.15s',
        }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 14, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={rapidMode}
              onChange={e => setRapidMode(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: '#d97706', cursor: 'pointer', marginTop: 2, flexShrink: 0 }}
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', fontFamily: F }}>
                  Rapid Assessment (15 minutes)
                </span>
                <span style={{
                  fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                  background: '#fffbeb', color: '#d97706', border: '1px solid #fcd34d', fontFamily: F
                }}>
                  2 scenarios
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: '#5e6b7f', lineHeight: 1.55, fontFamily: F }}>
                Generates 2 focused scenarios instead of 4, targeted at the highest-priority skills in the JD.
                The report will include overall score, top risk, hiring confidence, candidate type, and the single most important interview question.
                Flagged clearly as a Rapid Assessment on all reports.
              </p>
            </div>
          </label>
        </div>

        {/* Generate button */}
        {error && (
          <div style={{
            marginBottom: 16, padding: '12px 16px', borderRadius: 8,
            background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 14
          }}>
            {error}
          </div>
        )}

        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e4e9f0', padding: '24px 32px' }}>
          {loading ? (
            <GeneratingLoader />
          ) : (
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              style={{
                width: '100%', padding: '14px 0', borderRadius: 10, border: 'none',
                background: canGenerate ? '#00BFA5' : '#e4e9f0',
                color: canGenerate ? '#fff' : '#94a1b3',
                fontSize: 16, fontWeight: 700, fontFamily: F,
                cursor: canGenerate ? 'pointer' : 'not-allowed',
                transition: 'background 0.15s, color 0.15s'
              }}
            >
              Generate simulations
            </button>
          )}
        </div>
      </main>
    </div>
  )
}

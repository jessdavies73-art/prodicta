'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { Ic } from '@/components/Icons'

const F = "'Outfit',system-ui,sans-serif"
const FM = "'IBM Plex Mono',monospace"

const SKILLS = ['Communication', 'Problem solving', 'Prioritisation', 'Leadership']

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
    Engineering: { background: '#e8f6f5', color: '#2BB5AF' },
    General:     { background: '#f1f5f9', color: '#5e6b7f' },
  }
  return map[type] || map.General
}

export default function NewAssessmentPage() {
  const router = useRouter()
  const [companyName, setCompanyName] = useState('')
  const [roleTitle, setRoleTitle] = useState('')
  const [jd, setJd] = useState('')
  const [weights, setWeights] = useState({ Communication: 25, 'Problem solving': 25, Prioritisation: 25, Leadership: 25 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Templates
  const [templates, setTemplates] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [saveAsTemplate, setSaveAsTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase.from('profiles').select('company_name').eq('id', user.id).single()
      if (profile?.company_name) setCompanyName(profile.company_name)

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
        })
      })
      const data = await res.json()
      if (data.id) router.push(`/assessment/${data.id}`)
      else setError(data.error || 'Failed to generate')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const badgeStyle = roleTypeBadgeStyle(roleType)

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
              <Ic name="file" size={16} color="#2BB5AF" />
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
              onFocus={e => e.target.style.borderColor = '#3DD6D0'}
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
              onFocus={e => e.target.style.borderColor = '#3DD6D0'}
              onBlur={e => e.target.style.borderColor = '#e4e9f0'}
            />
            {jd.length > 0 && jd.length < 50 && (
              <p style={{ margin: '6px 0 0', fontSize: 12, color: '#dc2626' }}>
                Please enter at least 50 characters in the job description.
              </p>
            )}
          </div>
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
                fontSize: 12, fontWeight: 600, color: '#2BB5AF', background: 'none',
                border: '1px solid #3DD6D0', borderRadius: 7, padding: '5px 12px',
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
                  style={{ width: '100%', accentColor: '#3DD6D0', cursor: 'pointer' }}
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
              style={{ width: 16, height: 16, accentColor: '#3DD6D0', cursor: 'pointer' }}
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
                onFocus={e => e.target.style.borderColor = '#3DD6D0'}
                onBlur={e => e.target.style.borderColor = '#e4e9f0'}
              />
            </div>
          )}
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '8px 0' }}>
              <div style={{
                width: 22, height: 22, border: '3px solid #e8f6f5',
                borderTopColor: '#3DD6D0', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }} />
              <span style={{ fontSize: 15, color: '#2BB5AF', fontWeight: 600, fontFamily: F }}>
                Generating your work simulations with AI…
              </span>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              style={{
                width: '100%', padding: '14px 0', borderRadius: 10, border: 'none',
                background: canGenerate ? '#3DD6D0' : '#e4e9f0',
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

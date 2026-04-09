'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

const NAVY = '#0f2137'
const TEAL = '#00bfa5'
const TEALD = '#007f70'
const TEALLT = '#e6fffa'
const BD = '#e2e8f0'
const TX = '#1a202c'
const TX2 = '#2d3748'
const TX3 = '#64748b'
const AMB = '#d97706'
const F = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif'

const KEY_WEEKS = new Set([4, 9, 13, 22, 25])

export default function CoachingPlanFullPage({ params }) {
  const [loading, setLoading] = useState(true)
  const [candidate, setCandidate] = useState(null)
  const [results, setResults] = useState(null)

  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      const [{ data: c }, { data: r }] = await Promise.all([
        supabase.from('candidates').select('*, assessments(role_title, job_description)').eq('id', params.candidateId).single(),
        supabase.from('results').select('*').eq('candidate_id', params.candidateId).maybeSingle(),
      ])
      setCandidate(c)
      setResults(r)
      setLoading(false)
    })()
  }, [params.candidateId])

  if (loading) return <div style={{ fontFamily: F, padding: 40 }}>Loading coaching plan, </div>
  if (!results?.coaching_plan) return <div style={{ fontFamily: F, padding: 40 }}>No coaching plan available for this candidate yet.</div>

  const cp = results.coaching_plan
  const phases = [cp.phase1, cp.phase2, cp.phase3].filter(Boolean)

  return (
    <div style={{ fontFamily: F, color: TX, background: '#fff', minHeight: '100vh' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff; }
          .phase-block { break-inside: avoid; }
        }
      `}</style>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 48px' }}>
        <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
          <button onClick={() => window.print()} style={{ fontWeight: 700, color: '#fff', background: NAVY, padding: '10px 18px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>Print</button>
        </div>

        <div style={{ borderBottom: `3px solid ${NAVY}`, paddingBottom: 18, marginBottom: 24 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: NAVY, letterSpacing: '0.05em' }}>PRODICTA</div>
          <div style={{ fontSize: 13, color: TX3 }}>In partnership with Alchemy Training UK</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: NAVY, margin: '14px 0 4px' }}>90-Day Hiring Manager Coaching Plan</h1>
          <div style={{ fontSize: 15, color: TX2, fontWeight: 600 }}>{candidate?.name}{candidate?.assessments?.role_title ? `, ${candidate.assessments.role_title}` : ''}</div>
          <div style={{ fontSize: 12, color: TX3, marginTop: 6, fontStyle: 'italic' }}>Coaching plan content developed by Liz Harris, Founder, Alchemy Training UK.</div>
        </div>

        {phases.map((p, idx) => (
          <div key={idx} className="phase-block" style={{ marginBottom: 32, padding: 20, border: `1px solid ${BD}`, borderRadius: 10 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: NAVY, marginBottom: 2 }}>{p.title}</div>
            <div style={{ fontSize: 12, color: TX3, marginBottom: 14 }}>{p.days}</div>

            {Array.isArray(p.smart_objectives) && p.smart_objectives.length > 0 && (
              <Section title="SMART Objectives">
                {p.smart_objectives.map((o, i) => (
                  <div key={i} style={{ padding: '10px 14px', borderLeft: `3px solid ${TEAL}`, background: '#f8fafc', marginBottom: 8, borderRadius: '0 6px 6px 0' }}>
                    <div style={{ fontWeight: 700 }}>{o.objective}</div>
                    {o.measure && <div style={{ fontSize: 13, color: TX2 }}>Measure: {o.measure}</div>}
                    {o.deadline && <div style={{ fontSize: 13, color: TX2 }}>Deadline: {o.deadline}</div>}
                    {o.linked_to && <div style={{ fontSize: 12, color: TX3, fontStyle: 'italic' }}>Linked to: {o.linked_to}</div>}
                  </div>
                ))}
              </Section>
            )}

            {p.weekly_checkin_structure && <Section title="Weekly Check-in Structure"><p>{p.weekly_checkin_structure}</p></Section>}

            {Array.isArray(p.watch_out_guides) && p.watch_out_guides.length > 0 && (
              <Section title="Watch-out Guides">
                {p.watch_out_guides.map((w, i) => (
                  <div key={i} style={{ padding: '10px 14px', border: `1px solid ${BD}`, borderRadius: 6, marginBottom: 8 }}>
                    <div style={{ fontWeight: 700 }}>{w.watch_out}</div>
                    {w.what_to_look_for && <div style={{ fontSize: 13 }}>Look for: {w.what_to_look_for}</div>}
                    {w.when_likely && <div style={{ fontSize: 13 }}>When likely: {w.when_likely}</div>}
                    {w.what_to_do && <div style={{ fontSize: 13 }}>What to do: {w.what_to_do}</div>}
                  </div>
                ))}
              </Section>
            )}

            {p.key_reviews && <Section title="Key Reviews"><p>{p.key_reviews}</p></Section>}

            {Array.isArray(p.prediction_checks) && p.prediction_checks.length > 0 && (
              <Section title="Prediction Checks">
                {p.prediction_checks.map((pc, i) => (
                  <div key={i} style={{ marginBottom: 6, fontSize: 14 }}><strong>{pc.prediction}:</strong> {pc.question}</div>
                ))}
              </Section>
            )}

            {Array.isArray(p.sbi_feedback_prompts) && p.sbi_feedback_prompts.length > 0 && (
              <Section title="SBI Feedback Prompts">
                {p.sbi_feedback_prompts.map((s, i) => <div key={i} style={{ fontSize: 14 }}>, {s}</div>)}
              </Section>
            )}

            {Array.isArray(p.warning_signs) && p.warning_signs.length > 0 && (
              <Section title="Warning Signs">
                {p.warning_signs.map((s, i) => <div key={i} style={{ fontSize: 14 }}>, {s}</div>)}
              </Section>
            )}

            {p.decision_framework && <Section title="Decision Framework"><p>{p.decision_framework}</p></Section>}

            {Array.isArray(p.legal_defensibility_checklist) && p.legal_defensibility_checklist.length > 0 && (
              <Section title="Legal Defensibility Checklist">
                {p.legal_defensibility_checklist.map((s, i) => <div key={i} style={{ fontSize: 14 }}>[ ] {s}</div>)}
              </Section>
            )}

            {p.managers_declaration && <Section title="Manager's Declaration"><p style={{ fontStyle: 'italic' }}>{p.managers_declaration}</p></Section>}

            {p.era_2025_note && (
              <div style={{ padding: 12, background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 6, fontSize: 13, marginBottom: 12 }}>
                ERA 2025: {p.era_2025_note}
              </div>
            )}

            {p.recommended_training && (
              <div style={{ padding: 14, background: TEALLT, border: `1px solid ${TEAL}55`, borderRadius: 8, marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: TEALD, textTransform: 'uppercase', marginBottom: 4 }}>Recommended Training</div>
                <div style={{ fontWeight: 700, color: NAVY }}>{p.recommended_training.workshop}</div>
                {p.recommended_training.why && <div style={{ fontSize: 13, marginTop: 2 }}>Why: {p.recommended_training.why}</div>}
                {p.recommended_training.contents && <div style={{ fontSize: 13, marginTop: 2 }}>Contents: {p.recommended_training.contents}</div>}
              </div>
            )}

            {p.alchemy_checkin && (
              <div style={{ fontSize: 13, color: TX2 }}>
                Alchemy check-in: {p.alchemy_checkin} Contact Liz at liz@alchemytraininguk.com or alchemytraininguk.com.
              </div>
            )}
          </div>
        ))}

        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: NAVY, marginBottom: 10 }}>25-Week Progress Tracker</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                {['Week','Date','Progress Update','Achievements','Development Areas','Feedback','Actions'].map(h => (
                  <th key={h} style={{ border: `1px solid ${BD}`, padding: '6px 8px', textAlign: 'left', fontWeight: 700, color: NAVY }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 25 }, (_, i) => i + 1).map(w => {
                const key = KEY_WEEKS.has(w)
                return (
                  <tr key={w} style={{ background: key ? '#fff7ed' : '#fff' }}>
                    <td style={{ border: `1px solid ${BD}`, padding: '6px 8px', fontWeight: key ? 800 : 600, color: key ? AMB : NAVY }}>Week {w}{key ? ' (Key Review)' : ''}</td>
                    <td style={{ border: `1px solid ${BD}`, padding: '6px 8px', minHeight: 22 }}></td>
                    <td style={{ border: `1px solid ${BD}`, padding: '6px 8px' }}></td>
                    <td style={{ border: `1px solid ${BD}`, padding: '6px 8px' }}></td>
                    <td style={{ border: `1px solid ${BD}`, padding: '6px 8px' }}></td>
                    <td style={{ border: `1px solid ${BD}`, padding: '6px 8px' }}></td>
                    <td style={{ border: `1px solid ${BD}`, padding: '6px 8px' }}></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div style={{ marginBottom: 24, padding: 16, border: `1px solid ${BD}`, borderRadius: 10 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: NAVY, marginBottom: 10 }}>Alchemy Sign-Off Tracker</h2>
          {[1,2,3].map(n => (
            <div key={n} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 1fr', gap: 10, marginBottom: 8, fontSize: 13, alignItems: 'center' }}>
              <div style={{ fontWeight: 700, color: NAVY }}>Phase {n}</div>
              <div>Completed: _______</div>
              <div>Date: _______</div>
              <div>Signed off by: _______</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 11, color: TX3, textAlign: 'center', borderTop: `1px solid ${BD}`, paddingTop: 14 }}>
          Provided by PRODICTA in partnership with Alchemy Training UK. Coaching plan content developed by Liz Harris, Founder, Alchemy Training UK. Contact: liz@alchemytraininguk.com, alchemytraininguk.com
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 14, color: TX2, lineHeight: 1.6 }}>{children}</div>
    </div>
  )
}

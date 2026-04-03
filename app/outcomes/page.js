'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { Ic } from '@/components/Icons'
import {
  NAVY, TEAL, TEALD, TEALLT, BG, CARD, BD, TX, TX2, TX3,
  GRN, GRNBG, GRNBD, AMB, AMBBG, AMBBD, RED, REDBG, REDBD,
  F, FM, cs,
} from '@/lib/constants'

const OUTCOME_LABELS = {
  passed_probation: { label: 'Passed probation',      color: GRN,  bg: GRNBG,  bd: GRNBD },
  still_probation:  { label: 'Still in probation',    color: TEAL, bg: TEALLT, bd: `${TEAL}55` },
  failed_probation: { label: 'Failed probation',      color: RED,  bg: REDBG,  bd: REDBD },
  left_probation:   { label: 'Left during probation', color: AMB,  bg: AMBBG,  bd: AMBBD },
}

function OutcomeBadge({ outcome }) {
  const o = OUTCOME_LABELS[outcome]
  if (!o) return null
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 10px', borderRadius: 50,
      fontSize: 11.5, fontWeight: 700,
      background: o.bg, color: o.color, border: `1px solid ${o.bd}`,
      fontFamily: F, whiteSpace: 'nowrap',
    }}>
      {o.label}
    </span>
  )
}

function StatCard({ icon, label, value, sub, accent = TEAL }) {
  return (
    <div style={{ ...cs, flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: TX2, fontFamily: F }}>{label}</span>
        <div style={{
          width: 34, height: 34, borderRadius: 9, background: `${accent}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Ic name={icon} size={16} color={accent} />
        </div>
      </div>
      <div>
        <div style={{ fontSize: 34, fontWeight: 800, color: NAVY, fontFamily: FM, lineHeight: 1, letterSpacing: '-1px' }}>
          {value}
        </div>
        {sub && <div style={{ fontSize: 12, color: TX3, marginTop: 6, fontFamily: F }}>{sub}</div>}
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  const sh = { background: 'linear-gradient(90deg,#f0f4f8 25%,#e4eaf2 50%,#f0f4f8 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s ease infinite', borderRadius: 8 }
  return (
    <div style={{ display: 'flex' }}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <div style={{ marginLeft: 220, padding: '32px 40px', minHeight: '100vh', background: BG, flex: 1 }}>
        <div style={{ ...sh, width: 200, height: 32, marginBottom: 32 }} />
        <div style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
          {[1,2,3,4].map(i => <div key={i} style={{ flex: 1, ...sh, height: 110 }} />)}
        </div>
        <div style={{ ...sh, height: 240 }} />
      </div>
    </div>
  )
}

export default function OutcomesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [outcomes, setOutcomes] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }

        const { data: prof } = await supabase.from('users').select('*').eq('id', user.id).single()
        setProfile(prof)

        const { data: oc, error: ocErr } = await supabase
          .from('candidate_outcomes')
          .select('*, candidates(name, email, assessments(role_title))')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (ocErr) throw ocErr
        setOutcomes(oc || [])
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  if (loading) return <LoadingSkeleton />

  // ── Stats ─────────────────────────────────────────────────────────────────
  const total = outcomes.length
  const passed = outcomes.filter(o => o.outcome === 'passed_probation')
  const failed = outcomes.filter(o => o.outcome === 'failed_probation')
  const concluded = outcomes.filter(o => o.outcome === 'passed_probation' || o.outcome === 'failed_probation')
  const passRate = concluded.length > 0 ? Math.round((passed.length / concluded.length) * 100) : null

  // Score buckets for insight: find score threshold where pass rate is highest
  const withScores = outcomes.filter(o => o.score != null)
  const thresholds = [80, 75, 70, 65, 60]
  let bestInsight = null
  for (const t of thresholds) {
    const above = outcomes.filter(o => (o.score ?? 0) >= t)
    const abovePassed = above.filter(o => o.outcome === 'passed_probation')
    const aboveConcluded = above.filter(o => o.outcome === 'passed_probation' || o.outcome === 'failed_probation')
    if (aboveConcluded.length >= 3) {
      bestInsight = { threshold: t, rate: Math.round((abovePassed.length / aboveConcluded.length) * 100), n: aboveConcluded.length }
      break
    }
  }

  return (
    <div style={{ display: 'flex', fontFamily: F }}>
      <Sidebar active="outcomes" companyName={profile?.company_name} />
      <main style={{ marginLeft: 220, padding: '32px 40px', minHeight: '100vh', background: BG, flex: 1, minWidth: 0 }}>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: NAVY, letterSpacing: '-0.5px' }}>
            Hire Outcomes
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13.5, color: TX2 }}>
            Track how candidates perform after hiring to measure Prodicta's predictive accuracy.
          </p>
        </div>

        {error && (
          <div style={{ ...cs, background: REDBG, border: `1px solid ${REDBD}`, color: RED, marginBottom: 20 }}>
            {error}
          </div>
        )}

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
          <StatCard icon="check" label="Total hires tracked" value={total} sub="Outcomes logged" />
          <StatCard
            icon="award"
            label="Pass rate"
            value={passRate !== null ? `${passRate}%` : ','}
            sub={concluded.length > 0 ? `${concluded.length} concluded hires` : 'No concluded outcomes yet'}
            accent={passRate !== null ? (passRate >= 70 ? GRN : passRate >= 50 ? AMB : RED) : TEAL}
          />
          <StatCard
            icon="bar"
            label="Passed probation"
            value={passed.length}
            sub={`${failed.length} failed probation`}
            accent={GRN}
          />
          <StatCard
            icon="clock"
            label="In probation"
            value={outcomes.filter(o => o.outcome === 'still_probation').length}
            sub="Outcome pending"
            accent={AMB}
          />
        </div>

        {/* Insight card */}
        {bestInsight && (
          <div style={{
            ...cs,
            marginBottom: 24,
            background: `linear-gradient(135deg, ${TEALLT} 0%, #fff 60%)`,
            border: `1.5px solid ${TEAL}55`,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: TEAL, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Ic name="zap" size={20} color={NAVY} />
              </div>
              <div>
                <div style={{ fontFamily: F, fontSize: 15, fontWeight: 800, color: TX, marginBottom: 5 }}>
                  Predictive Insight
                </div>
                <p style={{ fontFamily: F, fontSize: 14, color: TX2, margin: 0, lineHeight: 1.7 }}>
                  Candidates hired with a Prodicta score of <strong style={{ color: TEALD }}>{bestInsight.threshold}+</strong> had a{' '}
                  <strong style={{ color: bestInsight.rate >= 70 ? GRN : bestInsight.rate >= 50 ? AMB : RED }}>
                    {bestInsight.rate}% pass rate
                  </strong>{' '}
                  ({bestInsight.n} concluded hires). This data will sharpen as you log more outcomes.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Outcomes table */}
        {total === 0 ? (
          <div style={{
            ...cs,
            textAlign: 'center', padding: '64px 24px',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: TEALLT, border: `2px solid ${TEAL}33`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <Ic name="award" size={28} color={TEALD} />
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: TX, marginBottom: 8 }}>No outcomes logged yet</div>
            <div style={{ fontSize: 13.5, color: TX2, lineHeight: 1.6, maxWidth: 320, margin: '0 auto' }}>
              After hiring a candidate, open their results page and click "Log Outcome" to track how they performed.
            </div>
          </div>
        ) : (
          <div style={{ background: CARD, borderRadius: 14, border: `1px solid ${BD}`, overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: `1px solid ${BD}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: TX, fontFamily: F }}>
                All Outcomes
                <span style={{ marginLeft: 10, fontSize: 12, fontWeight: 600, padding: '2px 9px', borderRadius: 20, background: BG, color: TX3 }}>
                  {total}
                </span>
              </h2>
            </div>

            {/* Table header */}
            <div style={{
              display: 'grid', gridTemplateColumns: profile?.account_type === 'agency' ? '2fr 1fr 1fr 1fr 1fr' : '2fr 1fr 1fr 1fr',
              padding: '10px 24px', background: BG, borderBottom: `1px solid ${BD}`,
            }}>
              {['Candidate', 'Role', ...(profile?.account_type === 'agency' ? ['Client'] : []), 'Outcome', 'Date'].map(col => (
                <div key={col} style={{ fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: F }}>
                  {col}
                </div>
              ))}
            </div>

            {outcomes.map((o, i) => {
              const cand = o.candidates
              return (
                <div
                  key={o.id}
                  style={{
                    display: 'grid', gridTemplateColumns: profile?.account_type === 'agency' ? '2fr 1fr 1fr 1fr 1fr' : '2fr 1fr 1fr 1fr',
                    padding: '14px 24px',
                    borderBottom: i < outcomes.length - 1 ? `1px solid ${BD}` : 'none',
                    alignItems: 'center',
                    background: CARD,
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = BG }}
                  onMouseLeave={e => { e.currentTarget.style.background = CARD }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: TX, fontFamily: F }}>{cand?.name || '-'}</div>
                    <div style={{ fontSize: 12, color: TX3, fontFamily: F }}>{cand?.email || ''}</div>
                  </div>
                  <div style={{ fontSize: 13, color: TX2, fontFamily: F }}>
                    {cand?.assessments?.role_title || '-'}
                  </div>
                  {profile?.account_type === 'agency' && (
                    <div style={{ fontSize: 13, color: TX2, fontFamily: F }}>
                      {o.client_name || <span style={{ color: TX3 }}>-</span>}
                    </div>
                  )}
                  <div>
                    <OutcomeBadge outcome={o.outcome} />
                  </div>
                  <div>
                    {o.outcome_date ? (
                      <span style={{ fontFamily: FM, fontSize: 12.5, color: TX3 }}>
                        {new Date(o.outcome_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: TX3 }}>-</span>
                    )}
                    {o.notes && (
                      <div style={{ fontSize: 11.5, color: TX3, marginTop: 2, fontStyle: 'italic', fontFamily: F }}>{o.notes}</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

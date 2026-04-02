'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DemoLayout, SignUpModal } from '@/components/DemoShell'
import { Ic } from '@/components/Icons'
import Avatar from '@/components/Avatar'
import { DEMO_CANDIDATES } from '@/lib/demo-data'
import { NAVY, TEAL, TEALD, TEALLT, BG, CARD, BD, TX, TX2, TX3, GRN, GRNBG, GRNBD, AMB, AMBBG, AMBBD, RED, REDBG, REDBD, F, FM, riskBg, riskCol } from '@/lib/constants'

const SHADOW = '0 2px 12px rgba(15,33,55,0.08)'

const archivedCandidates = DEMO_CANDIDATES.filter(c => c.status === 'archived')

function fmt(iso) {
  if (!iso) return ','
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function StarRating({ value }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <svg key={i} width={14} height={14} viewBox="0 0 24 24"
          fill={i <= value ? AMB : BD} stroke={i <= value ? AMB : BD} strokeWidth={1}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      ))}
    </div>
  )
}

export default function DemoArchivePage() {
  const router = useRouter()
  const [modal, setModal] = useState(false)

  return (
    <DemoLayout active="archive">
      {modal && <SignUpModal onClose={() => setModal(false)} />}
      <main style={{ marginLeft: 220, marginTop: 46, minHeight: '100vh', background: BG, padding: '32px 32px 48px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontFamily: F, fontSize: 22, fontWeight: 800, color: TX, margin: '0 0 4px', letterSpacing: '-0.3px' }}>Archive</h1>
            <p style={{ fontFamily: F, fontSize: 14, color: TX2, margin: 0 }}>Candidates who have been archived. Restore them to move back to your active pipeline.</p>
          </div>

          {archivedCandidates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '72px 0', color: TX3 }}>
              <Ic name="archive" size={36} color={TX3} />
              <p style={{ fontFamily: F, fontSize: 15, margin: '14px 0 0' }}>No archived candidates</p>
            </div>
          ) : (
            <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 12, overflow: 'hidden', boxShadow: SHADOW }}>
              {/* Table header */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.4fr 1fr 1fr 1fr auto', gap: 0, padding: '10px 20px', borderBottom: `1px solid ${BD}`, background: BG }}>
                {['Candidate', 'Role', 'Score', 'Rating', 'Archived', ''].map((h, i) => (
                  <span key={i} style={{ fontFamily: F, fontSize: 11.5, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
                ))}
              </div>
              {archivedCandidates.map((c, idx) => {
                const r = c.results?.[0]
                return (
                  <div
                    key={c.id}
                    style={{
                      display: 'grid', gridTemplateColumns: '2fr 1.4fr 1fr 1fr 1fr auto', gap: 0,
                      padding: '16px 20px', alignItems: 'center',
                      borderBottom: idx < archivedCandidates.length - 1 ? `1px solid ${BD}` : 'none',
                      background: idx % 2 === 0 ? CARD : '#fafbfc',
                    }}
                  >
                    {/* Candidate */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={c.name} size={28} />
                      <div>
                        <p style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TX, margin: '0 0 2px' }}>{c.name}</p>
                        <p style={{ fontFamily: F, fontSize: 12, color: TX3, margin: 0 }}>{c.email}</p>
                      </div>
                    </div>
                    {/* Role */}
                    <span style={{ fontFamily: F, fontSize: 13.5, color: TX2 }}>{c.assessments.role_title}</span>
                    {/* Score */}
                    {r ? (
                      <div>
                        <span style={{ fontFamily: FM, fontSize: 16, fontWeight: 700, color: r.overall_score >= 70 ? GRN : r.overall_score >= 50 ? AMB : RED }}>{r.overall_score}</span>
                        <span style={{ display: 'inline-block', marginLeft: 8, padding: '2px 8px', borderRadius: 50, fontSize: 11, fontWeight: 700, background: riskBg(r.risk_level), color: riskCol(r.risk_level) }}>{r.risk_level}</span>
                      </div>
                    ) : (
                      <span style={{ fontFamily: F, fontSize: 13.5, color: TX3 }}>,</span>
                    )}
                    {/* Rating */}
                    <div>{c.rating ? <StarRating value={c.rating} /> : <span style={{ color: TX3, fontFamily: F, fontSize: 13 }}>,</span>}</div>
                    {/* Archived date */}
                    <span style={{ fontFamily: F, fontSize: 13, color: TX3 }}>{fmt(c.completed_at)}</span>
                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      {r && (
                        <button
                          onClick={() => router.push(`/demo/candidate/${c.id}`)}
                          style={{ padding: '6px 12px', borderRadius: 7, border: `1.5px solid ${BD}`, background: 'transparent', fontFamily: F, fontSize: 12.5, fontWeight: 600, color: TX2, cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                          View report
                        </button>
                      )}
                      <button
                        onClick={() => setModal(true)}
                        style={{ padding: '6px 12px', borderRadius: 7, border: 'none', background: TEAL, fontFamily: F, fontSize: 12.5, fontWeight: 700, color: NAVY, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        Restore
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </DemoLayout>
  )
}

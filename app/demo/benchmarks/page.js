'use client'
import { useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { DemoLayout, SignUpModal } from '@/components/DemoShell'
import { Ic } from '@/components/Icons'
import InfoTooltip from '@/components/InfoTooltip'
import { DEMO_BENCHMARK_SKILLS, getDemoBenchmarkData } from '@/lib/demo-data'
import { NAVY, TEAL, TEALD, TEALLT, BG, CARD, BD, TX, TX2, TX3, GRN, GRNBG, GRNBD, AMB, AMBBG, AMBBD, RED, REDBG, REDBD, F, FM } from '@/lib/constants'

const _mSub = (cb) => { window.addEventListener('resize', cb); return () => window.removeEventListener('resize', cb) }
const _mSnap = () => window.innerWidth <= 768
const _mServer = () => false
function useIsMobile() { return useSyncExternalStore(_mSub, _mSnap, _mServer) }

const sc = s => s >= 85 ? GRN : s >= 70 ? TEAL : s >= 50 ? AMB : RED
const sbg = s => s >= 85 ? GRNBG : s >= 70 ? TEALLT : s >= 50 ? AMBBG : REDBG
const sbd = s => s >= 85 ? GRNBD : s >= 70 ? `${TEAL}55` : s >= 50 ? AMBBD : REDBD

const benchmarkData = getDemoBenchmarkData()

const SHADOW = '0 2px 12px rgba(15,33,55,0.08)'

function SkillBenchmarkCard({ skill, candidates, threshold, onThresholdChange }) {
  const sorted = [...candidates].sort((a, b) => b.score - a.score)
  const passing = sorted.filter(c => c.score >= threshold)
  const failing = sorted.filter(c => c.score < threshold)
  const avg = Math.round(candidates.reduce((s, c) => s + c.score, 0) / candidates.length)

  return (
    <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 12, overflow: 'hidden', boxShadow: SHADOW }}>
      <div style={{ padding: '18px 20px', borderBottom: `1px solid ${BD}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h3 style={{ fontFamily: F, fontSize: 15, fontWeight: 800, color: TX, margin: '0 0 3px' }}>{skill}</h3>
          <p style={{ fontFamily: F, fontSize: 12.5, color: TX3, margin: 0 }}>{candidates.length} candidates · avg {avg}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: TX3, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Threshold</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="range" min={0} max={100} value={threshold}
              onChange={e => onThresholdChange(Number(e.target.value))}
              style={{ width: 100, accentColor: TEAL, cursor: 'pointer' }}
            />
            <span style={{ fontFamily: FM, fontSize: 14, fontWeight: 700, color: TEAL, minWidth: 28, textAlign: 'right' }}>{threshold}</span>
          </div>
        </div>
      </div>
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sorted.map(c => {
          const passes = c.score >= threshold
          const pct = c.score
          return (
            <div key={c.id}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: passes ? GRN : RED,
                    flexShrink: 0,
                  }} />
                  <span style={{ fontFamily: F, fontSize: 13, color: TX, fontWeight: 500 }}>{c.name}</span>
                </div>
                <span style={{ fontFamily: FM, fontSize: 12.5, fontWeight: 700, color: sc(c.score) }}>{c.score}</span>
              </div>
              <div style={{ height: 6, borderRadius: 99, background: BG, overflow: 'hidden', position: 'relative' }}>
                <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99, background: passes ? GRN : RED, transition: 'width 0.4s ease' }} />
                {/* Threshold marker */}
                <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${threshold}%`, width: 2, background: NAVY, opacity: 0.3 }} />
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ padding: '12px 20px', borderTop: `1px solid ${BD}`, background: BG, display: 'flex', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: GRN }} />
          <span style={{ fontFamily: F, fontSize: 12, color: TX2 }}>{passing.length} above threshold</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: RED }} />
          <span style={{ fontFamily: F, fontSize: 12, color: TX2 }}>{failing.length} below threshold</span>
        </div>
      </div>
    </div>
  )
}

export default function DemoBenchmarksPage() {
  const isMobile = useIsMobile()
  const [modal, setModal] = useState(false)
  const PRESET = {
    'Strategic Communication': 75,
    'Negotiation & Objection Handling': 65,
    'Problem Solving': 70,
    'Delivery Focus': 80,
  }
  const [thresholds, setThresholds] = useState(
    Object.fromEntries(DEMO_BENCHMARK_SKILLS.map(s => [s, PRESET[s] ?? 70]))
  )

  const setThreshold = (skill, val) => setThresholds(prev => ({ ...prev, [skill]: val }))

  const availableSkills = DEMO_BENCHMARK_SKILLS.filter(s => benchmarkData[s])

  return (
    <DemoLayout active="benchmarks">
      {modal && <SignUpModal onClose={() => setModal(false)} />}
      <main style={{ marginLeft: isMobile ? 0 : 220, marginTop: isMobile ? 96 : 46, minHeight: '100vh', background: BG, padding: isMobile ? '16px 16px 32px' : '32px 32px 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ fontFamily: F, fontSize: 22, fontWeight: 800, color: TX, margin: '0 0 4px', letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: 8 }}>Skill Benchmarks <InfoTooltip text="Set minimum score thresholds per skill. Candidates scoring below are flagged in their report." /></h1>
              <p style={{ fontFamily: F, fontSize: 14, color: TX2, margin: 0 }}>Set minimum thresholds per skill and see which candidates qualify</p>
            </div>
            <button
              onClick={() => setModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 8, border: 'none', background: TEAL, color: NAVY, fontFamily: F, fontSize: 13.5, fontWeight: 800, cursor: 'pointer' }}
            >
              <Ic name="save" size={15} color={NAVY} />
              Save benchmarks
            </button>
          </div>

          {/* Info banner */}
          <div style={{ background: TEALLT, border: `1px solid ${TEAL}44`, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
            <Ic name="info" size={16} color={TEALD} />
            <p style={{ fontFamily: F, fontSize: 13.5, color: TEALD, margin: 0 }}>
              Drag the sliders to set your benchmark threshold for each skill. Candidates scoring below the threshold are flagged in red.
            </p>
          </div>

          {/* Skill cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(460px, 1fr))', gap: 20 }}>
            {availableSkills.map(skill => (
              <SkillBenchmarkCard
                key={skill}
                skill={skill}
                candidates={benchmarkData[skill]}
                threshold={thresholds[skill]}
                onThresholdChange={val => setThreshold(skill, val)}
              />
            ))}
          </div>

          {availableSkills.length === 0 && (
            <div style={{ textAlign: 'center', padding: '64px 0', color: TX3 }}>
              <Ic name="layers" size={36} color={TX3} />
              <p style={{ fontFamily: F, fontSize: 15, margin: '14px 0 0' }}>No benchmark data available yet</p>
            </div>
          )}
        </div>
      </main>
    </DemoLayout>
  )
}

'use client'

import { useState, useEffect, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { Ic } from '@/components/Icons'
import { DemoLayout, SignUpModal } from '@/components/DemoShell'
import {
  NAVY, TEAL, TEALD, TEALLT, BG, CARD, BD, TX, TX2, TX3,
  GRN, GRNBG, GRNBD, AMB, AMBBG, AMBBD, RED, REDBG, REDBD,
  F, cs,
} from '@/lib/constants'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

const _mSub = (cb) => { window.addEventListener('resize', cb); return () => window.removeEventListener('resize', cb) }
const _mSnap = () => window.innerWidth <= 768
const _mServer = () => false
function useIsMobile() { return useSyncExternalStore(_mSub, _mSnap, _mServer) }

const BUCKETS = ['0-49', '50-64', '65-74', '75-84', '85-100']

// Sample assessment shown in detail — scores designed so all 3 adverse
// impact checks pass (range >= 20, min >= 30, no bucket > 60% of candidates).
const SAMPLE_ASSESSMENT = {
  id: 'demo-edi-marketing',
  role_title: 'Marketing Manager',
  candidateCount: 5,
  scores: [88, 80, 74, 66, 62],
  certGenerated: true,
}

// Aggregate overview stats shown at top of the page.
const OVERVIEW = {
  assessments: 3,
  candidates: 11,
  averageScore: 74,
  passRate: 82,
}

function bucketise(scores) {
  const b = { '0-49': 0, '50-64': 0, '65-74': 0, '75-84': 0, '85-100': 0 }
  scores.forEach(s => {
    if (s < 50) b['0-49']++
    else if (s < 65) b['50-64']++
    else if (s < 75) b['65-74']++
    else if (s < 85) b['75-84']++
    else b['85-100']++
  })
  return b
}

function distributionShape(buckets, total) {
  if (total < 3) return { label: 'Too few candidates', ok: true }
  const pcts = BUCKETS.map(k => (buckets[k] || 0) / total)
  const maxPct = Math.max(...pcts)
  if (maxPct > 0.6) return { label: 'Skewed', ok: false }
  const mid = pcts[1] + pcts[2] + pcts[3]
  if (mid >= 0.5) return { label: 'Normal', ok: true }
  return { label: 'Broad', ok: true }
}

function adverseChecks(scores) {
  if (scores.length < 3) return []
  const min = Math.min(...scores)
  const max = Math.max(...scores)
  const range = max - min
  const buckets = bucketise(scores)
  const maxBucketPct = Math.max(...Object.values(buckets)) / scores.length
  return [
    { label: 'Score range is broad (candidates are differentiated)', pass: range >= 20 },
    { label: 'Lowest scoring group has meaningful scores (above 30)', pass: min >= 30 },
    { label: 'No cliff edge (no bucket exceeds 60% of candidates)', pass: maxBucketPct <= 0.6 },
  ]
}

function safe(text) {
  if (!text) return ''
  return String(text).replace(/[\u2014\u2013]/g, ', ').replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[^\x00-\xFF]/g, '')
}

function wrap(text, font, size, maxWidth) {
  const words = safe(text).split(/\s+/)
  const lines = []
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (font.widthOfTextAtSize(test, size) > maxWidth) {
      if (line) lines.push(line)
      line = w
    } else line = test
  }
  if (line) lines.push(line)
  return lines
}

async function generateDemoCertificate(assessment) {
  const scores = assessment.scores
  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
  const buckets = bucketise(scores)
  const min = Math.min(...scores)
  const max = Math.max(...scores)
  const passRate = Math.round((scores.filter(s => s >= 65).length / scores.length) * 100)
  const rangeCheck = (max - min) >= 20
  const floorCheck = min >= 30
  const maxBucketPct = Math.max(...Object.values(buckets)) / scores.length
  const cliffCheck = maxBucketPct <= 0.6
  const refNumber = `PRODICTA-EDI-DEMO-${Date.now().toString(36).toUpperCase().slice(-5)}`
  const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  const pdf = await PDFDocument.create()
  const helv = await pdf.embedFont(StandardFonts.Helvetica)
  const helvB = await pdf.embedFont(StandardFonts.HelveticaBold)
  const navy = rgb(0.06, 0.13, 0.22)
  const teal = rgb(0, 0.75, 0.65)
  const grey = rgb(0.42, 0.46, 0.52)
  const black = rgb(0.1, 0.13, 0.18)
  const greenRgb = rgb(0, 0.75, 0.65)
  const amberRgb = rgb(0.85, 0.59, 0.04)

  const page = pdf.addPage([595, 842])
  page.drawRectangle({ x: 0, y: 752, width: 595, height: 90, color: navy })
  page.drawText('PRODICTA', { x: 40, y: 800, size: 28, font: helvB, color: teal })
  page.drawText('Bias-Free Hiring Certificate', { x: 40, y: 770, size: 14, font: helv, color: rgb(1, 1, 1) })

  let y = 720
  const label = (k, v, yPos) => {
    page.drawText(safe(k), { x: 40, y: yPos, size: 9, font: helvB, color: grey })
    page.drawText(safe(v), { x: 40, y: yPos - 16, size: 13, font: helvB, color: black })
  }

  label('CERTIFICATE REFERENCE', refNumber, y); y -= 40
  label('DATE GENERATED', dateStr, y); y -= 40
  label('ASSESSMENT', assessment.role_title, y); y -= 40
  label('PREPARED BY', 'Demo Recruitment Agency', y); y -= 40
  label('CANDIDATES ASSESSED', String(scores.length), y); y -= 50

  page.drawRectangle({ x: 40, y, width: 515, height: 1, color: rgb(0.88, 0.9, 0.94) }); y -= 24

  page.drawText('SCORE DISTRIBUTION', { x: 40, y, size: 9, font: helvB, color: grey }); y -= 18
  for (const [bucket, count] of Object.entries(buckets)) {
    const pct = Math.round((count / scores.length) * 100)
    page.drawText(`${bucket}:`, { x: 40, y, size: 11, font: helvB, color: black })
    page.drawText(`${count} candidate${count !== 1 ? 's' : ''} (${pct}%)`, { x: 110, y, size: 11, font: helv, color: black })
    page.drawRectangle({ x: 280, y: y - 2, width: Math.max(2, (pct / 100) * 300), height: 12, color: teal })
    y -= 18
  }
  y -= 6
  page.drawText(`Average score: ${avg} / 100`, { x: 40, y, size: 11, font: helvB, color: navy }); y -= 16
  page.drawText(`Pass rate (65+): ${passRate}%`, { x: 40, y, size: 11, font: helvB, color: navy }); y -= 16
  page.drawText(`Score range: ${min} - ${max}`, { x: 40, y, size: 11, font: helvB, color: navy }); y -= 24

  page.drawRectangle({ x: 40, y, width: 515, height: 1, color: rgb(0.88, 0.9, 0.94) }); y -= 22

  page.drawText('METHODOLOGY', { x: 40, y, size: 9, font: helvB, color: grey }); y -= 16
  const methText = 'This assessment measures real work performance through scenario-based simulations. Candidates are evaluated on their responses to work situations relevant to the role. No questions relate to personal characteristics, background, or identity. Assessment design follows best practice guidance for fair and objective candidate evaluation.'
  wrap(methText, helv, 10, 515).forEach(l => { page.drawText(l, { x: 40, y, size: 10, font: helv, color: black }); y -= 14 }); y -= 12

  page.drawText('ADVERSE IMPACT CHECKS', { x: 40, y, size: 9, font: helvB, color: grey }); y -= 18
  const checks = [
    { label: 'Score range is broad (candidates are being differentiated)', pass: rangeCheck },
    { label: 'Lowest scoring candidate scored above 30 (meaningful scores)', pass: floorCheck },
    { label: 'No single score bucket exceeds 60% of candidates (no cliff edge)', pass: cliffCheck },
  ]
  for (const ck of checks) {
    page.drawText(ck.pass ? 'PASS' : 'REVIEW', { x: 40, y, size: 10, font: helvB, color: ck.pass ? greenRgb : amberRgb })
    page.drawText(safe(ck.label), { x: 95, y, size: 10, font: helv, color: black })
    y -= 16
  }
  y -= 10

  page.drawRectangle({ x: 40, y, width: 515, height: 1, color: rgb(0.88, 0.9, 0.94) }); y -= 22

  page.drawText('STATEMENT', { x: 40, y, size: 9, font: helvB, color: grey }); y -= 16
  const stmt = 'No demographic data is collected or used in scoring. All candidates complete identical scenarios under identical conditions. This certificate confirms that the assessment methodology is designed to evaluate candidates fairly and objectively, in compliance with the Equality Act 2010 and Employment Rights Act 2025.'
  wrap(stmt, helv, 10, 515).forEach(l => { page.drawText(l, { x: 40, y, size: 10, font: helv, color: black }); y -= 14 })

  page.drawRectangle({ x: 0, y: 0, width: 595, height: 36, color: navy })
  page.drawText(`Reference: ${refNumber}`, { x: 40, y: 13, size: 9, font: helv, color: rgb(0.85, 0.95, 0.95) })
  page.drawText('prodicta.co.uk', { x: 460, y: 13, size: 9, font: helvB, color: teal })

  const bytes = await pdf.save()
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
}

export default function DemoEdiPage() {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [modal, setModal] = useState(false)
  const [generating, setGenerating] = useState(null)

  const [demoEmploymentType, setDemoEmploymentType] = useState(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try { setDemoEmploymentType(localStorage.getItem('prodicta_demo_employment_type')) } catch {}
  }, [])

  const a = SAMPLE_ASSESSMENT
  const buckets = bucketise(a.scores)
  const avg = Math.round(a.scores.reduce((x, y) => x + y, 0) / a.scores.length)
  const shape = distributionShape(buckets, a.scores.length)
  const checks = adverseChecks(a.scores)

  async function handleGenerate() {
    setGenerating(a.id)
    try {
      await generateDemoCertificate(a)
    } finally {
      setGenerating(null)
    }
  }

  return (
    <DemoLayout active="edi" demoEmploymentType={demoEmploymentType}>
      {modal && <SignUpModal onClose={() => setModal(false)} />}
      <main className="main-content" style={{
        marginLeft: isMobile ? 0 : 220,
        marginTop: isMobile ? 56 : 0,
        padding: isMobile ? '80px 16px 32px' : '60px 40px 32px',
        minHeight: '100vh', background: BG, fontFamily: F,
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: TX, margin: '0 0 6px' }}>Diversity and Inclusion Monitor</h1>
            <p style={{ fontSize: 13.5, color: TX2, margin: 0, lineHeight: 1.55 }}>
              Monitor assessment fairness across your candidate pool. Generate Bias-Free Hiring Certificates for every assessment.
            </p>
          </div>

          {/* Disclaimer */}
          <div style={{ ...cs, borderLeft: `4px solid ${TEAL}`, marginBottom: 24, padding: '16px 22px' }}>
            <p style={{ fontSize: 12.5, color: TX2, margin: 0, lineHeight: 1.65 }}>
              PRODICTA assessments are based on real work performance not personality, appearance, or background. This monitor tracks score distributions to help you identify any unintended patterns in your hiring process. It does not collect or store demographic data. Assessment fairness is monitored at the aggregate level only.
            </p>
          </div>

          {/* Overview Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
            {[
              { label: 'Assessments Run', value: OVERVIEW.assessments },
              { label: 'Total Candidates', value: OVERVIEW.candidates },
              { label: 'Average Score', value: OVERVIEW.averageScore },
              { label: 'Pass Rate (65+)', value: `${OVERVIEW.passRate}%` },
            ].map((s, i) => (
              <div key={i} style={{ ...cs, textAlign: 'center', padding: '18px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{s.label}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: NAVY }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Sample Assessment: Marketing Manager */}
          <h2 style={{ fontSize: 15, fontWeight: 700, color: TX, margin: '0 0 14px' }}>Sample Assessment</h2>
          <div style={{ ...cs, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: TX, margin: 0 }}>{a.role_title}</h3>
                  <span title="Bias-Free Certificate generated" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 50, background: GRNBG, border: `1px solid ${GRNBD}` }}>
                    <Ic name="shield" size={11} color={GRN} />
                    <span style={{ fontSize: 9, fontWeight: 800, color: GRN }}>Certified</span>
                  </span>
                </div>
                <div style={{ fontSize: 11.5, color: TX3, marginTop: 2 }}>{a.candidateCount} candidates assessed. Average: {avg}</div>
              </div>
              <span style={{
                display: 'inline-block', padding: '3px 12px', borderRadius: 50,
                fontSize: 10, fontWeight: 800, fontFamily: F,
                background: shape.ok ? GRNBG : AMBBG,
                color: shape.ok ? GRN : AMB,
                border: `1px solid ${shape.ok ? GRNBD : AMBBD}`,
              }}>
                {shape.label}
              </span>
            </div>

            {/* Score bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 16 }}>
              {BUCKETS.map(bucket => {
                const count = buckets[bucket]
                const pct = Math.round((count / a.scores.length) * 100)
                return (
                  <div key={bucket} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: TX3, width: 44, flexShrink: 0 }}>{bucket}</span>
                    <div style={{ flex: 1, background: BG, borderRadius: 3, height: 16, overflow: 'hidden' }}>
                      <div style={{
                        width: `${Math.max(2, pct)}%`, height: '100%', borderRadius: 3,
                        background: TEAL, transition: 'width 0.4s ease',
                      }} />
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: TX3, width: 52, textAlign: 'right', flexShrink: 0 }}>
                      {count} ({pct}%)
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Adverse impact checks */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Adverse Impact Checks</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {checks.map((ck, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                      background: ck.pass ? GRNBG : AMBBG,
                    }}>
                      <Ic name={ck.pass ? 'check' : 'alert'} size={12} color={ck.pass ? GRN : AMB} />
                    </span>
                    <span style={{ fontSize: 12, color: TX2 }}>{ck.label}</span>
                    <span style={{ fontSize: 10, fontWeight: 800, color: ck.pass ? GRN : AMB, marginLeft: 'auto', flexShrink: 0 }}>
                      {ck.pass ? 'PASS' : 'REVIEW'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating === a.id}
              style={{
                padding: '10px 20px', borderRadius: 8, border: 'none',
                background: generating === a.id ? BD : TEAL,
                color: generating === a.id ? TX3 : NAVY,
                fontFamily: F, fontSize: 13, fontWeight: 800,
                cursor: generating === a.id ? 'not-allowed' : 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
            >
              <Ic name="shield" size={14} color={generating === a.id ? TX3 : NAVY} />
              {generating === a.id ? 'Generating...' : 'Download Bias-Free Certificate'}
            </button>
          </div>

          {/* Signup prompt card */}
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
              <Ic name="shield" size={22} color={TEALD} />
            </div>
            <h2 style={{ fontFamily: F, fontSize: 17, fontWeight: 800, color: NAVY, margin: '0 0 8px', letterSpacing: '-0.2px' }}>
              This is a preview
            </h2>
            <p style={{ fontFamily: F, fontSize: 13.5, color: TX2, margin: '0 0 18px', lineHeight: 1.6, maxWidth: 460, marginLeft: 'auto', marginRight: 'auto' }}>
              Sign up to monitor assessment fairness across all your candidates.
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

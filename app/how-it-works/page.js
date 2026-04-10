'use client'
import { useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { Ic } from '@/components/Icons'

const _mSub = (cb) => { window.addEventListener('resize', cb); return () => window.removeEventListener('resize', cb) }
const _mSnap = () => window.innerWidth <= 768
const _mServer = () => false
function useIsMobile() { return useSyncExternalStore(_mSub, _mSnap, _mServer) }
import {
  NAVY, TEAL, TEALD, TEALLT, BG, CARD, BD, TX, TX2, TX3,
  GRN, GRNBG, GRNBD, AMB, AMBBG, RED, REDBG, PURPLE,
  F, FM,
} from '@/lib/constants'

// ── Flow steps ────────────────────────────────────────────────────────────────

const STEPS = [
  {
    n: '01',
    icon: 'file',
    title: 'You paste a job description',
    body: 'Paste the JD for any role. No templates, no setup. Prodicta reads it and understands the context: the industry, seniority level, and the skills that actually matter for that specific position.',
    accent: TEALD,
    bg: TEALLT,
    bd: `${TEAL}55`,
  },
  {
    n: '02',
    icon: 'zap',
    title: 'AI generates 4 realistic work simulations',
    body: 'Using your exact job description, the AI writes four scenario-based tasks: an email response, a prioritisation challenge, a judgment call, and a strategic problem. These are not generic questions; they reference the real context of your role.',
    accent: PURPLE,
    bg: '#f5f3ff',
    bd: `${PURPLE}44`,
  },
  {
    n: '03',
    icon: 'play',
    title: 'Candidate completes the assessment',
    body: 'Candidates receive a link and work through each scenario independently. Each scenario is timed. They write free-text responses. No multiple choice, no personality scales. Just real work, done in real time.',
    accent: AMB,
    bg: AMBBG,
    bd: '#fde68a',
  },
  {
    n: '04',
    icon: 'target',
    title: 'AI scores every response with evidence',
    body: 'Each response is scored across Communication, Problem Solving, Prioritisation, Leadership, and the unique Pressure-Fit Assessment. Crucially, every score comes with a direct quote from what the candidate actually wrote. Nothing is inferred.',
    accent: TEALD,
    bg: TEALLT,
    bd: `${TEAL}55`,
  },
  {
    n: '05',
    icon: 'award',
    title: 'You receive a full hiring report',
    body: 'Within minutes, you get an overall score, a risk level, a hiring recommendation, strengths and watch-outs with evidence, a suggested onboarding plan, and five tailored interview questions to follow up on what the assessment surfaced.',
    accent: GRN,
    bg: GRNBG,
    bd: GRNBD,
  },
]

// ── Principles ────────────────────────────────────────────────────────────────

const PRINCIPLES = [
  {
    icon: 'eye',
    title: 'Real work, not personality tests',
    body: 'Prodicta does not ask candidates how they feel about conflict or whether they prefer working alone or in teams. It gives them a real task and watches what they actually do.',
  },
  {
    icon: 'file',
    title: 'Generated from your job description',
    body: 'Every scenario is created fresh from your specific JD. A Marketing Manager assessment and a Sales Manager assessment will look completely different, because the roles are completely different.',
  },
  {
    icon: 'shield',
    title: 'Scored across skills that predict success',
    body: 'Responses are evaluated across Communication, Problem Solving, Prioritisation, Leadership, and the unique Pressure-Fit Assessment. Four dimensions that measure how a candidate performs under real pressure.',
  },
  {
    icon: 'search',
    title: 'Every score has evidence',
    body: 'Every strength and watch-out in the report is anchored to a specific quote from the candidate\'s responses. You can trace every recommendation back to exactly what they wrote.',
  },
  {
    icon: 'check',
    title: 'No black box',
    body: 'There are no hidden weights or opaque algorithms. If Prodicta flags a risk, it shows you why, in the candidate\'s own words. Every recommendation is fully explainable.',
  },
  {
    icon: 'clock',
    title: 'Results in minutes, not days',
    body: 'Candidates complete the assessment in 45 to 60 minutes. Within two minutes of their final submission, the full report is available. No waiting for a human scorer to review responses.',
  },
]

// ── Pressure-Fit explained ────────────────────────────────────────────────────

const PF_DIMS = [
  { label: 'Decision Speed & Quality',   desc: 'Decisiveness and quality of judgement when no perfect answer exists' },
  { label: 'Composure Under Conflict',   desc: 'Emotional regulation when facing difficult conversations or pushback' },
  { label: 'Prioritisation Under Load',  desc: 'Framework clarity and trade-off awareness when demands compete' },
  { label: 'Ownership & Accountability', desc: 'Personal responsibility, active language, and specific commitments' },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HowItWorksPage() {
  const router = useRouter()
  const isMobile = useIsMobile()

  return (
    <div style={{ display: 'flex', fontFamily: F, background: BG, minHeight: '100vh' }}>
      <Sidebar active="how-it-works" />

      <main style={{ marginLeft: isMobile ? 0 : 220, padding: isMobile ? '72px 16px 32px' : '40px 48px', flex: 1, minWidth: 0, maxWidth: 900 }}>

        {/* ── Hero ── */}
        <div style={{ marginBottom: 40 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '4px 14px', borderRadius: 20,
            background: TEALLT, border: `1px solid ${TEAL}55`,
            fontSize: 12, fontWeight: 700, color: TEALD,
            marginBottom: 16,
          }}>
            <Ic name="eye" size={13} color={TEALD} />
            Full transparency
          </div>
          <h1 style={{
            margin: '0 0 14px', fontSize: 34, fontWeight: 900,
            color: NAVY, letterSpacing: '-1px', lineHeight: 1.15,
          }}>
            No black box.
            <br />
            Here's exactly how Prodicta works.
          </h1>
          <p style={{
            margin: 0, fontSize: 16, color: TX2, lineHeight: 1.7, maxWidth: 580,
          }}>
            Most hiring tools are opaque. Prodicta is built on the opposite principle: every score, every recommendation, and every flag is traceable back to what the candidate actually wrote.
          </p>
        </div>

        {/* ── Flow ── */}
        <div style={{
          background: CARD, border: `1px solid ${BD}`, borderRadius: 16,
          padding: '32px 36px', marginBottom: 32,
        }}>
          <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: NAVY, letterSpacing: '-0.3px' }}>
            The five-step process
          </h2>
          <p style={{ margin: '0 0 28px', fontSize: 13.5, color: TX3, fontFamily: F }}>
            From job description to hiring recommendation. Here is what happens at every step.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {STEPS.map((step, i) => (
              <div key={step.n} style={{ display: 'flex', gap: 0, alignItems: 'stretch' }}>

                {/* Left: number + connector line */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 56, flexShrink: 0 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                    background: step.bg, border: `2px solid ${step.bd}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: FM, fontSize: 13, fontWeight: 800, color: step.accent,
                  }}>
                    {step.n}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div style={{
                      width: 2, flex: 1, minHeight: 24,
                      background: `linear-gradient(to bottom, ${step.bd}, ${STEPS[i + 1].bd})`,
                      marginTop: 4, marginBottom: 4,
                    }} />
                  )}
                </div>

                {/* Right: content */}
                <div style={{ flex: 1, paddingLeft: 16, paddingBottom: i < STEPS.length - 1 ? 24 : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: step.bg, border: `1px solid ${step.bd}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Ic name={step.icon} size={16} color={step.accent} />
                    </div>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: TX, letterSpacing: '-0.2px' }}>
                      {step.title}
                    </h3>
                  </div>
                  <p style={{ margin: 0, fontSize: 13.5, color: TX2, lineHeight: 1.7, maxWidth: 560 }}>
                    {step.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Six principles ── */}
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: NAVY, letterSpacing: '-0.3px' }}>
            Six things that make this different
          </h2>
          <p style={{ margin: '0 0 20px', fontSize: 13.5, color: TX3 }}>
            Why scenario-based assessment beats CVs, interviews, and personality tests.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
            {PRINCIPLES.map(p => (
              <div key={p.title} style={{
                background: CARD, border: `1px solid ${BD}`,
                borderRadius: 12, padding: '20px 22px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 9,
                    background: TEALLT, border: `1px solid ${TEAL}44`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Ic name={p.icon} size={16} color={TEALD} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: TX, lineHeight: 1.3 }}>
                    {p.title}
                  </h3>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: TX2, lineHeight: 1.65 }}>
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Pressure-Fit deep dive ── */}
        <div style={{
          background: `linear-gradient(135deg, ${NAVY} 0%, #0d3349 100%)`,
          border: `1px solid rgba(91,191,189,0.2)`,
          borderRadius: 16, padding: '28px 32px', marginBottom: 32,
        }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '3px 12px', borderRadius: 20,
            background: `${TEAL}20`, border: `1px solid ${TEAL}44`,
            fontSize: 11, fontWeight: 700, color: TEAL, letterSpacing: '0.06em',
            marginBottom: 14,
          }}>
            UNIQUE TO PRODICTA
          </div>
          <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>
            The Pressure-Fit Assessment
          </h2>
          <p style={{ margin: '0 0 24px', fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 1.65, maxWidth: 560 }}>
            Most assessments test knowledge. Prodicta also measures how a candidate behaves under pressure, because that is what determines whether they pass probation. Pressure-Fit is scored across four dimensions:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {PF_DIMS.map(d => (
              <div key={d.label} style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10, padding: '14px 18px',
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: TEAL, marginBottom: 5 }}>
                  {d.label}
                </div>
                <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.55 }}>
                  {d.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Scoring transparency ── */}
        <div style={{
          background: CARD, border: `1px solid ${BD}`, borderRadius: 16,
          padding: '28px 32px', marginBottom: 32,
        }}>
          <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: NAVY, letterSpacing: '-0.3px' }}>
            How scoring works
          </h2>
          <p style={{ margin: '0 0 22px', fontSize: 13.5, color: TX3 }}>
            Scores are not generated by a lookup table or a fixed rubric. The AI reads each response and evaluates it in the context of the specific scenario and the specific role.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { label: 'Contextual scoring', body: 'A response that is excellent for a junior role may be adequate for a senior one. Scoring is calibrated to the seniority and context specified in the job description.' },
              { label: 'Quote-backed evidence', body: 'Every strength and watch-out in the report includes a direct quote from the candidate\'s response. You are never asked to take the AI\'s word for it.' },
              { label: 'Weighted by skill importance', body: 'You can adjust skill weights before generating scenarios. If Communication matters more than Leadership for your role, the scoring reflects that.' },
              { label: 'ERA 2025 ready', body: 'Reports include a risk level and reasoning that can support your hiring decision. Prodicta helps you document objective, evidence-based reasoning, reducing tribunal exposure under the Employment Rights Act 2025.' },
            ].map(item => (
              <div key={item.label} style={{
                display: 'flex', gap: 14, alignItems: 'flex-start',
                padding: '14px 16px', borderRadius: 10,
                background: BG, border: `1px solid ${BD}`,
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: TEAL, flexShrink: 0, marginTop: 6,
                }} />
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: TX, marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 13, color: TX2, lineHeight: 1.65 }}>{item.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── See it in action CTA ── */}
        <div style={{
          background: TEALLT, border: `1px solid ${TEAL}55`,
          borderRadius: 14, padding: '24px 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 20, flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: NAVY, marginBottom: 4 }}>
              Want to see a real report?
            </div>
            <div style={{ fontSize: 13.5, color: TX2 }}>
              View a full sample report for a fictional Marketing Manager candidate. Every section, every score, every piece of evidence.
            </div>
          </div>
          <a
            href="/sample-report"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '11px 22px', borderRadius: 8,
              background: NAVY, color: '#fff',
              fontFamily: F, fontSize: 13.5, fontWeight: 700,
              textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            <Ic name="eye" size={15} color={TEAL} />
            View sample report
          </a>
        </div>

      </main>
    </div>
  )
}

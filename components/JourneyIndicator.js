'use client'
import { NAVY, TEAL, TEALLT, BG, BD, TX2, TX3, F, FM } from '@/lib/constants'
import { getJourneySteps, STEP_DESCRIPTIONS } from '@/lib/journey-steps'

// Top-level six-step PRODICTA killer-workflow indicator. Renders a
// horizontal pill row on desktop (flex-wraps to a 3x2 grid mid-width) and
// a vertical stack on narrow screens. Counts come from the dashboard's
// existing data fetches; this component does not query Supabase itself.
//
// Each step is keyboard-focusable. The user's task brief asked for
// click-to-anchor jumps; we render each step as an <a href="#step-{id}">
// so even when the dashboard does not yet expose a matching anchor
// (the wholesale widget reorganisation is intentionally a follow-up),
// the link is harmless rather than broken.

function StepStatus({ count, label, isEmpty, isActive }) {
  if (isEmpty) {
    return <span style={{ fontFamily: F, fontSize: 11.5, color: TX3 }}>Nothing yet</span>
  }
  return (
    <span style={{ fontFamily: F, fontSize: 11.5, fontWeight: 700, color: isActive ? TEAL : TX2 }}>
      {count} {label}
    </span>
  )
}

export default function JourneyIndicator({
  accountType,
  employmentType,
  counts,         // { create, screen, decide, track, fix, document }
  isEmpty = false,
  onCreateClick,  // first-time-user CTA on Step 1
}) {
  const steps = getJourneySteps(accountType, employmentType)
  const c = counts || {}
  const numbers = [
    { count: c.create   ?? 0, label: c.create   === 1 ? 'in progress'   : 'in progress' },
    { count: c.screen   ?? 0, label: c.screen   === 1 ? 'in progress'   : 'in progress' },
    { count: c.decide   ?? 0, label: c.decide   === 1 ? 'ready'         : 'ready' },
    { count: c.track    ?? 0, label: c.track    === 1 ? 'active'        : 'active' },
    { count: c.fix      ?? 0, label: c.fix      === 1 ? 'needs attention' : 'need attention' },
    { count: c.document ?? 0, label: c.document === 1 ? 'this month'    : 'this month' },
  ]
  // The "active" step is the first non-empty one with a positive count;
  // it gets the jade accent so the indicator surfaces "where the user is
  // right now" rather than just listing six tiles.
  const activeIdx = numbers.findIndex(n => (n.count ?? 0) > 0)

  return (
    <section
      aria-label="PRODICTA workflow journey"
      style={{
        background: '#fff',
        border: `1px solid ${BD}`,
        borderRadius: 14,
        padding: '20px 22px',
        marginBottom: 24,
      }}
    >
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        <h2 style={{ fontFamily: F, fontSize: 14, fontWeight: 800, color: NAVY, margin: 0, letterSpacing: '-0.1px' }}>
          The PRODICTA workflow
        </h2>
        <p style={{ fontFamily: F, fontSize: 12.5, color: TX2, margin: 0 }}>
          Six steps from drafting a role to documenting the outcome.
        </p>
      </header>

      <ol
        style={{
          listStyle: 'none', margin: 0, padding: 0,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 10,
        }}
      >
        {steps.map((step, i) => {
          const isActive = i === activeIdx
          const stepEmpty = (numbers[i].count ?? 0) === 0
          const showCta = isEmpty && i === 0 && typeof onCreateClick === 'function'
          return (
            <li key={step.id} style={{ position: 'relative' }}>
              <a
                href={showCta ? '#' : `#step-${step.id}`}
                onClick={showCta ? (e => { e.preventDefault(); onCreateClick() }) : undefined}
                aria-label={`Step ${i + 1}: ${step.label}`}
                style={{
                  display: 'block',
                  background: isActive ? TEALLT : BG,
                  border: `1px solid ${isActive ? TEAL : BD}`,
                  borderLeft: isActive ? `4px solid ${TEAL}` : `1px solid ${BD}`,
                  borderRadius: 10,
                  padding: '12px 14px',
                  textDecoration: 'none',
                  minHeight: 84,
                  cursor: 'pointer',
                  transition: 'background 0.15s, border-color 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: isActive ? TEAL : '#fff',
                    color: isActive ? '#fff' : NAVY,
                    border: `1px solid ${isActive ? TEAL : BD}`,
                    fontFamily: FM, fontSize: 12, fontWeight: 800,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {i + 1}
                  </span>
                  <span style={{
                    fontFamily: F, fontSize: 13, fontWeight: 800,
                    color: isActive ? NAVY : NAVY, lineHeight: 1.3,
                  }}>
                    {step.shortLabel}
                  </span>
                </div>
                <div style={{ fontFamily: F, fontSize: 12, color: TX2, lineHeight: 1.4, marginBottom: 6 }}>
                  {step.label}
                </div>
                {showCta ? (
                  <span style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: TEAL }}>
                    Get started
                  </span>
                ) : (
                  <StepStatus
                    count={numbers[i].count}
                    label={numbers[i].label}
                    isEmpty={stepEmpty}
                    isActive={isActive}
                  />
                )}
              </a>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

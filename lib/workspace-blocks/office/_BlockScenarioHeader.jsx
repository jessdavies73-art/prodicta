'use client'

// Shared scenario context strip rendered at the top of every real block.
// Shows the scenario title, the block's position in the run, the spine
// ("you are working on..."), the trigger (only on block 1), and any
// connects_from / connects_to references so the candidate is grounded in
// the same scenario as they move from block to block.
//
// Used by inbox.jsx, task-prioritisation.jsx, calendar-planning.jsx and
// the future real blocks. Pure presentational; no state.

const NAVY = '#0f2137'
const TEAL = '#00BFA5'
const F = "'Outfit', system-ui, sans-serif"
const FM = "'IBM Plex Mono', monospace"

export default function BlockScenarioHeader({
  scenario_context = {},
  block_content = {},
  blockName,
}) {
  const { title, spine, trigger, order, total } = scenario_context
  const showTrigger = order === 1
  const connects_from = block_content.connects_from
  const expected_output = block_content.expected_output

  return (
    <div style={{
      maxWidth: 980, margin: '0 auto 18px', padding: 18,
      background: '#fff', border: `1px solid ${TEAL}33`, borderRadius: 12,
      boxShadow: '0 4px 14px rgba(15,33,55,0.05)',
    }}>
      {title ? (
        <div style={{
          fontFamily: FM, fontSize: 11, fontWeight: 700, color: TEAL,
          textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
        }}>
          Scenario: {title}
        </div>
      ) : null}

      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        gap: 12, flexWrap: 'wrap', marginBottom: 8,
      }}>
        <h2 style={{
          fontFamily: F, fontSize: 20, fontWeight: 800, color: NAVY,
          lineHeight: 1.2, margin: 0,
        }}>
          {blockName}
        </h2>
        {order && total ? (
          <div style={{ fontFamily: FM, fontSize: 12, fontWeight: 600, color: '#64748b' }}>
            Block {order} of {total}
          </div>
        ) : null}
      </div>

      {spine ? (
        <div style={{ marginBottom: 10 }}>
          <div style={{
            fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#64748b',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4,
          }}>You are working on</div>
          <div style={{ fontFamily: F, fontSize: 14, color: NAVY, lineHeight: 1.5 }}>
            {spine}
          </div>
        </div>
      ) : null}

      {showTrigger && trigger ? (
        <div style={{ marginBottom: 10 }}>
          <div style={{
            fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#64748b',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4,
          }}>Trigger</div>
          <div style={{ fontFamily: F, fontSize: 14, color: NAVY, lineHeight: 1.5 }}>
            {trigger}
          </div>
        </div>
      ) : null}

      {connects_from && !showTrigger ? (
        <div style={{
          background: `${TEAL}10`, border: `1px dashed ${TEAL}66`,
          borderRadius: 8, padding: 10, marginTop: 10,
        }}>
          <div style={{
            fontFamily: FM, fontSize: 10, fontWeight: 700, color: TEAL,
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4,
          }}>Picking up from the previous block</div>
          <div style={{ fontFamily: F, fontSize: 13, color: NAVY, lineHeight: 1.5 }}>
            {connects_from}
          </div>
        </div>
      ) : null}

      {expected_output ? (
        <div style={{
          background: '#ecfdf5', border: '1px solid #a7f3d0',
          borderRadius: 8, padding: 10, marginTop: 10,
        }}>
          <div style={{
            fontFamily: FM, fontSize: 10, fontWeight: 700, color: '#047857',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4,
          }}>What this block is asking you to do</div>
          <div style={{ fontFamily: F, fontSize: 13, color: '#064e3b', lineHeight: 1.5 }}>
            {expected_output}
          </div>
        </div>
      ) : null}
    </div>
  )
}

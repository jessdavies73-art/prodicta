'use client'

// Shared visual stub used by every Phase 1 Office block. Each block file
// renders this with its own metadata. The placeholder shows the block's
// position in the scenario, the scenario title, what flows in from the
// previous block, what flows out to the next, and the scenario context
// the candidate is working on. Real interactive surfaces replace this
// per-block in Phase 2 prompts; the metadata export shape stays stable.

const NAVY = '#0f2137'
const TEAL = '#00BFA5'
const F = "'Outfit', system-ui, sans-serif"
const FM = "'IBM Plex Mono', monospace"

export default function BlockPlaceholder({
  metadata,
  role_profile,
  block_content,
  scenario_context,
  onComplete,
}) {
  const minutes = Math.round((metadata.default_duration_seconds || 0) / 60)
  const order = scenario_context?.order
  const total = scenario_context?.total
  const scenarioTitle = scenario_context?.title
  const spine = scenario_context?.spine
  const trigger = scenario_context?.trigger
  const connectsFrom = block_content?.connects_from
  const connectsTo = block_content?.connects_to

  return (
    <div style={{
      fontFamily: F, maxWidth: 760, margin: '0 auto', padding: 28,
      background: '#fff', border: `1px solid ${TEAL}33`, borderRadius: 12,
      boxShadow: '0 4px 18px rgba(15,33,55,0.06)',
    }}>
      {scenarioTitle ? (
        <div style={{
          fontFamily: FM, fontSize: 11, fontWeight: 700, color: TEAL,
          textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
        }}>Scenario: {scenarioTitle}</div>
      ) : null}

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 4, flexWrap: 'wrap' }}>
        <h2 style={{ fontFamily: F, fontSize: 22, fontWeight: 800, color: NAVY, lineHeight: 1.2 }}>
          {metadata.name}
        </h2>
        {order && total ? (
          <div style={{ fontFamily: FM, fontSize: 12, fontWeight: 600, color: '#64748b' }}>
            Block {order} of {total} &middot; {minutes} min target
          </div>
        ) : (
          <div style={{ fontFamily: FM, fontSize: 12, fontWeight: 600, color: '#64748b' }}>
            {minutes} min target
          </div>
        )}
      </div>

      <p style={{ fontFamily: F, fontSize: 13, color: '#475569', marginBottom: 18, lineHeight: 1.5 }}>
        Block id: <code style={{ fontFamily: FM, fontSize: 12, color: NAVY, background: '#f1f5f9', padding: '1px 6px', borderRadius: 4 }}>{metadata.id}</code>
        {' '}&middot;{' '}
        Category: <b>{metadata.category}</b>
      </p>

      {block_content?.summary || spine || trigger ? (
        <div style={{
          background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8,
          padding: 16, marginBottom: 14,
        }}>
          {spine ? (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                You are working on
              </div>
              <div style={{ fontFamily: F, fontSize: 14, color: NAVY, lineHeight: 1.5 }}>{spine}</div>
            </div>
          ) : null}
          {trigger && order === 1 ? (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                Trigger
              </div>
              <div style={{ fontFamily: F, fontSize: 14, color: NAVY, lineHeight: 1.5 }}>{trigger}</div>
            </div>
          ) : null}
          {block_content?.summary ? (
            <div>
              <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                In this block
              </div>
              <div style={{ fontFamily: F, fontSize: 14, color: NAVY, lineHeight: 1.5 }}>{block_content.summary}</div>
            </div>
          ) : null}
        </div>
      ) : null}

      {(connectsFrom || connectsTo) ? (
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          {connectsFrom ? (
            <div style={{ flex: '1 1 220px', background: '#fff', border: `1px dashed ${TEAL}66`, borderRadius: 8, padding: 12 }}>
              <div style={{ fontFamily: FM, fontSize: 10, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                Connects from
              </div>
              <div style={{ fontFamily: F, fontSize: 13, color: NAVY, lineHeight: 1.5 }}>{connectsFrom}</div>
            </div>
          ) : null}
          {connectsTo ? (
            <div style={{ flex: '1 1 220px', background: '#fff', border: `1px dashed ${TEAL}66`, borderRadius: 8, padding: 12 }}>
              <div style={{ fontFamily: FM, fontSize: 10, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                Connects to
              </div>
              <div style={{ fontFamily: F, fontSize: 13, color: NAVY, lineHeight: 1.5 }}>{connectsTo}</div>
            </div>
          ) : null}
        </div>
      ) : null}

      {block_content?.key_items?.length ? (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            Key items in this block
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontFamily: F, fontSize: 13, color: NAVY, lineHeight: 1.6 }}>
            {block_content.key_items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {block_content?.expected_output ? (
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, padding: 14, marginBottom: 14 }}>
          <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
            Expected output
          </div>
          <div style={{ fontFamily: F, fontSize: 13, color: '#064e3b', lineHeight: 1.5 }}>{block_content.expected_output}</div>
        </div>
      ) : null}

      <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: 14, marginBottom: 18 }}>
        <div style={{ fontFamily: F, fontSize: 13, fontWeight: 600, color: '#92400e', lineHeight: 1.5 }}>
          Real block coming in next prompt
        </div>
        <div style={{ fontFamily: F, fontSize: 12, color: '#78350f', marginTop: 4, lineHeight: 1.5 }}>
          The interactive surface for this block is built in a follow-up. Phase 1 ships the orchestration and connected scenario; Phase 2 replaces each stub with its real component.
        </div>
      </div>

      <button
        type="button"
        onClick={() => onComplete && onComplete({
          block_id: metadata.id,
          stub: true,
          completed_at: new Date().toISOString(),
        })}
        style={{
          fontFamily: F, fontSize: 14, fontWeight: 700,
          padding: '10px 18px', borderRadius: 8,
          border: 'none', background: TEAL, color: '#fff',
          cursor: 'pointer',
        }}
      >
        Mark block complete (stub)
      </button>
    </div>
  )
}

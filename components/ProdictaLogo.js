const TEAL = '#3DD6D0'
const NAVY = '#0f2137'

// The floating icon — 3 input dots converging to a centre node with an output arrow.
// Used standalone and inside the favicon square.
export function ProdictaIcon({ size = 36 }) {
  // Scale all coordinates from a 44×32 master grid
  const s = size / 44
  const w = 44 * s
  const h = 32 * s

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 44 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, display: 'block' }}
    >
      {/* ── Converging lines ── */}
      <line x1="7.5" y1="4"  x2="18" y2="16" stroke={TEAL} strokeWidth="1.3" strokeLinecap="round" opacity="0.35" />
      <line x1="7.5" y1="16" x2="18" y2="16" stroke={TEAL} strokeWidth="1.3" strokeLinecap="round" opacity="0.5"  />
      <line x1="7.5" y1="28" x2="18" y2="16" stroke={TEAL} strokeWidth="1.3" strokeLinecap="round" opacity="0.7"  />

      {/* ── Centre glow ── */}
      <circle cx="24" cy="16" r="14" fill={TEAL} opacity="0.06" />
      <circle cx="24" cy="16" r="10" fill={TEAL} opacity="0.08" />

      {/* ── Left input dots ── */}
      <circle cx="5" cy="4"  r="2.5" fill={TEAL} opacity="0.4"  />
      <circle cx="5" cy="16" r="2.5" fill={TEAL} opacity="0.55" />
      <circle cx="5" cy="28" r="2.5" fill={TEAL} opacity="0.7"  />

      {/* ── Centre node (solid, on top of glow) ── */}
      <circle cx="24" cy="16" r="6" fill={TEAL} />

      {/* ── Output arrow ── */}
      <line x1="30" y1="16" x2="37" y2="16" stroke={TEAL} strokeWidth="1.5" strokeLinecap="round" />
      <polyline
        points="34,12.5 38,16 34,19.5"
        stroke={TEAL}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

export default function ProdictaLogo({ textColor = '#ffffff', size = 36 }) {
  const fontSize = Math.round(size * 0.5)
  // Icon height is 32/44 of the icon width
  const iconWidth = Math.round(size * 1.1)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: Math.round(size * 0.28) }}>
      <ProdictaIcon size={iconWidth} />
      <span style={{
        fontSize,
        fontWeight: 800,
        letterSpacing: '0.04em',
        lineHeight: 1,
        fontFamily: "'Outfit', system-ui, sans-serif",
      }}>
        <span style={{ color: textColor }}>PRO</span>
        <span style={{ color: TEAL }}>DICTA</span>
      </span>
    </div>
  )
}

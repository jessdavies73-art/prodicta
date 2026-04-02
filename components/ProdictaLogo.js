const TEAL = '#00BFA5'

export default function ProdictaLogo({ textColor = '#ffffff', size = 36 }) {
  const fontSize = Math.round(size * 0.5)
  const iconWidth = Math.round(size * 1.375) // 44/32 aspect ratio

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {/* Convergence icon: 3 input dots → centre node with glow → output arrow */}
      <svg
        width={iconWidth}
        height={size}
        viewBox="0 0 44 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0, display: 'block' }}
      >
        {/* Converging lines */}
        <line x1="7.5" y1="4"  x2="18" y2="16" stroke={TEAL} strokeWidth="1.3" strokeLinecap="round" opacity="0.35" />
        <line x1="7.5" y1="16" x2="18" y2="16" stroke={TEAL} strokeWidth="1.3" strokeLinecap="round" opacity="0.5"  />
        <line x1="7.5" y1="28" x2="18" y2="16" stroke={TEAL} strokeWidth="1.3" strokeLinecap="round" opacity="0.7"  />

        {/* Centre glow halos */}
        <circle cx="24" cy="16" r="14" fill={TEAL} opacity="0.06" />
        <circle cx="24" cy="16" r="10" fill={TEAL} opacity="0.08" />

        {/* Left input dots */}
        <circle cx="5" cy="4"  r="2.5" fill={TEAL} opacity="0.4"  />
        <circle cx="5" cy="16" r="2.5" fill={TEAL} opacity="0.55" />
        <circle cx="5" cy="28" r="2.5" fill={TEAL} opacity="0.7"  />

        {/* Centre node , solid, on top of glow */}
        <circle cx="24" cy="16" r="6" fill={TEAL} />

        {/* Output arrow */}
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

      {/* Wordmark: PRO in textColor, DICTA in jade */}
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

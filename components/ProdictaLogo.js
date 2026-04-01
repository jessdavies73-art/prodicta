const TEAL = '#3DD6D0'

export default function ProdictaLogo({ textColor = '#ffffff', size = 36 }) {
  const fontSize = Math.round(size * 0.5)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 56 56"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <circle cx="28" cy="28" r="26" fill={TEAL} />
        <path d="M28 8 L44 16 L44 30 Q44 44 28 48 Q12 44 12 30 L12 16 Z" fill="none" stroke="white" strokeWidth="2.2" strokeLinejoin="round" />
        <rect x="17" y="34" width="4" height="8" rx="1" fill="white" opacity="0.5" />
        <rect x="23" y="30" width="4" height="12" rx="1" fill="white" opacity="0.7" />
        <rect x="29" y="26" width="4" height="16" rx="1" fill="white" opacity="0.85" />
        <rect x="35" y="22" width="4" height="20" rx="1" fill="white" />
        <path d="M20 18 L26 24 L38 14" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      {/* Wordmark: PRO in textColor, DICTA in teal */}
      <span style={{
        fontSize,
        fontWeight: 800,
        letterSpacing: '0.5px',
        lineHeight: 1,
        fontFamily: "'Outfit', system-ui, sans-serif",
      }}>
        <span style={{ color: textColor }}>PRO</span>
        <span style={{ color: TEAL }}>DICTA</span>
      </span>
    </div>
  )
}

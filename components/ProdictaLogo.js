const TEAL = '#3DD6D0'

export default function ProdictaLogo({ textColor = '#ffffff', size = 36 }) {
  const fontSize = Math.round(size * 0.55)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: Math.round(size * 0.28) }}>
      {/* Geometric line eye icon */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        {/* Eye lens outline */}
        <path
          d="M4 20 C8 11, 32 11, 36 20 C32 29, 8 29, 4 20 Z"
          stroke={TEAL}
          strokeWidth="2.2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Iris */}
        <circle cx="20" cy="20" r="5.5" stroke={TEAL} strokeWidth="2.2" fill="none" />
        {/* Pupil */}
        <circle cx="20" cy="20" r="2" fill={TEAL} />
      </svg>

      {/* Wordmark: PRO in textColor, DICTA in teal */}
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

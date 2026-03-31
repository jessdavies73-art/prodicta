const TEAL = '#5bbfbd'

export default function ProdictaLogo({ textColor = '#ffffff', size = 36 }) {
  const fontSize = Math.round(size * 0.5)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {/* Teal circle with eye SVG */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        {/* Background circle */}
        <circle cx="18" cy="18" r="18" fill={TEAL} />
        {/* Eye outer shape */}
        <path
          d="M7 18 C10 12, 26 12, 29 18 C26 24, 10 24, 7 18 Z"
          fill="white"
        />
        {/* Iris */}
        <circle cx="18" cy="18" r="5" fill={TEAL} />
        {/* Pupil */}
        <circle cx="18" cy="18" r="2.5" fill="white" />
      </svg>

      {/* Wordmark */}
      <span style={{
        fontSize,
        fontWeight: 800,
        color: textColor,
        letterSpacing: '-0.4px',
        lineHeight: 1,
        fontFamily: "'Outfit', system-ui, sans-serif",
      }}>
        Prodicta
      </span>
    </div>
  )
}

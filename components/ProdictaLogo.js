const TEAL = '#3DD6D0'
const NAVY = '#0f2137'

/**
 * ProdictaLogo — PNG icon + PRO/DICTA wordmark.
 * textColor controls the PRO half; DICTA is always teal.
 * size controls the height of the PNG icon (width scales automatically).
 */
export default function ProdictaLogo({ textColor = '#ffffff', size = 36 }) {
  const fontSize = Math.round(size * 0.55)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: Math.round(size * 0.3) }}>
      <img
        src="/prodicta-logo.png"
        alt="Prodicta"
        style={{ height: size, width: 'auto', display: 'block', flexShrink: 0 }}
      />
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

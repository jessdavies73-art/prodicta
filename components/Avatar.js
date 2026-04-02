'use client'
const F = "'Outfit', system-ui, sans-serif"

// A-C: jade | D-F: indigo | G-I: purple | J-L: coral
// M-O: rose | P-R: amber  | S-U: blue   | V-Z: emerald
const RANGE_GRADIENTS = [
  ['#00BFA5', '#009688'], // A-C jade
  ['#4F46E5', '#3730A3'], // D-F indigo
  ['#7C3AED', '#6D28D9'], // G-I purple
  ['#F97316', '#EA580C'], // J-L coral
  ['#F43F5E', '#E11D48'], // M-O rose
  ['#F59E0B', '#D97706'], // P-R amber
  ['#3B82F6', '#2563EB'], // S-U blue
  ['#10B981', '#059669'], // V-Z emerald
]

function nameToGradient(name = '') {
  const char = (name.trim()[0] || '?').toUpperCase()
  const code = char.charCodeAt(0)
  // A=65 … Z=90  →  bucket 0–7 via 3-letter ranges
  if (code < 65 || code > 90) return RANGE_GRADIENTS[0]
  return RANGE_GRADIENTS[Math.floor((code - 65) / 3)]
}

function initials(name = '') {
  return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
}

export default function Avatar({ name = '', size = 36 }) {
  const [from, to] = nameToGradient(name)
  const fontSize = Math.round(size * 0.38)

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      fontFamily: F,
      fontSize,
      fontWeight: 700,
      color: '#fff',
      letterSpacing: '0.02em',
      userSelect: 'none',
    }}>
      {initials(name)}
    </div>
  )
}

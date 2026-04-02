'use client'

// Gradient assigned by first letter of name (3-letter buckets A-Z)
// A-C: jade | D-F: indigo | G-I: purple | J-L: coral
// M-O: rose | P-R: amber  | S-U: blue   | V-Z: emerald
const GRADIENTS = [
  ['#00BFA5', '#009688'], // 0  A-C  jade
  ['#4F46E5', '#3730A3'], // 1  D-F  indigo
  ['#7C3AED', '#6D28D9'], // 2  G-I  purple
  ['#F97316', '#EA580C'], // 3  J-L  coral
  ['#F43F5E', '#E11D48'], // 4  M-O  rose
  ['#F59E0B', '#D97706'], // 5  P-R  amber
  ['#3B82F6', '#2563EB'], // 6  S-U  blue
  ['#10B981', '#059669'], // 7  V-Z  emerald
]

function getGradient(name) {
  const first = (name || '').trim()[0]
  if (!first) return GRADIENTS[0]
  const code = first.toUpperCase().charCodeAt(0)
  if (code < 65 || code > 90) return GRADIENTS[0]
  // clamp to 0-7: A(65)→0, B(66)→0, C(67)→0, D(68)→1 … Z(90)→7
  const idx = Math.min(Math.floor((code - 65) / 3), 7)
  return GRADIENTS[idx]
}

function getInitials(name) {
  return (name || '').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
}

export default function Avatar({ name = '', size = 36 }) {
  const [from, to] = getGradient(name)
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: '#00BFA5',
      backgroundImage: 'linear-gradient(135deg, ' + from + ' 0%, ' + to + ' 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      fontFamily: "'Outfit', system-ui, sans-serif",
      fontSize: Math.round(size * 0.38),
      fontWeight: 700,
      color: '#fff',
      letterSpacing: '0.02em',
      userSelect: 'none',
    }}>
      {getInitials(name)}
    </div>
  )
}

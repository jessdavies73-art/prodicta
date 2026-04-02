'use client'

// A-C: jade | D-F: indigo | G-I: purple | J-L: coral
// M-O: rose | P-R: amber  | S-U: blue   | V-Z: emerald
const CLASSES = ['avatar-jade','avatar-indigo','avatar-purple','avatar-coral','avatar-rose','avatar-amber','avatar-blue','avatar-emerald']

function getClass(name) {
  const first = (name || '').trim()[0]
  if (!first) return CLASSES[0]
  const code = first.toUpperCase().charCodeAt(0)
  if (code < 65 || code > 90) return CLASSES[0]
  return CLASSES[Math.min(Math.floor((code - 65) / 3), 7)]
}

function getInitials(name) {
  return (name || '').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
}

export default function Avatar({ name = '', size = 36 }) {
  return (
    <div
      className={getClass(name)}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
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
      }}
    >
      {getInitials(name)}
    </div>
  )
}

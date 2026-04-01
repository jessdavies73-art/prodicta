const F = "'Outfit', system-ui, sans-serif"

const GRADIENTS = [
  ['#00BFA5', '#009688'], // Jade
  ['#4F46E5', '#3730A3'], // Indigo
  ['#7C3AED', '#6D28D9'], // Purple
  ['#F97316', '#EA580C'], // Coral
  ['#F43F5E', '#E11D48'], // Rose
  ['#F59E0B', '#D97706'], // Amber
  ['#3B82F6', '#2563EB'], // Blue
  ['#10B981', '#059669'], // Emerald
]

function nameToGradient(name = '') {
  const char = name.trim()[0]?.toUpperCase() || '?'
  const code = char.charCodeAt(0)
  return GRADIENTS[code % GRADIENTS.length]
}

function initials(name = '') {
  return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
}

let _id = 0
function uid() { return `ag-${++_id}` }

export default function Avatar({ name = '', size = 36 }) {
  const [from, to] = nameToGradient(name)
  const fontSize = Math.round(size * 0.38)
  const gradId = uid()

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

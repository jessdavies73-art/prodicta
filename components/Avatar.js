const TEAL = '#3DD6D0'
const NAVY = '#0f2137'
const F = "'Outfit', system-ui, sans-serif"

// Generate a consistent colour from a name string
function nameToColor(name = '') {
  const colors = [
    '#3DD6D0', '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6', '#0ea5e9', '#14b8a6',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function initials(name = '') {
  return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
}

export default function Avatar({ name = '', size = 36 }) {
  const bg = nameToColor(name)
  const fontSize = Math.round(size * 0.38)
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: bg,
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

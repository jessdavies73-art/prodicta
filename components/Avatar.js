'use client'

const GRADS = {
  'A': ['#00BFA5','#004D40'], 'B': ['#00BFA5','#004D40'], 'C': ['#00BFA5','#004D40'],
  'D': ['#818CF8','#3730A3'], 'E': ['#818CF8','#3730A3'], 'F': ['#818CF8','#3730A3'],
  'G': ['#A78BFA','#5B21B6'], 'H': ['#A78BFA','#5B21B6'], 'I': ['#A78BFA','#5B21B6'],
  'J': ['#FB923C','#C2410C'], 'K': ['#FB923C','#C2410C'], 'L': ['#FB923C','#C2410C'],
  'M': ['#FB7185','#9F1239'], 'N': ['#FB7185','#9F1239'], 'O': ['#FB7185','#9F1239'],
  'P': ['#FCD34D','#B45309'], 'Q': ['#FCD34D','#B45309'], 'R': ['#FCD34D','#B45309'],
  'S': ['#60A5FA','#1E40AF'], 'T': ['#60A5FA','#1E40AF'], 'U': ['#60A5FA','#1E40AF'],
  'V': ['#34D399','#065F46'], 'W': ['#34D399','#065F46'], 'X': ['#34D399','#065F46'],
  'Y': ['#34D399','#065F46'], 'Z': ['#34D399','#065F46'],
}

export default function Avatar({ name = '', size = 36 }) {
  const first = (name || '').trim()[0]
  const upper = (first || '?').toUpperCase()
  const [from, to] = GRADS[upper] || ['#00BFA5','#004D40']
  const initials = (name || '').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'

  return (
    <div
      ref={el => { if (el) el.style.background = 'linear-gradient(135deg, ' + from + ', ' + to + ')' }}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontSize: Math.round(size * 0.38),
        fontWeight: 700,
        color: '#fff',
      }}
    >
      {initials}
    </div>
  )
}

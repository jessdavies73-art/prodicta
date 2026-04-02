'use client'

const GRADS = {
  'A': ['#00BFA5','#1E3A5F'], 'B': ['#00BFA5','#1E3A5F'], 'C': ['#00BFA5','#1E3A5F'],
  'D': ['#818CF8','#E11D48'], 'E': ['#818CF8','#E11D48'], 'F': ['#818CF8','#E11D48'],
  'G': ['#A78BFA','#F97316'], 'H': ['#A78BFA','#F97316'], 'I': ['#A78BFA','#F97316'],
  'J': ['#FB923C','#7C3AED'], 'K': ['#FB923C','#7C3AED'], 'L': ['#FB923C','#7C3AED'],
  'M': ['#FB7185','#3B82F6'], 'N': ['#FB7185','#3B82F6'], 'O': ['#FB7185','#3B82F6'],
  'P': ['#FCD34D','#EF4444'], 'Q': ['#FCD34D','#EF4444'], 'R': ['#FCD34D','#EF4444'],
  'S': ['#60A5FA','#10B981'], 'T': ['#60A5FA','#10B981'], 'U': ['#60A5FA','#10B981'],
  'V': ['#34D399','#6366F1'], 'W': ['#34D399','#6366F1'], 'X': ['#34D399','#6366F1'],
  'Y': ['#34D399','#6366F1'], 'Z': ['#34D399','#6366F1'],
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

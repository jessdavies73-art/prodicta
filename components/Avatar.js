'use client'

const GRADS = {
  'A': ['#00BFA5','#009688'], 'B': ['#00BFA5','#009688'], 'C': ['#00BFA5','#009688'],
  'D': ['#4F46E5','#3730A3'], 'E': ['#4F46E5','#3730A3'], 'F': ['#4F46E5','#3730A3'],
  'G': ['#7C3AED','#6D28D9'], 'H': ['#7C3AED','#6D28D9'], 'I': ['#7C3AED','#6D28D9'],
  'J': ['#F97316','#EA580C'], 'K': ['#F97316','#EA580C'], 'L': ['#F97316','#EA580C'],
  'M': ['#F43F5E','#E11D48'], 'N': ['#F43F5E','#E11D48'], 'O': ['#F43F5E','#E11D48'],
  'P': ['#F59E0B','#D97706'], 'Q': ['#F59E0B','#D97706'], 'R': ['#F59E0B','#D97706'],
  'S': ['#3B82F6','#2563EB'], 'T': ['#3B82F6','#2563EB'], 'U': ['#3B82F6','#2563EB'],
  'V': ['#10B981','#059669'], 'W': ['#10B981','#059669'], 'X': ['#10B981','#059669'],
  'Y': ['#10B981','#059669'], 'Z': ['#10B981','#059669'],
}

let counter = 0

export default function Avatar({ name = '', size = 36 }) {
  const first = (name || '').trim()[0]
  const upper = (first || '?').toUpperCase()
  const [from, to] = GRADS[upper] || ['#00BFA5','#009688']
  const initials = (name || '').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
  const id = 'av-' + (counter++)

  return (
    <>
      <style>{`#${id}{background:linear-gradient(135deg,${from},${to})}`}</style>
      <div id={id} style={{
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
      }}>
        {initials}
      </div>
    </>
  )
}

'use client'
import { useState } from 'react'
import { Ic } from '@/components/Icons'
import { NAVY, TX3, F } from '@/lib/constants'

export default function InfoTooltip({ text, light = false }) {
  const [visible, setVisible] = useState(false)
  const tooltipBg = light ? '#1e3a52' : NAVY
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <span
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        style={{ cursor: 'help', display: 'inline-flex', alignItems: 'center' }}
      >
        <Ic name="info" size={14} color={light ? 'rgba(255,255,255,0.45)' : TX3} />
      </span>
      {visible && (
        <span style={{
          position: 'absolute',
          bottom: 'calc(100% + 8px)',
          left: '50%',
          transform: 'translateX(-50%)',
          background: tooltipBg,
          color: '#fff',
          fontSize: 12,
          fontFamily: F,
          fontWeight: 400,
          lineHeight: 1.55,
          padding: '9px 13px',
          borderRadius: 8,
          width: 240,
          zIndex: 200,
          boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
          pointerEvents: 'none',
          textAlign: 'left',
          whiteSpace: 'normal',
          border: light ? '1px solid rgba(255,255,255,0.15)' : 'none',
        }}>
          {text}
          <span style={{
            position: 'absolute', top: '100%', left: '50%',
            transform: 'translateX(-50%)', width: 0, height: 0,
            borderLeft: '6px solid transparent', borderRight: '6px solid transparent',
            borderTop: `6px solid ${tooltipBg}`,
          }} />
        </span>
      )}
    </span>
  )
}

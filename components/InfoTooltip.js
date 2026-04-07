'use client'
import { useState, useRef, useEffect } from 'react'
import { Ic } from '@/components/Icons'
import { NAVY, TX3, F } from '@/lib/constants'

export default function InfoTooltip({ text, light = false }) {
  const [pos, setPos] = useState(null)
  const [pinned, setPinned] = useState(false)
  const ref = useRef(null)
  const tooltipBg = light ? '#1e3a52' : NAVY

  function open() {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect()
      setPos({ top: r.top, left: r.left + r.width / 2 })
    }
  }

  function close() {
    setPos(null)
    setPinned(false)
  }

  // Close pinned tooltip when clicking elsewhere or pressing Escape
  useEffect(() => {
    if (!pinned) return
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) close()
    }
    function onKey(e) { if (e.key === 'Escape') close() }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [pinned])

  if (!text) return null

  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <span
        ref={ref}
        onMouseEnter={() => { if (!pinned) open() }}
        onMouseLeave={() => { if (!pinned) setPos(null) }}
        onClick={(e) => {
          e.stopPropagation()
          if (pinned) close()
          else { open(); setPinned(true) }
        }}
        role="button"
        tabIndex={0}
        aria-label="Show explanation"
        style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
      >
        <Ic name="info" size={14} color={light ? 'rgba(255,255,255,0.45)' : TX3} />
      </span>
      {pos && (
        <span style={{
          position: 'fixed',
          bottom: `calc(100vh - ${pos.top}px + 8px)`,
          left: pos.left,
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
          zIndex: 9999,
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

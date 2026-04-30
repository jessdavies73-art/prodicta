'use client'
import { useState, useRef, useEffect, useId, useLayoutEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Ic } from '@/components/Icons'
import { NAVY, TX3, F } from '@/lib/constants'

const TOOLTIP_WIDTH = 280
const GAP = 8
const VIEWPORT_PAD = 8
const HIDE_DELAY = 100
const FADE_MS = 200

export default function InfoTooltip({ text, light = false }) {
  const [open, setOpen] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [coords, setCoords] = useState(null)
  const [mounted, setMounted] = useState(false)
  const triggerRef = useRef(null)
  const tooltipRef = useRef(null)
  const hideTimer = useRef(null)
  const id = useId()
  const tooltipBg = light ? '#1e3a52' : NAVY

  useEffect(() => { setMounted(true) }, [])

  const cancelHide = useCallback(() => {
    if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null }
  }, [])

  const show = useCallback(() => {
    cancelHide()
    setOpen(true)
  }, [cancelHide])

  const hide = useCallback(() => {
    cancelHide()
    setOpen(false)
    setPinned(false)
    setCoords(null)
  }, [cancelHide])

  const scheduleHide = useCallback(() => {
    cancelHide()
    hideTimer.current = setTimeout(() => {
      setOpen(false)
      setCoords(null)
    }, HIDE_DELAY)
  }, [cancelHide])

  // Compute tooltip position relative to viewport from the trigger rect.
  // Uses portal-anchored fixed positioning so transformed ancestors do not
  // capture the tooltip's containing block (which was the root cause of
  // tooltips rendering far from their trigger icon).
  const measure = useCallback(() => {
    const trigger = triggerRef.current
    const tip = tooltipRef.current
    if (!trigger) return
    const r = trigger.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const tipW = tip ? tip.offsetWidth : TOOLTIP_WIDTH
    const tipH = tip ? tip.offsetHeight : 0
    const centerX = r.left + r.width / 2
    let left = centerX - tipW / 2
    if (left < VIEWPORT_PAD) left = VIEWPORT_PAD
    if (left + tipW > vw - VIEWPORT_PAD) left = vw - VIEWPORT_PAD - tipW
    const arrowLeft = Math.max(10, Math.min(tipW - 10, centerX - left))
    let top = r.bottom + GAP
    let placement = 'bottom'
    if (tipH && top + tipH > vh - VIEWPORT_PAD) {
      const above = r.top - GAP - tipH
      if (above >= VIEWPORT_PAD) { top = above; placement = 'top' }
    }
    setCoords({ top, left, arrowLeft, placement })
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    measure()
  }, [open, measure])

  useEffect(() => {
    if (!open) return
    // Re-measure once the tooltip has rendered so we know its real height
    // for the bottom-edge flip and so the arrow lands on the trigger.
    const id = requestAnimationFrame(measure)
    const onResize = () => measure()
    const onScroll = () => measure()
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      cancelAnimationFrame(id)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open, measure])

  // Dismiss on outside click (pinned only) and ESC key.
  useEffect(() => {
    if (!open) return
    function onDocPointer(e) {
      if (!pinned) return
      const t = e.target
      if (triggerRef.current && triggerRef.current.contains(t)) return
      if (tooltipRef.current && tooltipRef.current.contains(t)) return
      hide()
    }
    function onKey(e) { if (e.key === 'Escape') hide() }
    document.addEventListener('mousedown', onDocPointer)
    document.addEventListener('touchstart', onDocPointer, { passive: true })
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocPointer)
      document.removeEventListener('touchstart', onDocPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, pinned, hide])

  useEffect(() => () => cancelHide(), [cancelHide])

  if (!text) return null

  const onPointerEnter = () => { if (!pinned) show() }
  const onPointerLeave = () => { if (!pinned) scheduleHide() }
  const onClick = (e) => {
    e.stopPropagation()
    if (pinned) { hide(); return }
    setPinned(true)
    show()
  }
  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick(e)
    }
  }

  const tooltipNode = open && coords && mounted ? createPortal(
    <span
      ref={tooltipRef}
      id={id}
      role="tooltip"
      onMouseEnter={cancelHide}
      onMouseLeave={scheduleHide}
      style={{
        position: 'fixed',
        top: coords.top,
        left: coords.left,
        width: TOOLTIP_WIDTH,
        maxWidth: `calc(100vw - ${VIEWPORT_PAD * 2}px)`,
        background: tooltipBg,
        color: '#fff',
        fontSize: 13,
        fontFamily: F,
        fontWeight: 400,
        lineHeight: 1.55,
        padding: '10px 14px',
        borderRadius: 8,
        zIndex: 10000,
        boxShadow: '0 6px 20px rgba(15,33,55,0.28)',
        textAlign: 'left',
        whiteSpace: 'normal',
        border: light ? '1px solid rgba(255,255,255,0.15)' : 'none',
        animation: `pdInfoTipIn ${FADE_MS}ms ease both`,
        pointerEvents: 'auto',
      }}
    >
      {text}
      <span aria-hidden style={{
        position: 'absolute',
        left: coords.arrowLeft,
        transform: 'translateX(-50%)',
        width: 0, height: 0,
        borderLeft: '6px solid transparent',
        borderRight: '6px solid transparent',
        ...(coords.placement === 'top'
          ? { top: '100%', borderTop: `6px solid ${tooltipBg}` }
          : { bottom: '100%', borderBottom: `6px solid ${tooltipBg}` }),
      }} />
    </span>,
    document.body
  ) : null

  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <span
        ref={triggerRef}
        onMouseEnter={onPointerEnter}
        onMouseLeave={onPointerLeave}
        onFocus={onPointerEnter}
        onBlur={onPointerLeave}
        onClick={onClick}
        onKeyDown={onKeyDown}
        role="button"
        tabIndex={0}
        aria-label="Show explanation"
        aria-describedby={open ? id : undefined}
        style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', lineHeight: 0 }}
      >
        <Ic name="info" size={14} color={light ? 'rgba(255,255,255,0.45)' : TX3} />
      </span>
      {tooltipNode}
      {mounted && (
        <style>{`@keyframes pdInfoTipIn { from { opacity: 0; transform: translateY(-2px) } to { opacity: 1; transform: translateY(0) } }`}</style>
      )}
    </span>
  )
}

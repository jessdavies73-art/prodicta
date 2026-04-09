'use client'
import { useState, useEffect, useCallback } from 'react'

export default function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth <= breakpoint
  })

  const check = useCallback(() => {
    setIsMobile(window.innerWidth <= breakpoint)
  }, [breakpoint])

  useEffect(() => {
    // Ensure correct value on mount (covers SSR hydration)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [check])

  return isMobile
}

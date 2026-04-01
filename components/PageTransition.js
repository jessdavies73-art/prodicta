'use client'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

export default function PageTransition({ children }) {
  const pathname = usePathname()
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.animation = 'none'
    void el.offsetHeight
    el.style.animation = 'pageIn 0.22s ease-out'
  }, [pathname])

  return (
    <>
      <style>{`@keyframes pageIn { from { opacity: 0; transform: translateY(5px) } to { opacity: 1; transform: translateY(0) } }`}</style>
      <div ref={ref} style={{ animation: 'pageIn 0.22s ease-out' }}>
        {children}
      </div>
    </>
  )
}

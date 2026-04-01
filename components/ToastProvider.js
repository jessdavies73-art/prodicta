'use client'
import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

export function useToast() {
  return useContext(ToastContext)
}

function ToastItem({ id, message, type, onRemove }) {
  const isSuccess = type !== 'error'
  const color = isSuccess ? '#16a34a' : '#dc2626'
  const bg = isSuccess ? '#f0fdf4' : '#fef2f2'
  const bd = isSuccess ? '#bbf7d0' : '#fecaca'

  return (
    <div
      onClick={() => onRemove(id)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 18px',
        borderRadius: 10,
        background: '#fff',
        border: `1px solid ${bd}`,
        boxShadow: '0 4px 20px rgba(15,33,55,0.14), 0 1px 4px rgba(15,33,55,0.08)',
        fontFamily: "'Outfit', system-ui, sans-serif",
        fontSize: 13.5,
        fontWeight: 600,
        color,
        animation: 'slideInToast 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        minWidth: 260,
        maxWidth: 360,
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      <div style={{
        width: 20,
        height: 20,
        borderRadius: '50%',
        background: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        {isSuccess ? (
          <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        )}
      </div>
      {message}
    </div>
  )
}

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const toast = useCallback((message, type = 'success', duration = 3000) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
  }, [])

  function removeToast(id) {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div style={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        pointerEvents: 'none',
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{ pointerEvents: 'auto' }}>
            <ToastItem id={t.id} message={t.message} type={t.type} onRemove={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

'use client'

export default function GlobalError({ error, reset }) {
  return (
    <html>
      <body style={{ margin: 0, fontFamily: "'Outfit', system-ui, sans-serif", background: '#f7f9fb' }}>
        <div style={{
          maxWidth: 640,
          margin: '80px auto',
          padding: '40px 36px',
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          border: '1px solid #fecaca',
        }}>
          <div style={{ color: '#ef4444', fontWeight: 800, fontSize: 18, marginBottom: 12 }}>
            Application Error
          </div>
          <p style={{ color: '#5e6b7f', fontSize: 14, marginBottom: 16, lineHeight: 1.6 }}>
            Something went wrong. The error message below may help diagnose the issue.
          </p>
          <pre style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 8,
            padding: '14px 16px',
            fontSize: 12,
            color: '#dc2626',
            overflowX: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            marginBottom: 20,
          }}>
            {error?.message || 'Unknown error'}
            {error?.stack ? '\n\n' + error.stack : ''}
          </pre>
          <button
            onClick={reset}
            style={{
              background: '#0f2137',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: "'Outfit', system-ui, sans-serif",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}

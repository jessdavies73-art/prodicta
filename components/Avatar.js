'use client'
import { ACOL } from '../lib/constants'

export default function Avatar({ name, size = 36 }) {
  const idx = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % ACOL.length
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.35,
      background: `linear-gradient(135deg,${ACOL[idx]},${ACOL[(idx + 2) % ACOL.length]})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.36, fontWeight: 700, color: "#fff", flexShrink: 0
    }}>
      {name.split(" ").map(w => w[0]).join("").slice(0, 2)}
    </div>
  )
}

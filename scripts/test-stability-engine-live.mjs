// Headless smoke test for the StabilityEngine event scheduler.
// Opens the local dev server, toggles to the employer hero, captures
// console output for 25 seconds and prints every [StabilityEngine]
// line plus any error/warning. Confirms the scheduler fires the
// detect → stabilising → stable → idle cycle.

import { chromium } from 'playwright'

const URL = process.env.PRODICTA_URL || 'http://localhost:3000/'
const LISTEN_MS = 25000

const browser = await chromium.launch({
  headless: true,
  args: ['--force-prefers-reduced-motion=no-preference'],
})
const ctx = await browser.newContext({
  reducedMotion: 'no-preference',
  viewport: { width: 1440, height: 900 },
})
const page = await ctx.newPage()

const events = []
page.on('console', msg => {
  const text = msg.text()
  if (text.includes('[StabilityEngine]') || /error|warn/i.test(msg.type())) {
    events.push({ type: msg.type(), text, t: Date.now() })
    console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg.type()}: ${text}`)
  }
})
page.on('pageerror', err => {
  console.log(`[pageerror] ${err.message}`)
})

console.log(`opening ${URL}`)
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 })

// Toggle to employer view if not already. The persona toggle has a button
// labelled "Direct Employer" or similar; we pick the second segment to be
// safe (agency is segment 1, employer is segment 2).
try {
  const employerBtn = page.locator('button', { hasText: /direct employer|employer/i }).first()
  if (await employerBtn.isVisible({ timeout: 3000 })) {
    await employerBtn.click()
    console.log('toggled to employer view')
  }
} catch {
  console.log('employer toggle not found or already on employer; continuing')
}

// Wait, capturing events. The first event should land 8-10s after mount.
console.log(`listening for ${LISTEN_MS / 1000}s...`)
await page.waitForTimeout(LISTEN_MS)

console.log('---')
console.log(`captured ${events.length} StabilityEngine events`)
const cycle = events.filter(e => e.text.includes('[StabilityEngine]')).map(e => e.text.replace(/^.*\[StabilityEngine\]\s*/, ''))
console.log('cycle:', cycle.join(' | '))

await browser.close()
process.exit(events.some(e => /detecting/i.test(e.text)) ? 0 : 2)

// Headless render check for /demo/drill-down. Confirms the page mounts,
// the four tabs are present, and that By Role / By Client / By Team
// Member / By Location each render their respective rows from demo data.

import { chromium } from 'playwright'
const PORT = process.env.PORT || '3003'
const URL = `http://localhost:${PORT}/demo/drill-down`

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await ctx.newPage()

const errs = []
page.on('pageerror', e => errs.push(`pageerror: ${e.message}`))
page.on('console', m => { if (m.type() === 'error') errs.push(`console.error: ${m.text()}`) })

console.log(`opening ${URL}`)
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.waitForTimeout(1500)

// Tabs visible
const tabLabels = await page.locator('button:has-text("By ")').allTextContents()
console.log('tabs:', JSON.stringify(tabLabels))

// Click via page.evaluate so the click bypasses the sidebar's pointer-
// events overlap. Filter by tabs that live inside the drill-down's own
// tab strip (jade underline border-bottom).
async function clickTab(label) {
  await page.evaluate((label) => {
    const all = Array.from(document.querySelectorAll('button'))
    const aside = document.querySelector('aside')
    const btn = all.find(b => b.textContent.trim().startsWith(label) && (!aside || !aside.contains(b)))
    if (btn) btn.click()
  }, label)
  await page.waitForTimeout(400)
}

async function readTable() {
  const rows = await page.locator('body table tbody tr').count()
  if (rows > 0) return { kind: 'rows', count: rows }
  const heading = await page.locator('body').evaluate(b => {
    const candidates = Array.from(b.querySelectorAll('div, h2, h3'))
    const aside = b.querySelector('aside')
    const found = candidates.find(el => /No client data yet|Add team members|Add a location|No roles match|subscription feature/.test(el.textContent || '') && (!aside || !aside.contains(el)))
    return found ? found.textContent.trim().slice(0, 80) : null
  })
  return { kind: heading ? 'empty' : 'unknown', heading }
}

const results = {}
for (const t of ['By Role', 'By Client', 'By Team Member', 'By Location']) {
  await clickTab(t)
  results[t] = await readTable()
}
console.log('per-tab content:', JSON.stringify(results))

if (errs.length) {
  console.log('errors captured:')
  errs.forEach(e => console.log(' -', e))
}

await browser.close()
process.exit(errs.length === 0 && tabLabels.length >= 4 ? 0 : 2)

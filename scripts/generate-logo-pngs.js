/**
 * Generate the standalone PRODICTA logo SVG and PNG variants for use in
 * external assets (email signatures, partner co-branding, etc.).
 *
 * The visual design must match components/ProdictaLogo.js exactly:
 *   - Convergence icon: 3 input dots → centre node with glow → output arrow
 *   - Wordmark: PRO in navy #0F2137, DICTA in jade #00BFA5
 *   - Outfit ExtraBold (800), 0.04em letter-spacing
 *
 * Outfit is a Google webfont. To make the rasterised PNGs match the
 * website pixel-for-pixel rather than falling back to whatever the
 * system has, the script downloads Outfit ExtraBold once and embeds it
 * as a base64 woff2 inside the SVG via @font-face. Sharp + librsvg
 * picks it up and renders with the real font.
 *
 * Run:
 *   node scripts/generate-logo-pngs.js
 *
 * Outputs:
 *   public/brand/prodicta-logo.svg
 *   public/brand/prodicta-logo-120.png
 *   public/brand/prodicta-logo-180.png
 *   public/brand/prodicta-logo-240.png
 */

const fs = require('node:fs')
const path = require('node:path')
const https = require('node:https')
const sharp = require('sharp')

const NAVY = '#0f2137'
const TEAL = '#00BFA5'

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'brand')
const PNG_WIDTHS = [120, 180, 240]

// Outfit ExtraBold (weight 800), Latin subset. Pulled from the Google
// Fonts CDN once and base64-embedded so the SVG renders with the real
// brand font wherever it lands (websites, email clients that support
// SVG, sharp's librsvg, etc.).
const OUTFIT_URL = 'https://fonts.gstatic.com/s/outfit/v11/QGYvz_MVcBeNP4NJtEtq.woff2'

function fetchBuffer(url, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirectsLeft > 0) {
        return fetchBuffer(res.headers.location, redirectsLeft - 1).then(resolve, reject)
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Font fetch failed: HTTP ${res.statusCode} for ${url}`))
      }
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    }).on('error', reject)
  })
}

function buildSvg(outfitBase64) {
  // Geometry: 44x32 icon + 10px gap + wordmark. The wordmark is sized
  // at fontSize = 0.5 * iconHeight to match ProdictaLogo's React layout.
  // We pick an iconHeight of 64 (high-res master), then scale the whole
  // SVG when rasterising at 120/180/240 widths.
  const iconHeight = 64
  const iconWidth  = Math.round(iconHeight * 1.375) // = 88
  const gap        = Math.round(iconHeight * 0.3125) // = 20, keeps the 10/32 ratio
  const fontSize   = Math.round(iconHeight * 0.5)    // = 32
  // Wordmark width: PRODICTA at 32px ExtraBold + 0.04em tracking is
  // approximately 7.45 * fontSize wide. Round generously so glyphs are
  // not clipped by the SVG viewBox.
  const wordmarkWidth = Math.round(fontSize * 8.0)
  const totalWidth  = iconWidth + gap + wordmarkWidth
  const totalHeight = iconHeight

  // Icon paths are a 1:1 copy of components/ProdictaLogo.js, scaled
  // from the original 44x32 viewBox up to iconWidth x iconHeight by
  // wrapping in a transform.
  const scale = iconHeight / 32
  const wordmarkX = iconWidth + gap
  const wordmarkY = Math.round(iconHeight / 2 + fontSize * 0.34) // baseline
  const fontFace = outfitBase64
    ? `<style><![CDATA[
      @font-face {
        font-family: 'Outfit';
        font-weight: 800;
        font-style: normal;
        src: url(data:font/woff2;base64,${outfitBase64}) format('woff2');
      }
    ]]></style>`
    : ''

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="${totalWidth}" height="${totalHeight}">
  ${fontFace}
  <g transform="translate(0,0) scale(${scale})">
    <!-- Converging lines -->
    <line x1="7.5" y1="4"  x2="18" y2="16" stroke="${TEAL}" stroke-width="1.3" stroke-linecap="round" opacity="0.35" />
    <line x1="7.5" y1="16" x2="18" y2="16" stroke="${TEAL}" stroke-width="1.3" stroke-linecap="round" opacity="0.5"  />
    <line x1="7.5" y1="28" x2="18" y2="16" stroke="${TEAL}" stroke-width="1.3" stroke-linecap="round" opacity="0.7"  />
    <!-- Centre glow halos -->
    <circle cx="24" cy="16" r="14" fill="${TEAL}" opacity="0.06" />
    <circle cx="24" cy="16" r="10" fill="${TEAL}" opacity="0.08" />
    <!-- Left input dots -->
    <circle cx="5" cy="4"  r="2.5" fill="${TEAL}" opacity="0.4"  />
    <circle cx="5" cy="16" r="2.5" fill="${TEAL}" opacity="0.55" />
    <circle cx="5" cy="28" r="2.5" fill="${TEAL}" opacity="0.7"  />
    <!-- Centre node, solid, on top of glow -->
    <circle cx="24" cy="16" r="6" fill="${TEAL}" />
    <!-- Output arrow -->
    <line x1="30" y1="16" x2="37" y2="16" stroke="${TEAL}" stroke-width="1.5" stroke-linecap="round" />
    <polyline points="34,12.5 38,16 34,19.5" stroke="${TEAL}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none" />
  </g>
  <text x="${wordmarkX}" y="${wordmarkY}" font-family="Outfit, 'Outfit', system-ui, sans-serif" font-weight="800" font-size="${fontSize}" letter-spacing="${(0.04 * fontSize).toFixed(2)}">
    <tspan fill="${NAVY}">PRO</tspan><tspan fill="${TEAL}">DICTA</tspan>
  </text>
</svg>
`
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  console.log('[logo] fetching Outfit ExtraBold woff2 from Google Fonts CDN...')
  let fontBase64 = ''
  try {
    const fontBuffer = await fetchBuffer(OUTFIT_URL)
    fontBase64 = fontBuffer.toString('base64')
    console.log(`[logo] font bytes: ${fontBuffer.length}`)
  } catch (err) {
    console.warn(`[logo] font fetch failed (${err.message}). PNGs will fall back to system sans-serif.`)
  }

  const svgWithFont    = buildSvg(fontBase64)
  // The on-disk SVG keeps the embedded font so any consumer (email
  // client, browser, etc.) renders with Outfit without a network call.
  const svgPath = path.join(OUTPUT_DIR, 'prodicta-logo.svg')
  fs.writeFileSync(svgPath, svgWithFont)
  console.log(`[logo] wrote ${svgPath} (${fs.statSync(svgPath).size} bytes)`)

  for (const w of PNG_WIDTHS) {
    const outPath = path.join(OUTPUT_DIR, `prodicta-logo-${w}.png`)
    await sharp(Buffer.from(svgWithFont), { density: 600 })
      .resize({ width: w })
      .png({ compressionLevel: 9 })
      .toFile(outPath)
    console.log(`[logo] wrote ${outPath} (${fs.statSync(outPath).size} bytes)`)
  }

  console.log('[logo] done.')
}

main().catch(err => {
  console.error('[logo] failed:', err)
  process.exit(1)
})

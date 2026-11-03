// Draws simple illustrated product images as SVG data URIs, so the demo catalog needs no network and
// never shows broken images. Real products (from the analyzer) use real image URLs instead.
const W = 600
const H = 750

const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)))
export function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16)
  const t = amount < 0 ? 0 : 255
  const p = Math.abs(amount)
  const mix = (c) => clamp(c + (t - c) * p)
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => mix(c).toString(16).padStart(2, '0')).join('')}`
}

const frame = (body, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7f8fa"/><stop offset="1" stop-color="#e6e9ee"/></linearGradient>${defs}</defs><rect width="${W}" height="${H}" fill="url(#bg)"/>${body}</svg>`

const shadow = (cy = 690, rx = 190) => `<ellipse cx="300" cy="${cy}" rx="${rx}" ry="16" fill="#1b1f2a" opacity="0.08"/>`

function detailView(hex) {
  const dark = shade(hex, -0.18)
  const light = shade(hex, 0.14)
  const defs = `<pattern id="weave" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="14" height="14" fill="${hex}"/><rect width="7" height="14" fill="${light}" opacity="0.55"/><rect width="14" height="7" fill="${dark}" opacity="0.25"/></pattern>`
  return frame(
    `<rect x="40" y="60" width="520" height="630" rx="24" fill="url(#weave)"/>
     <path d="M70 240 H530" stroke="${dark}" stroke-width="3" stroke-dasharray="14 10" fill="none"/>
     <path d="M70 250 H530" stroke="${light}" stroke-width="2" stroke-dasharray="14 10" fill="none" opacity="0.7"/>
     <rect x="215" y="420" width="170" height="90" rx="10" fill="#fff" opacity="0.92"/>
     <path d="M235 455 H365 M235 478 H320" stroke="#1b1f2a" stroke-width="5" stroke-linecap="round" opacity="0.5"/>`,
    defs,
  )
}

// ---- Topwear ----
function top(subtype, hex, back) {
  const dark = shade(hex, -0.2)
  const light = shade(hex, 0.18)
  const neck = back ? 170 : 205
  const long = subtype === 'hoodie' || subtype === 'overshirt'
  const body = long
    ? `M205 140 L120 190 L82 520 L140 535 L168 300 L168 640 L432 640 L432 300 L460 535 L518 520 L480 190 L395 140 Q300 ${neck} 205 140 Z`
    : `M205 140 L120 190 L68 305 L130 332 L165 275 L165 640 L435 640 L435 275 L470 332 L532 305 L480 190 L395 140 Q300 ${neck} 205 140 Z`
  let extras = ''
  let behind = ''
  if (subtype === 'hoodie') {
    behind = `<path d="M205 140 Q300 50 395 140 Q350 ${back ? 200 : 225} 300 ${back ? 205 : 235} Q250 ${back ? 200 : 225} 205 140 Z" fill="${dark}"/>`
    if (!back) extras += `<path d="M215 480 L385 480 L408 575 L192 575 Z" fill="${light}" opacity="0.65"/><path d="M270 235 V330 M330 235 V330" stroke="${light}" stroke-width="6" stroke-linecap="round"/>`
  }
  if (subtype === 'shirt' || subtype === 'overshirt') {
    if (!back) {
      extras += `<path d="M205 140 L296 232 L250 250 L188 168 Z M395 140 L304 232 L350 250 L412 168 Z" fill="${light}" stroke="${dark}" stroke-width="2"/>`
      extras += `<path d="M300 235 V640" stroke="${dark}" stroke-width="3"/>` + [290, 360, 430, 500, 570].map((y) => `<circle cx="300" cy="${y}" r="6" fill="${dark}"/>`).join('')
      extras += `<rect x="215" y="330" width="62" height="70" rx="4" fill="none" stroke="${dark}" stroke-width="2.5"/>`
    } else {
      extras += `<path d="M168 215 Q300 250 432 215" stroke="${dark}" stroke-width="3" fill="none"/><path d="M300 215 V250" stroke="${dark}" stroke-width="3"/>`
    }
  }
  if (subtype === 'tshirt') {
    extras += back
      ? `<path d="M205 140 Q300 170 395 140" stroke="${dark}" stroke-width="10" fill="none" stroke-linecap="round"/>`
      : `<path d="M205 140 Q300 200 395 140" stroke="${dark}" stroke-width="10" fill="none" stroke-linecap="round"/>`
    extras += `<path d="M165 625 H435" stroke="${dark}" stroke-width="3" stroke-dasharray="9 7"/>`
  }
  return frame(`${shadow()}${behind}<path d="${body}" fill="${hex}" stroke="${dark}" stroke-width="3" stroke-linejoin="round"/>${extras}`)
}

// ---- Bottomwear ----
function bottom(subtype, hex, back) {
  const dark = shade(hex, -0.22)
  const light = shade(hex, 0.18)
  const endY = subtype === 'shorts' ? 420 : 660
  const jog = subtype === 'joggers'
  const oL = jog ? 212 : 172
  const oR = 600 - oL
  const iL = jog ? 282 : 290
  const iR = 600 - iL
  const body = `M190 110 L410 110 L${oR + (jog ? 0 : 6)} ${endY} L${iR} ${endY} L300 ${endY > 500 ? 300 : 290} L${iL} ${endY} L${oL - (jog ? 0 : 6)} ${endY} Z`
  let extras = `<rect x="190" y="110" width="220" height="30" fill="${dark}" opacity="0.5"/>`
  extras += jog
    ? `<path d="M300 140 V190" stroke="${light}" stroke-width="5"/><rect x="${oL}" y="${endY - 40}" width="${iL - oL}" height="40" fill="${dark}"/><rect x="${iR}" y="${endY - 40}" width="${oR - iR}" height="40" fill="${dark}"/>`
    : ''
  if (!back) {
    extras += `<path d="M200 140 Q235 175 245 235" stroke="${dark}" stroke-width="3" fill="none"/><path d="M400 140 Q365 175 355 235" stroke="${dark}" stroke-width="3" fill="none"/><path d="M300 140 V300" stroke="${dark}" stroke-width="3"/>`
  } else {
    extras += `<path d="M215 160 L260 235 L300 175 L340 235 L385 160" stroke="${dark}" stroke-width="3" fill="none"/><rect x="215" y="250" width="70" height="70" rx="6" fill="none" stroke="${dark}" stroke-width="3"/><rect x="315" y="250" width="70" height="70" rx="6" fill="none" stroke="${dark}" stroke-width="3"/>`
  }
  extras += [215, 270, 330, 385].map((x) => `<rect x="${x - 5}" y="106" width="10" height="38" rx="3" fill="${dark}"/>`).join('')
  return frame(`${shadow(endY + 30)}<path d="${body}" fill="${hex}" stroke="${dark}" stroke-width="3" stroke-linejoin="round"/>${extras}`)
}

// ---- Shoes ----
function shoe(subtype, hex, view) {
  const dark = shade(hex, -0.25)
  const light = shade(hex, 0.25)
  const boot = subtype === 'boots'
  if (view === 'top') {
    return frame(`${shadow(700, 120)}<path d="M300 100 Q385 112 392 250 Q398 430 352 610 Q322 680 280 680 Q226 668 212 570 Q202 380 218 240 Q234 108 300 100 Z" fill="${hex}" stroke="${dark}" stroke-width="3"/>
      <path d="M262 230 Q300 215 340 230 L350 420 Q300 440 255 420 Z" fill="${light}" stroke="${dark}" stroke-width="2.5"/>
      ${[260, 300, 340, 380].map((y) => `<path d="M262 ${y} H340" stroke="${dark}" stroke-width="5" stroke-linecap="round"/>`).join('')}`)
  }
  const shaft = boot ? `<path d="M120 200 L280 200 L285 370 L120 370 Z" fill="${hex}" stroke="${dark}" stroke-width="3"/><path d="M120 235 H282" stroke="${dark}" stroke-width="3"/>` : ''
  const upperTop = boot ? 330 : 345
  return frame(`${shadow(650, 230)}${shaft}
    <path d="M105 ${upperTop + 20} Q112 ${upperTop - 8} 185 ${upperTop - 4} L262 ${upperTop + 8} Q335 ${upperTop + 30} 385 ${upperTop + 75} Q482 ${upperTop + 85} 505 ${upperTop + 140} L505 505 L105 505 Z" fill="${hex}" stroke="${dark}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M262 ${upperTop + 8} L300 ${upperTop - 20} L240 ${upperTop - 24} Z" fill="${light}" stroke="${dark}" stroke-width="2"/>
    ${[0, 1, 2].map((i) => `<path d="M${255 + i * 36} ${upperTop + 22 + i * 14} l28 -18" stroke="${light}" stroke-width="6" stroke-linecap="round"/>`).join('')}
    <path d="M98 495 H512 Q522 495 520 520 Q515 560 470 560 H140 Q95 560 92 520 Q92 495 98 495 Z" fill="#fff" stroke="${dark}" stroke-width="3"/>
    <path d="M110 535 H505" stroke="#c9ced6" stroke-width="3"/>`)
}

// ---- Headwear ----
function headwear(subtype, hex, view) {
  const dark = shade(hex, -0.22)
  const light = shade(hex, 0.18)
  if (subtype === 'beanie') {
    return frame(`${shadow(560, 170)}<path d="M130 520 Q120 240 300 200 Q480 240 470 520 Z" fill="${hex}" stroke="${dark}" stroke-width="3"/>
      <rect x="120" y="440" width="360" height="100" rx="18" fill="${light}" stroke="${dark}" stroke-width="3"/>
      ${Array.from({ length: 13 }, (_, i) => `<path d="M${145 + i * 26} 445 V535" stroke="${dark}" stroke-width="2" opacity="0.5"/>`).join('')}
      <circle cx="300" cy="200" r="22" fill="${light}" stroke="${dark}" stroke-width="3"/>`)
  }
  if (subtype === 'bucket') {
    const side = view === 'side'
    return frame(`${shadow(580, 230)}<path d="M170 250 Q300 215 430 250 L455 450 H145 Z" fill="${hex}" stroke="${dark}" stroke-width="3"/>
      <path d="M145 450 Q300 500 455 450 Q540 480 540 515 Q300 600 60 515 Q60 480 145 450 Z" fill="${light}" stroke="${dark}" stroke-width="3"/>
      <path d="M150 405 H450" stroke="${dark}" stroke-width="3"/>${side ? '' : `<circle cx="300" cy="420" r="7" fill="${dark}"/>`}`)
  }
  const sideView = view === 'side'
  const brim = sideView
    ? `<path d="M118 430 Q300 440 520 470 Q560 500 480 520 Q300 500 118 470 Z" fill="${dark}" stroke="${dark}" stroke-width="3"/>`
    : `<path d="M105 430 Q300 485 495 430 Q530 520 300 545 Q70 520 105 430 Z" fill="${dark}" stroke="${dark}" stroke-width="3"/>`
  return frame(`${shadow(580, 220)}<path d="M130 440 Q125 200 300 190 Q475 200 470 440 Z" fill="${hex}" stroke="${dark}" stroke-width="3"/>
    <path d="M300 190 V440 M215 205 Q190 320 195 440 M385 205 Q410 320 405 440" stroke="${dark}" stroke-width="2.5" fill="none" opacity="0.7"/>
    ${brim}<circle cx="300" cy="192" r="11" fill="${light}" stroke="${dark}" stroke-width="2"/>`)
}

export const VIEWS = {
  topwear: ['front', 'back', 'detail'],
  bottomwear: ['front', 'back', 'detail'],
  shoes: ['side', 'top', 'detail'],
  headwear: ['front', 'side', 'detail'],
}

export function svgToDataUri(svg) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export function makeProductArt({ category, subtype, hex, view }) {
  if (view === 'detail') return svgToDataUri(detailView(hex))
  let svg
  if (category === 'topwear') svg = top(subtype, hex, view === 'back')
  else if (category === 'bottomwear') svg = bottom(subtype, hex, view === 'back')
  else if (category === 'shoes') svg = shoe(subtype, hex, view)
  else svg = headwear(subtype, hex, view)
  return svgToDataUri(svg)
}

// A neutral placeholder used when a real product image fails to load.
export const FALLBACK_IMAGE = svgToDataUri(
  frame(`<path d="M205 220 L300 330 L395 220 L440 270 L360 360 V520 H240 V360 L160 270 Z" fill="#cfd4dc"/><text x="300" y="610" text-anchor="middle" font-family="sans-serif" font-size="26" fill="#98a0ad">Image unavailable</text>`),
)

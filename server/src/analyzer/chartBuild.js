// Shared by every way of finding a size chart (HTML tables, JSON in the page, AI reading a picture):
// turns raw rows into the one chart shape the app uses, in centimetres.
export const COLUMN_RULES = [
  ['chest', /\b(chest|bust|brest)\b/i],
  ['shoulder', /\b(across )?shoulders?\b/i],
  ['waist', /\bwaist\b/i],
  ['hips', /\b(hips?|seat)\b/i],
  ['inseam', /\b(inseam|inside leg|inner leg)\b/i],
  ['footLength', /\b(foot ?length|foot|insole|heel to toe)\b/i],
  ['headCircumference', /\b(head|circumference)\b/i],
]
export const SIZE_HEADER = /\bsize\b|^size$/i
export const INCH = /\b(in|inch|inches)\b|["”″]/i
export const CM = /\bcm\b|centi/i

export const measureKeyFor = (label) => COLUMN_RULES.find(([, re]) => re.test(String(label)))?.[0] ?? null

// "88-92", "88 – 92", "88 to 92", "36.5", 36, {min, max} -> [lo, hi]
export function parseRange(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const lo = Number(value.min ?? value.from ?? value.low ?? value.value)
    const hi = Number(value.max ?? value.to ?? value.high ?? value.value)
    return Number.isFinite(lo) && Number.isFinite(hi) && lo > 0 ? [Math.min(lo, hi), Math.max(lo, hi)] : null
  }
  const nums = (String(value ?? '').match(/\d+(?:\.\d+)?/g) ?? []).map(Number).filter((n) => n > 0)
  if (!nums.length) return null
  return nums.length === 1 ? [nums[0], nums[0]] : [Math.min(nums[0], nums[1]), Math.max(nums[0], nums[1])]
}

// The largest value each measurement can have if the chart is in INCHES (anything bigger must be cm).
const INCH_MAX = { chest: 62, waist: 55, hips: 62, shoulder: 26, inseam: 45, footLength: 14, headCircumference: 30 }
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)]

// When a chart does not say its unit, guess from the numbers: a 40 inch chest is normal, a 40 cm chest is not.
export function guessUnit(rows, measures) {
  const checks = measures.filter((m) => INCH_MAX[m]).map((m) => {
    const vals = rows.flatMap((r) => (r[m] ? r[m] : [])).filter(Boolean)
    return vals.length ? median(vals) <= INCH_MAX[m] : null
  }).filter((v) => v !== null)
  return checks.length && checks.every(Boolean) ? 'in' : 'cm'
}

// rows: [{ size, chest: [lo, hi], ... }] in `unit` ('cm' | 'in' | null = unknown, guess).
export function finalizeChart({ rows, measures, unit = null, basis = 'unknown', source = 'page', name = 'Size chart from the product page' }) {
  const used = measures.filter((m) => rows.some((r) => r[m]))
  if (rows.length < 2 || !used.length) return null
  const guessed = unit == null
  const finalUnit = unit ?? guessUnit(rows, used)
  const k = finalUnit === 'in' ? 2.54 : 1
  const out = rows.map((r) => ({ size: String(r.size), ...Object.fromEntries(used.filter((m) => r[m]).map((m) => [m, r[m].map((v) => Math.round(v * k * 10) / 10)])) }))
  return {
    id: 'page-chart', name, unit: 'cm', basis, measurements: used, rows: out, source,
    ...(guessed ? { unitGuessed: finalUnit } : {}),
  }
}

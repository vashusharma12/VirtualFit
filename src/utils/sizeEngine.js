import { fromCanonical } from './units.js'

// Pure size-matching logic. No React, no network, no globals: given measurements and a size chart
// it returns a recommendation. The service wrapper (services/sizeRecommendationService.js) is what
// the app calls, so this can later be replaced by a backend or ML model without touching the UI.
//
// All numbers are centimetres. Chart rows look like { size: 'M', chest: [92, 98], ... }.

const WEIGHTS = {
  topwear: { chest: 0.5, shoulder: 0.25, waist: 0.25 },
  bottomwear: { waist: 0.45, hips: 0.4, inseam: 0.15 },
  shoes: { footLength: 1 },
  headwear: { headCircumference: 1 },
}

// Distance (cm) at which a measurement stops fitting at all. Wider for soft tissue, narrow for feet.
const TOLERANCE = { chest: 6, shoulder: 3, waist: 6, hips: 6, inseam: 8, footLength: 1, headCircumference: 2 }

// How far a snug / relaxed preference shifts the measurement we match against (cm).
const PREFERENCE_SHIFT = { chest: 3, shoulder: 1, waist: 2, hips: 2, inseam: 2, footLength: 0.3, headCircumference: 0.5 }

// Room (cm) a regular-fit garment has over the body, used when a chart lists GARMENT measurements.
const EASE = { topwear: { chest: 10, shoulder: 1, waist: 10 }, bottomwear: { waist: 2, hips: 8, inseam: 0 }, shoes: { footLength: 1.2 }, headwear: { headCircumference: 0 } }

const LABELS = { chest: 'chest', shoulder: 'shoulder width', waist: 'waist', hips: 'hips', inseam: 'inseam', footLength: 'foot length', headCircumference: 'head circumference' }

// How much to trust a chart, by where it came from and what it measures.
const RELIABILITY = { body: 1, garment: 0.9, unknown: 0.8 }
const SOURCE_RELIABILITY = { generic: 0.75 }

export const FIT_PREFERENCES = ['snug', 'regular', 'relaxed']

const isNum = (v) => typeof v === 'number' && Number.isFinite(v) && v > 0
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n))
const r1 = (n) => Math.round(n * 10) / 10

function productFitFactor(fit = '') {
  const f = String(fit).toLowerCase()
  if (/slim|skinny|fitted|tailored|athletic|stretch fit/.test(f)) return 0.7
  if (/relax|loose|oversize|boxy|wide|baggy/.test(f)) return 1.6
  return 1
}

// Turns single-number rows (e.g. chest 96) into ranges by splitting the gap to each neighbour.
function expandPoints(rows, m) {
  const order = rows.map((r, i) => i).sort((a, b) => rows[a][m][0] - rows[b][m][0])
  const out = rows.map((r) => [...r[m]])
  order.forEach((idx, pos) => {
    const [lo, hi] = rows[idx][m]
    if (lo !== hi) return
    const prev = pos > 0 ? rows[order[pos - 1]][m][1] : null
    const next = pos < order.length - 1 ? rows[order[pos + 1]][m][0] : null
    const down = prev != null ? (lo - prev) / 2 : next != null ? (next - lo) / 2 : 0
    const up = next != null ? (next - hi) / 2 : prev != null ? (hi - prev) / 2 : 0
    out[idx] = [r1(lo - down), r1(hi + up)]
  })
  return out
}

const distanceOutside = (x, [lo, hi]) => (x < lo ? lo - x : x > hi ? x - hi : 0)
const statusOf = (x, [lo, hi]) => (x < lo ? 'below' : x > hi ? 'above' : 'within')

function feel(m, status, d) {
  if (status === 'above') {
    if (m === 'shoulder') return 'tight across the shoulders'
    if (m === 'inseam') return 'short in the leg'
    if (m === 'footLength') return 'too short, so your toes may touch the front'
    if (m === 'headCircumference') return 'tight'
    return d <= 1 ? 'slightly snug' : d <= 3 ? 'snug' : 'tight'
  }
  if (m === 'shoulder') return 'loose, with seams hanging past your shoulders'
  if (m === 'inseam') return 'long in the leg'
  if (m === 'footLength') return 'roomy, with extra space at the toe'
  if (m === 'headCircumference') return 'loose'
  return d <= 1.5 ? 'slightly roomy' : d <= 4 ? 'loose' : 'very loose'
}

export function confidenceLabel(c) {
  return c >= 80 ? 'High' : c >= 60 ? 'Medium' : 'Low'
}

// options: { fitPreference, availableSizes, productFit, unit, source }
export function recommendSize(userMeasurements, chart, category, options = {}) {
  const { fitPreference = 'regular', availableSizes = null, productFit = '', unit = 'cm', source = chart?.source, selectedSize = null } = options
  const weights = WEIGHTS[category]
  const show = (cm) => `${fromCanonical(cm, 'length', unit)} ${unit}`
  const base = { status: 'insufficient', recommendedSize: null, confidence: 0, confidenceLabel: 'Low', explanation: '', reasons: [], comparison: null, meta: {} }

  if (!weights || !chart?.rows?.length) {
    return { ...base, explanation: 'This product has no usable size chart.', meta: { problem: 'no_chart' } }
  }

  // Measurements this chart can be matched on: known to this category, and present in every row.
  const chartMeasures = Object.keys(weights).filter((m) => (chart.measurements ?? []).includes(m) && chart.rows.every((r) => Array.isArray(r[m]) && r[m].length === 2))
  const usable = chartMeasures.filter((m) => isNum(userMeasurements?.[m]))
  const missing = chartMeasures.filter((m) => !usable.includes(m))
  if (!usable.length) {
    return {
      ...base,
      explanation: chartMeasures.length
        ? `We need your ${chartMeasures.map((m) => LABELS[m]).join(' or ')} to match this chart.`
        : 'This size chart does not measure anything this category needs.',
      meta: { problem: chartMeasures.length ? 'missing_measurements' : 'chart_not_applicable', missing: chartMeasures },
    }
  }

  const basis = chart.basis === 'garment' ? 'garment' : chart.basis === 'body' ? 'body' : 'unknown'
  const pref = FIT_PREFERENCES.includes(fitPreference) ? fitPreference : 'regular'
  const prefSign = pref === 'snug' ? -1 : pref === 'relaxed' ? 1 : 0
  const easeScale = productFitFactor(productFit) * (pref === 'snug' ? 0.7 : pref === 'relaxed' ? 1.4 : 1)

  // Body-equivalent range for every size and measurement.
  let rows = chart.rows.map((r) => ({ size: String(r.size), raw: r }))
  const ranges = {}
  for (const m of usable) {
    let rs = expandPoints(chart.rows, m)
    if (basis === 'garment') {
      const ease = (EASE[category]?.[m] ?? 0) * easeScale
      rs = rs.map(([lo, hi]) => [r1(lo - ease), r1(hi - ease)])
    }
    ranges[m] = rs
  }
  rows = rows.map((r, i) => ({ ...r, ranges: Object.fromEntries(usable.map((m) => [m, ranges[m][i]])) }))

  // Order sizes smallest to largest, using the most important measurement.
  const primary = [...usable].sort((a, b) => weights[b] - weights[a])[0]
  rows.sort((a, b) => a.ranges[primary][0] + a.ranges[primary][1] - (b.ranges[primary][0] + b.ranges[primary][1]))

  const totalWeight = usable.reduce((s, m) => s + weights[m], 0)
  const scored = rows.map((row, index) => {
    let total = 0
    let penalty = 0
    for (const m of usable) {
      const x = userMeasurements[m] + prefSign * PREFERENCE_SHIFT[m]
      const d = distanceOutside(x, row.ranges[m])
      total += weights[m] * Math.max(0, 1 - d / TOLERANCE[m])
      penalty += (weights[m] * d) / TOLERANCE[m] // unclamped, so the closest size still wins when nothing fits
    }
    return { ...row, index, score: total / totalWeight, penalty: penalty / totalWeight }
  })

  // Best first; on a tie, snug prefers the smaller size and everything else the larger one.
  const ranked = [...scored].sort(
    (a, b) => b.score - a.score || a.penalty - b.penalty || (pref === 'snug' ? a.index - b.index : b.index - a.index),
  )
  const overallBest = ranked[0]
  const isAvailable = (s) => !availableSizes || availableSizes.map(String).includes(s.size)
  const chosen = ranked.find(isAvailable) ?? overallBest
  const bestUnavailable = overallBest !== chosen && !isAvailable(overallBest) ? overallBest : null

  const others = ranked.filter((s) => s !== chosen)
  const runnerUp = others[0] ?? null
  const margin = runnerUp ? chosen.score - runnerUp.score : 1
  const fit = chosen.score
  const totalChartWeight = chartMeasures.reduce((s, m) => s + weights[m], 0)
  const completeness = totalWeight / totalChartWeight
  const reliability = (SOURCE_RELIABILITY[source] ?? 1) * RELIABILITY[basis]
  const noGoodFit = fit < 0.35

  let confidence = 100 * (0.5 * fit + 0.5 * Math.min(1, margin / 0.4)) * (0.7 + 0.3 * completeness) * reliability
  confidence = Math.round(clamp(noGoodFit ? Math.min(confidence, 30) : confidence, 5, 95))

  const lower = scored[chosen.index - 1] ?? null
  const higher = scored[chosen.index + 1] ?? null

  const describe = (row) =>
    usable.map((m) => {
      const x = userMeasurements[m]
      const [lo, hi] = row.ranges[m]
      const status = statusOf(x, [lo, hi])
      const d = r1(distanceOutside(x, [lo, hi]))
      const t = hi > lo ? (x - lo) / (hi - lo) : 0.5
      return {
        key: m, label: LABELS[m], user: x, rangeLow: lo, rangeHigh: hi, chartValue: row.raw[m], status,
        diff: status === 'within' ? 0 : d,
        position: status !== 'within' ? null : t < 0.2 ? 'low' : t > 0.8 ? 'high' : 'middle',
        feel: status === 'within' ? null : feel(m, status, d),
        weight: weights[m],
      }
    })

  const chosenRows = describe(chosen)
  const comparison = {
    recommended: { size: chosen.size, rows: chosenRows, missing: missing.map((m) => ({ key: m, label: LABELS[m] })) },
    smaller: lower ? { size: lower.size, rows: describe(lower), score: r1(lower.score) } : null,
    larger: higher ? { size: higher.size, rows: describe(higher), score: r1(higher.score) } : null,
  }

  // How a size the shopper picked themselves compares (it may not be the recommended one).
  const pickedRow = selectedSize != null ? scored.find((r) => r.size === String(selectedSize)) : null
  const selected = pickedRow
    ? { size: pickedRow.size, isRecommended: pickedRow === chosen, score: r1(pickedRow.score), rows: describe(pickedRow) }
    : null

  // ---- Plain-language explanation ----
  const head = [...chosenRows].sort((a, b) => b.weight - a.weight)[0]
  const rangeText = (r) => `${show(r.rangeLow)} to ${show(r.rangeHigh)}`
  const reasons = []
  let explanation
  if (head.status === 'within') {
    const where = head.position === 'middle' ? 'comfortably within' : head.position === 'low' ? 'near the lower end of' : 'near the upper end of'
    explanation = `Your ${head.label} (${show(head.user)}) falls ${where} the ${chosen.size} range (${rangeText(head)}).`
  } else {
    explanation = `Your ${head.label} (${show(head.user)}) is ${show(head.diff)} ${head.status} the ${chosen.size} range (${rangeText(head)}).`
  }
  const rest = chosenRows.filter((r) => r !== head)
  const fine = rest.filter((r) => r.status === 'within')
  if (fine.length) explanation += ` Your ${fine.map((r) => r.label).join(' and ')} also fit${fine.length === 1 ? 's' : ''} this size.`
  rest.filter((r) => r.status !== 'within').forEach((r) => {
    reasons.push({ tone: 'warn', text: `Your ${r.label} (${show(r.user)}) is ${show(r.diff)} ${r.status} the ${chosen.size} range, so it may feel ${r.feel}.` })
  })
  if (head.status !== 'within') reasons.unshift({ tone: 'warn', text: `It may feel ${head.feel} at the ${head.label}.` })

  const gap = runnerUp ? chosen.score - runnerUp.score : 1
  const adjacent = runnerUp && Math.abs(runnerUp.index - chosen.index) === 1
  const between = adjacent && gap < 0.15 && !noGoodFit ? [runnerUp, chosen].sort((a, b) => a.index - b.index).map((s) => s.size) : null
  if (between) {
    reasons.unshift({ tone: 'note', text: `You are between ${between[0]} and ${between[1]}. ${between[0]} fits closer to the body and ${between[1]} fits looser.` })
  }
  if (noGoodFit) {
    reasons.unshift({ tone: 'warn', text: `No size in this chart fits your ${head.label} well. ${chosen.size} is the closest, but it may not suit you. Another brand or chart may fit better.` })
  }
  if (bestUnavailable) {
    reasons.push({ tone: 'note', text: `${bestUnavailable.size} would be your best fit but is out of stock, so ${chosen.size} is the closest available size.` })
  }
  if (missing.length) {
    reasons.push({ tone: 'note', text: `We did not have your ${missing.map((m) => LABELS[m]).join(' or ')}, so this is less certain. Add it for a better result.` })
  }
  if (basis === 'garment') {
    reasons.push({ tone: 'note', text: 'This chart lists garment measurements, so we allowed for the room built into the clothing.' })
  } else if (basis === 'unknown') {
    reasons.push({ tone: 'note', text: 'We could not tell whether this chart lists body or garment measurements, so it was treated as body measurements.' })
  }
  if (source === 'generic') {
    reasons.push({ tone: 'warn', text: "This uses standard sizing, not this brand's own chart. Brands differ, so treat it as a rough guide." })
  }
  if (pref !== 'regular') {
    reasons.push({ tone: 'note', text: `You chose a ${pref} fit, so sizes were matched to slightly ${pref === 'snug' ? 'smaller' : 'larger'} measurements.` })
  }
  const fitText = String(productFit).toLowerCase()
  if (/slim|skinny|fitted/.test(fitText) && head.position === 'high' && higher) {
    reasons.push({ tone: 'note', text: `This product is cut slim. If you like more room, consider ${higher.size}.` })
  } else if (/oversize|boxy|relax|loose/.test(fitText)) {
    reasons.push({ tone: 'note', text: 'This product is cut roomy, so it will feel looser than the size chart alone suggests.' })
  }
  if (category === 'shoes') {
    reasons.push({ tone: 'note', text: `Only foot length is measured, not width.${higher ? ` If your feet are wide, consider ${higher.size}.` : ''}` })
  }
  if (scored.length === 1) {
    reasons.push({ tone: 'note', text: 'This product comes in one size only, so there is nothing to compare.' })
  }

  return {
    status: noGoodFit ? 'no_good_fit' : 'ok',
    recommendedSize: chosen.size,
    confidence,
    confidenceLabel: confidenceLabel(confidence),
    explanation,
    reasons,
    comparison,
    selected,
    meta: {
      basis, source: source ?? 'unknown', fitPreference: pref, between, measurementsUsed: usable, missingMeasurements: missing,
      bestUnavailable: bestUnavailable?.size ?? null, score: r1(fit), margin: r1(margin), completeness: r1(completeness), reliability: r1(reliability),
      sizesOrder: scored.map((s) => s.size),
      // For drawing a ruler: every size's range on the most important measurement.
      primary,
      primaryValue: userMeasurements[primary],
      sizeRanges: scored.map((s) => ({ size: s.size, low: s.ranges[primary][0], high: s.ranges[primary][1] })),
    },
  }
}

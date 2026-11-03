import { MEASUREMENT_FIELDS } from '../data/measurementFields'
import { CATEGORY_BY_ID } from '../data/categories'

// Share of profile items completed, 0-100. Photos and body shape are added in later phases.
export function profileCompletion(profile, measurements, photoCount = null) {
  const items = [
    Boolean(profile.name?.trim()),
    Boolean(profile.genderPreference),
    ...MEASUREMENT_FIELDS.map((f) => measurements[f.key] != null),
    Boolean(profile.bodyShape),
    ...(photoCount == null ? [] : [photoCount > 0]),
  ]
  return Math.round((items.filter(Boolean).length / items.length) * 100)
}

// Decides which category to use for an analyzed product, without blindly trusting either the
// shopper's selection or the detector.
export function resolveCategory({ detected, selected, choice }) {
  if (choice) return { status: 'confirmed', category: choice, via: 'user' }
  const found = detected?.category
  if (found === 'unsupported') return { status: 'unsupported', category: null, reason: detected.reason }
  const strong = Boolean(found) && detected.confidence !== 'low'
  if (selected && strong && found !== selected) return { status: 'mismatch', category: null, detected: found, selected }
  if (selected) return { status: 'confirmed', category: selected, via: 'selection', verified: strong && found === selected }
  if (strong) return { status: 'confirmed', category: found, via: 'detected', verified: true }
  return { status: 'unknown', category: null, suggestion: found ?? null }
}

// A chart is usable for a category only if it measures something that category needs.
export function chartCoversCategory(chart, category) {
  const needs = CATEGORY_BY_ID[category]?.requiredMeasurements ?? []
  return Boolean(chart?.rows?.length) && chart.measurements.some((m) => needs.includes(m))
}

// Which of the category's measurements the shopper has / has not entered.
export function measurementStatus(category, measurements) {
  const needs = CATEGORY_BY_ID[category]?.requiredMeasurements ?? []
  return needs.map((key) => ({ key, value: measurements[key] ?? null, present: measurements[key] != null }))
}

// A chart whose unit was GUESSED may have been guessed wrong. This reinterprets every number the other
// way (inches <-> centimetres) and records the new reading, so the shopper can fix it in one click.
export function flipGuessedUnit(chart) {
  const nowIn = chart.unitGuessed === 'in' // the numbers were treated as inches and converted to cm
  const k = nowIn ? 1 / 2.54 : 2.54
  const rows = chart.rows.map((r) => ({
    size: r.size,
    ...Object.fromEntries(chart.measurements.filter((m) => r[m]).map((m) => [m, r[m].map((v) => Math.round(v * k * 10) / 10)])),
  }))
  return { ...chart, rows, unitGuessed: nowIn ? 'cm' : 'in' }
}

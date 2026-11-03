// Measurements are stored canonically (cm / kg). These helpers convert at the UI boundary only.
const CM_PER_IN = 2.54
const KG_PER_LB = 0.45359237

export const round1 = (n) => Math.round(n * 10) / 10

export const UNIT_LABELS = { cm: 'cm', in: 'in', kg: 'kg', lbs: 'lbs' }

export function toCanonical(value, kind, unit) {
  if (kind === 'length') return unit === 'in' ? value * CM_PER_IN : value
  return unit === 'lbs' ? value * KG_PER_LB : value
}

export function fromCanonical(value, kind, unit) {
  if (kind === 'length') return round1(unit === 'in' ? value / CM_PER_IN : value)
  return round1(unit === 'lbs' ? value / KG_PER_LB : value)
}

export function formatMeasurement(canonicalValue, kind, unit) {
  if (canonicalValue == null) return '—'
  return `${fromCanonical(canonicalValue, kind, unit)} ${UNIT_LABELS[unit]}`
}

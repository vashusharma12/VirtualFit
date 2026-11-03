import { toCanonical, fromCanonical, UNIT_LABELS } from './units'
import { quickRejectUrl } from '../../shared/pageClassification.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const validators = {
  name(v) {
    const s = (v ?? '').trim()
    if (!s) return 'Enter your name.'
    if (s.length < 2) return 'Name must be at least 2 characters.'
    if (s.length > 60) return 'Name must be 60 characters or fewer.'
    return ''
  },
  email(v) {
    const s = (v ?? '').trim()
    if (!s) return 'Enter your email address.'
    if (!EMAIL_RE.test(s)) return 'Enter a valid email, like name@example.com.'
    return ''
  },
  password(v) {
    if (!v) return 'Enter a password.'
    if (v.length < 8) return 'Password must be at least 8 characters.'
    if (v.length > 72) return 'Password must be 72 characters or fewer.'
    if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) return 'Use at least one letter and one number.'
    return ''
  },
  loginPassword(v) {
    return v ? '' : 'Enter your password.'
  },
  productUrl(v) {
    const s = (v ?? '').trim()
    if (!s) return 'Paste a product link.'
    if (s.length > 2048) return 'That link is too long.'
    let url
    try {
      url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`)
    } catch {
      return 'That does not look like a web address.'
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return 'Only http and https links are supported.'
    if (!url.hostname.includes('.')) return 'That does not look like a web address.'
    return quickRejectUrl(s)?.message ?? ''
  },
  confirmPassword(v, all) {
    if (!v) return 'Re-enter your password.'
    if (v !== all.password) return 'Passwords do not match.'
    return ''
  },
}

// ---- Measurement validation ----

// Keeps only digits and a single decimal point, so letters can never be typed or pasted in.
export function sanitizeNumericInput(raw) {
  const cleaned = String(raw).replace(',', '.').replace(/[^\d.]/g, '')
  const [whole, ...rest] = cleaned.split('.')
  const out = rest.length ? `${whole}.${rest.join('')}` : whole
  return out.slice(0, 6)
}

export function parseNumeric(raw) {
  const s = String(raw ?? '').trim()
  if (!/^\d+\.?\d*$/.test(s)) return NaN
  return Number(s)
}

// `raw` is what the user typed, in `unit`. Returns an error string, or '' if valid.
export function validateMeasurement(field, raw, unit) {
  const text = String(raw ?? '').trim()
  if (!text) return field.required ? `Enter your ${field.label.toLowerCase()}.` : ''
  const num = parseNumeric(text)
  if (Number.isNaN(num)) return 'Use numbers only, for example 96 or 96.5.'
  const canonical = toCanonical(num, field.kind, unit)
  if (canonical < field.min || canonical > field.max) {
    const lo = fromCanonical(field.min, field.kind, unit)
    const hi = fromCanonical(field.max, field.kind, unit)
    return `${field.label} should be between ${lo} and ${hi} ${UNIT_LABELS[unit]}.`
  }
  return ''
}

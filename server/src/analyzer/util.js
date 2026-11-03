// Reads one balanced {...} JSON object starting at the first "{" at or after `from`.
// Respects strings and escapes, so braces inside text do not confuse it.
export function readBalancedJson(text, from) {
  const start = text.indexOf('{', from)
  if (start === -1) return null
  let depth = 0
  let inString = false
  let escaped = false
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') inString = true
    else if (ch === '{') depth++
    else if (ch === '}' && --depth === 0) {
      try {
        return JSON.parse(text.slice(start, i + 1))
      } catch {
        return null
      }
    }
  }
  return null
}

// Finds `window.__NAME__ = {...}` style assignments inside inline scripts.
export function extractAssignedJson($, pattern) {
  let found = null
  $('script:not([src])').each((_, el) => {
    if (found) return
    const text = $(el).contents().text()
    const m = pattern.exec(text)
    if (m) found = readBalancedJson(text, m.index + m[0].length - 1)
  })
  return found
}

// Depth-limited search for the first value stored under any of `keys`.
export function deepFind(node, keys, depth = 0) {
  if (!node || typeof node !== 'object' || depth > 12) return undefined
  for (const key of keys) if (node[key] !== undefined && node[key] !== null) return node[key]
  for (const value of Array.isArray(node) ? node : Object.values(node)) {
    const hit = deepFind(value, keys, depth + 1)
    if (hit !== undefined) return hit
  }
  return undefined
}

export const clean = (s) => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim() : '')
export const asArray = (v) => (v == null ? [] : Array.isArray(v) ? v : [v])

// "₹1,299.00", "Rs. 1299", 1299 -> 1299
export function parsePrice(value) {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : null
  const m = /(\d[\d,]*(?:\.\d+)?)/.exec(String(value ?? '').replace(/\s/g, ''))
  if (!m) return null
  const n = Number(m[1].replace(/,/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

const SIZE_PLACEHOLDER = /^(select|choose|size|sizes|please|-+|--)\b/i
// "xl" -> "XL", " M " -> "M", "Select Size" -> null
export function cleanSize(raw) {
  const s = clean(String(raw ?? '').replace(/\(.*?\)/g, ' '))
  if (!s || s.length > 12 || SIZE_PLACEHOLDER.test(s)) return null
  return /^[a-z]{1,4}$/i.test(s) ? s.toUpperCase() : s
}
export const uniqueSizes = (list) => [...new Set(list.map(cleanSize).filter(Boolean))]

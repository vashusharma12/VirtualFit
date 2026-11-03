import { assembleChart } from './sizeTables.js'
import { clean, readBalancedJson, asArray } from './util.js'

// Finds size charts that are NOT in a plain <table>: embedded in the page's data (JSON), written as
// loose text, or shown as a picture. Many stores render the chart with scripts from data like this.

const CHART_KEY = /size[\s_-]*(chart|guide|table|info|details?)|sizing|measurements?|sizechart/i
const SIZE_KEY = /^(size|sizes?name|size_?label|label|displaysize|sc_?displaysize|name|title)$/i
const MAX_NODES = 200_000

const toText = (v) => {
  if (v == null) return ''
  if (typeof v === 'number') return String(v)
  if (typeof v === 'string') return clean(v.replace(/<[^>]+>/g, ' '))
  if (typeof v === 'object') {
    const lo = v.min ?? v.from ?? v.low ?? v.start
    const hi = v.max ?? v.to ?? v.high ?? v.end
    if (lo != null && hi != null) return `${lo}-${hi}`
    if (v.value != null) return toText(v.value)
  }
  return ''
}

// array of {size, chest, waist...}  ->  header + rows of strings
function fromRowObjects(list, context) {
  const rows = list.filter((r) => r && typeof r === 'object' && !Array.isArray(r))
  if (rows.length < 2) return null
  const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))]
  const sizeKey = keys.find((k) => SIZE_KEY.test(k)) ?? keys.find((k) => /size/i.test(k))
  if (!sizeKey) return null
  const measureKeys = keys.filter((k) => k !== sizeKey)
  const header = ['Size', ...measureKeys]
  const data = rows.map((r) => [toText(r[sizeKey]), ...measureKeys.map((k) => toText(r[k]))])
  return assembleChart({ header, rows: data, context })
}

// array of arrays, first row = header
function fromMatrix(matrix, context) {
  if (!Array.isArray(matrix) || matrix.length < 3 || !matrix.every(Array.isArray)) return null
  const text = matrix.map((r) => r.map(toText))
  return assembleChart({ header: text[0], rows: text.slice(1), context })
}

// {headers|columns|header: [...], rows|data|values|body: [[...]]}
function fromHeadersAndRows(obj, context) {
  const headers = obj.headers ?? obj.columns ?? obj.header ?? obj.heads
  const body = obj.rows ?? obj.data ?? obj.values ?? obj.body ?? obj.sizes
  if (!Array.isArray(headers) || !Array.isArray(body)) return null
  const header = headers.map((h) => (typeof h === 'object' ? toText(h.label ?? h.name ?? h.title ?? h.key) : toText(h)))
  if (body.every(Array.isArray)) return assembleChart({ header, rows: body.map((r) => r.map(toText)), context })
  return fromRowObjects(body, context)
}

// Words around a chart in the data (its key, title, unit, description) tell us body vs garment, and cm vs inches.
function contextOf(value, key) {
  const parts = [key]
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [k, v] of Object.entries(value)) if (typeof v === 'string' && /title|name|label|heading|desc|note|unit|type|text|caption/i.test(k)) parts.push(v)
  }
  return parts.join(' ')
}

function chartFromValue(value, context) {
  if (Array.isArray(value)) return fromRowObjects(value, context) ?? fromMatrix(value, context)
  if (value && typeof value === 'object') {
    return fromHeadersAndRows(value, context) ?? chartFromValue(value.sizes ?? value.rows ?? value.chart ?? value.table, context)
  }
  return null
}

function walk(node, visit, state = { n: 0 }, depth = 0) {
  if (!node || typeof node !== 'object' || depth > 16 || state.n++ > MAX_NODES) return
  visit(node)
  for (const child of Array.isArray(node) ? node : Object.values(node)) walk(child, visit, state, depth + 1)
}

// Every JSON blob a page ships to its own scripts: <script type="application/json">, __NEXT_DATA__,
// `window.anything = {...}`, and `window.anything = JSON.parse("...")`.
export function collectEmbedded($) {
  const found = []
  $('script[type="application/json"], script[type="application/ld+json"], script#__NEXT_DATA__').each((_, el) => {
    const text = $(el).contents().text()
    if (text.length > 4_000_000) return
    try { found.push(JSON.parse(text)) } catch { /* not JSON */ }
  })
  $('script:not([src])').each((_, el) => {
    const text = $(el).contents().text()
    if (!text || text.length > 4_000_000 || found.length > 14) return
    const assign = /(?:window|self|globalThis)\.[A-Za-z_$][\w$]*\s*=\s*/g
    let m
    let taken = 0
    while ((m = assign.exec(text)) && taken < 6) {
      const at = m.index + m[0].length
      let value = null
      if (text[at] === '{') value = readBalancedJson(text, at)
      else {
        const lit = /^JSON\.parse\(("(?:\\.|[^"\\])*")\)/.exec(text.slice(at, at + 4_000_000))
        if (lit) { try { value = JSON.parse(JSON.parse(lit[1])) } catch { value = null } }
      }
      if (value && typeof value === 'object') { found.push(value); taken++ }
    }
  })
  return found
}

const MEASURE_COLUMNS = (chart) => chart?.measurements?.length ?? 0
const score = (chart) => (chart ? chart.rows.length * MEASURE_COLUMNS(chart) : 0)

// Looks through ONE parsed JSON value for something shaped like a size chart. First it trusts keys that
// say "size chart"; then it looks at the shape of every array and table, whatever it is called, and
// accepts those with at least two measurements (so product variants with just a size are not mistaken).
export function findChartInJson(root) {
  let keyed = null
  walk(root, (node) => {
    if (Array.isArray(node)) return
    for (const [key, value] of Object.entries(node)) {
      if (!CHART_KEY.test(key) || value == null || typeof value !== 'object') continue
      const chart = chartFromValue(value, contextOf(value, key))
      if (chart && score(chart) > score(keyed)) keyed = chart
    }
  })
  if (keyed) return { ...keyed, source: 'page' }

  let shaped = null
  walk(root, (node) => {
    const chart = Array.isArray(node) ? chartFromValue(node, '') : chartFromValue(node, contextOf(node, ''))
    if (chart && MEASURE_COLUMNS(chart) >= 2 && score(chart) > score(shaped)) shaped = chart
  })
  return shaped ? { ...shaped, source: 'page' } : null
}

export function findEmbeddedChart($) {
  for (const root of collectEmbedded($)) {
    const chart = findChartInJson(root)
    if (chart) return chart
  }
  return null
}

const LINK_KEY = /^(size[\s_-]*(chart|guide)[\s_-]*(url|link|href|api|endpoint|image|img|src)?|sizechart(url|link|image)?)$/i
const IMAGE_URL = /\.(jpe?g|png|webp)(\?|$)/i

// Where a size chart lives when the page only links to it: a URL in the page's data (for example
// "sizeChartUrl"), or a "Size chart" link or button. Pictures are separated from pages/JSON.
export function findChartLinks($, baseUrl) {
  const candidates = []
  for (const root of collectEmbedded($)) {
    walk(root, (node) => {
      if (Array.isArray(node)) return
      for (const [key, value] of Object.entries(node)) if (LINK_KEY.test(key) && typeof value === 'string') candidates.push(value)
    })
  }
  $('a[href], button[data-href], [data-url], [data-sizechart-url]').each((_, el) => {
    const $el = $(el)
    const label = clean($el.text()) + ' ' + ($el.attr('aria-label') ?? '') + ' ' + ($el.attr('title') ?? '')
    if (!/size\s*(chart|guide)/i.test(label)) return
    const target = $el.attr('href') || $el.attr('data-href') || $el.attr('data-url') || $el.attr('data-sizechart-url')
    if (target && !/^(#|javascript:)/i.test(target)) candidates.push(target)
  })
  const pages = []
  const images = []
  for (const c of candidates) {
    try {
      const u = new URL(c, baseUrl)
      if (!/^https?:$/.test(u.protocol)) continue
      ;(IMAGE_URL.test(u.pathname) ? images : pages).push(u.toString())
    } catch { /* ignore */ }
  }
  return { pages: [...new Set(pages)].slice(0, 3), images: [...new Set(images)].slice(0, 3) }
}

// Text near a "size chart" heading, for when the chart is plain text rather than a table.
export function findChartText($) {
  $('script, style, noscript, svg').remove()
  const numbers = (t) => (t.match(/\d+(?:\.\d+)?/g) ?? []).length
  const sizeTokens = (t) => (t.match(/\b(XXS|XS|S|M|L|XL|XXL|XXXL|2XL|3XL|\d{2})\b/g) ?? []).length
  let best = null
  $('*').each((_, el) => {
    const own = clean($(el).clone().children().remove().end().text())
    if (own.length === 0 || own.length > 60 || !/size\s*(chart|guide)|measurement/i.test(own)) return
    let node = $(el)
    for (let i = 0; i < 6; i++) {
      const text = clean(node.text())
      if (text.length > 4000) break
      if (numbers(text) >= 8 && sizeTokens(text) >= 3) {
        if (!best || text.length < best.length) best = text
        break
      }
      node = node.parent()
      if (!node.length) break
    }
  })
  return best
}

// Pictures that look like a size chart (by their alt text, id, class, file name or nearby words).
export function findChartImages($, baseUrl) {
  const urls = []
  $('img').each((_, el) => {
    const $el = $(el)
    const src = $el.attr('src') || $el.attr('data-src') || $el.attr('data-original') || asArray($el.attr('srcset')?.split(','))[0]?.trim().split(' ')[0]
    if (!src) return
    const hint = [$el.attr('alt'), $el.attr('title'), $el.attr('id'), $el.attr('class'), $el.attr('aria-label'), src, clean($el.parent().text()).slice(0, 120)].join(' ')
    if (!/size[\s_-]*(chart|guide)|sizing|measure/i.test(hint)) return
    try {
      const u = new URL(src, baseUrl)
      if (/^https?:$/.test(u.protocol)) urls.push(u.toString())
    } catch { /* ignore */ }
  })
  return [...new Set(urls)].slice(0, 3)
}

// ---------- charts made of plain page elements (not a <table>) ----------
// Many modern sites build the chart from <div>s or <span>s: each cell is a separate piece of text, in
// row order. Read the page's text in order and look for "Size, Chest, Waist ..." followed by rows.
const SKIP_TAGS = new Set(['script', 'style', 'noscript', 'template', 'svg', 'head'])
const SIZE_HEAD = /^((brand|standard|uk|us|eu|international|indian) )?size$/i
const HEAD_WORD = /^(to fit |body |garment |across |front |back |brand |standard |uk |us |eu )?(size|chest|bust|waist|hips?|seat|shoulders?|inseam|inside leg|length|sleeves?( length)?|thigh|rise|foot( length)?|insole|head|circumference)( ?[(\[]?(in|cm|inch|inches)[)\]]?)?$/i
const SIZE_LABEL = /^(xxs|xs|s|m|l|xl|xxl|xxxl|[2-6]xl|\d{1,2}(\.5)?|uk ?\d{1,2}|us ?\d{1,2}|eu ?\d{2}|free size|one size|\d{1,2}[-/]\d{1,2})$/i

export function textTokens($, limit = 30000) {
  const out = []
  const walk = (node) => {
    if (out.length >= limit) return
    if (node.type === 'text') {
      const t = clean(node.data)
      if (t && t.length <= 80) out.push(t)
    } else if (node.type === 'tag' && !SKIP_TAGS.has(node.name)) {
      for (const child of node.children ?? []) walk(child)
    }
  }
  const body = $('body')[0]
  if (body) walk(body)
  return out
}

// "S\t36\t30\nM\t38\t32" and similar (what a browser reports as the text of an opened panel).
export const splitPanelText = (text) => String(text ?? '').split(/[\n\t\r]+/).map((t) => clean(t)).filter((t) => t && t.length <= 80)

export function findChartInTokens(tokens) {
  for (let i = 0; i < tokens.length; i++) {
    if (!SIZE_HEAD.test(tokens[i])) continue
    const header = [tokens[i]]
    let j = i
    while (header.length < 9 && j + 1 < tokens.length && HEAD_WORD.test(tokens[j + 1])) header.push(tokens[++j])
    if (header.length < 2) continue

    const k = header.length
    const rows = []
    for (let p = j + 1; p + k <= tokens.length; p += k) {
      const [size, ...cells] = tokens.slice(p, p + k)
      if (!SIZE_LABEL.test(size) || !cells.every((c) => /\d/.test(c) && c.length <= 16)) break
      rows.push([size, ...cells])
    }
    if (rows.length < 2) continue
    const context = tokens.slice(Math.max(0, i - 10), i).join(' ')
    const chart = assembleChart({ header, rows, context })
    if (chart) return { ...chart, source: 'page' }
  }
  return null
}

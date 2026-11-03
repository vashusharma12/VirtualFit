import { clean } from './util.js'
import { COLUMN_RULES, INCH, CM, SIZE_HEADER, parseRange, finalizeChart } from './chartBuild.js'

// Turns a header row + data rows (all strings) into a size chart. Used for HTML tables, for charts found
// in a page's embedded data, and for text. `context` is any nearby wording (title, caption, key names)
// that says whether the numbers are body or garment measurements, and cm or inches.
export function assembleChart({ header, rows, context = '' }) {
  if (!Array.isArray(header) || !Array.isArray(rows) || rows.length < 2) return null
  const sizeCol = header.findIndex((h) => SIZE_HEADER.test(String(h)))
  if (sizeCol === -1) return null

  const columns = []
  header.forEach((h, i) => {
    if (i === sizeCol) return
    const rule = COLUMN_RULES.find(([, re]) => re.test(String(h)))
    if (rule && !columns.some((c) => c.key === rule[0])) columns.push({ key: rule[0], index: i, inches: INCH.test(h), cm: CM.test(h) })
  })
  if (!columns.length) return null

  const text = clean(`${context} ${header.join(' ')}`)
  const sayCm = CM.test(text)
  const sayIn = INCH.test(text)
  const perColumn = columns.some((c) => c.inches && !c.cm) // a column that states its own unit is converted here

  const data = []
  for (const row of rows) {
    const size = clean(String(row[sizeCol] ?? ''))
    if (!size || size.length > 12) continue
    const entry = { size }
    for (const c of columns) {
      const r = parseRange(row[c.index])
      if (r) entry[c.key] = c.inches && !c.cm ? r.map((v) => v * 2.54) : r
    }
    if (columns.some((c) => entry[c.key])) data.push(entry)
  }
  return finalizeChart({
    rows: data,
    measures: columns.map((c) => c.key),
    unit: perColumn ? 'cm' : sayCm && !sayIn ? 'cm' : sayIn && !sayCm ? 'in' : null,
    basis: /\bbody\b/i.test(text) ? 'body' : /\bgarment|product measurements?\b/i.test(text) ? 'garment' : 'unknown',
  })
}

function readTable($, table) {
  const rows = $(table).find('tr').toArray().map((tr) => $(tr).find('th,td').toArray().map((c) => clean($(c).text())))
  if (rows.length < 3) return null
  const context = `${$(table).prev('p,h2,h3,h4,caption,div').text()} ${$(table).find('caption').text()}`
  return assembleChart({ header: rows[0], rows: rows.slice(1), context })
}

export function extractSizeChart($) {
  for (const table of $('table').toArray()) {
    const chart = readTable($, table)
    if (chart) return chart
  }
  return null
}

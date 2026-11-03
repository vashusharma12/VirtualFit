import { useState } from 'react'
import { sanitizeNumericInput, parseNumeric } from '../../utils/validation'
import { toCanonical, fromCanonical, UNIT_LABELS } from '../../utils/units'
import Button from '../common/Button'

const MEASURES = {
  topwear: [['chest', 'Chest'], ['shoulder', 'Shoulder'], ['waist', 'Waist']],
  bottomwear: [['waist', 'Waist'], ['hips', 'Hips'], ['inseam', 'Inseam']],
  shoes: [['footLength', 'Foot length']],
  headwear: [['headCircumference', 'Head']],
}

const blankRow = () => ({ size: '', values: {} })

// Lets the shopper type in the size chart from the store. Each measurement takes a "from" and an
// optional "to" (leave "to" empty when the chart lists a single number).
// `initial` (a chart in cm) opens the form pre-filled, for checking a chart that was read by AI.
const rowsFromChart = (chart, measures, unit) =>
  chart.rows.map((r) => ({
    size: String(r.size),
    values: Object.fromEntries(measures.filter(([k]) => r[k]).map(([k]) => {
      const [lo, hi] = r[k].map((v) => String(fromCanonical(v, 'length', unit)))
      return [k, { min: lo, max: lo === hi ? '' : hi }]
    })),
  }))

export default function ManualSizeChartForm({ category, unit, onSubmit, onCancel, initial = null, source = 'manual', notice = '' }) {
  const measures = MEASURES[category] ?? []
  const [basis, setBasis] = useState(initial?.basis ?? 'body')
  const [rows, setRows] = useState(() => (initial ? rowsFromChart(initial, measures, unit) : [blankRow(), blankRow(), blankRow()]))
  const [error, setError] = useState('')

  const setSize = (i, v) => setRows((r) => r.map((row, idx) => (idx === i ? { ...row, size: v.slice(0, 12) } : row)))
  const setValue = (i, key, part, v) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, values: { ...row.values, [key]: { ...row.values[key], [part]: sanitizeNumericInput(v) } } } : row)))

  const submit = (e) => {
    e.preventDefault()
    const filled = rows.filter((r) => r.size.trim() || Object.values(r.values).some((v) => v?.min || v?.max))
    if (filled.length < 2) return setError('Add at least two sizes.')
    const seen = new Set()
    const out = []
    for (const [i, row] of filled.entries()) {
      const size = row.size.trim()
      if (!size) return setError(`Row ${i + 1} needs a size label, like M or 32.`)
      if (seen.has(size.toLowerCase())) return setError(`The size "${size}" appears twice.`)
      seen.add(size.toLowerCase())
      const entry = { size }
      for (const [key, name] of measures) {
        const { min = '', max = '' } = row.values[key] ?? {}
        if (!min && !max) continue
        const lo = parseNumeric(min)
        const hi = max ? parseNumeric(max) : lo
        if (Number.isNaN(lo) || Number.isNaN(hi) || lo <= 0 || hi <= 0) return setError(`Check the ${name.toLowerCase()} for size ${size}: use numbers only.`)
        if (lo > hi) return setError(`For size ${size}, the ${name.toLowerCase()} "from" is bigger than "to".`)
        entry[key] = [lo, hi].map((v) => Math.round(toCanonical(v, 'length', unit) * 10) / 10)
      }
      if (Object.keys(entry).length < 2) return setError(`Size ${size} needs at least one measurement.`)
      out.push(entry)
    }
    const used = measures.map(([k]) => k).filter((k) => out.some((r) => r[k]))
    setError('')
    onSubmit({ id: 'manual-chart', name: source === 'ai' ? 'Size chart read by AI and checked by you' : 'Size chart you entered', unit: 'cm', basis, measurements: used, rows: out, source })
  }

  const input = 'h-10 w-full rounded-md border border-line bg-white px-2 text-base outline-none focus:border-denim sm:text-sm'

  return (
    <form onSubmit={submit} noValidate className="mt-4 space-y-4">
      {notice && <p role="note" className="rounded-lg bg-tape-soft px-3 py-2 text-sm">{notice}</p>}
      <div>
        <label htmlFor="chart-basis" className="mb-1.5 block text-sm font-medium">These numbers are</label>
        <select id="chart-basis" value={basis} onChange={(e) => setBasis(e.target.value)} className="h-11 w-full rounded-lg border border-line bg-white px-3 text-base sm:w-auto sm:text-sm">
          <option value="body">Body measurements (for your body)</option>
          <option value="garment">Garment measurements (of the clothing)</option>
          <option value="unknown">Not sure</option>
        </select>
        <p className="mt-1 text-xs text-muted">Stores usually say which one near the chart. If unsure, look for words like "body" or "garment".</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-left text-sm">
          <caption className="sr-only">Enter the size chart, in {UNIT_LABELS[unit]}</caption>
          <thead className="text-muted">
            <tr>
              <th scope="col" className="w-24 py-2 pr-2 font-medium">Size</th>
              {measures.map(([k, name]) => <th key={k} scope="col" className="py-2 pr-2 font-medium">{name} ({UNIT_LABELS[unit]}): from, to</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td className="py-1 pr-2"><input className={input} aria-label={`Row ${i + 1} size`} value={row.size} onChange={(e) => setSize(i, e.target.value)} placeholder="M" /></td>
                {measures.map(([k, name]) => (
                  <td key={k} className="py-1 pr-2">
                    <div className="flex gap-1.5">
                      <input className={input} inputMode="decimal" aria-label={`Row ${i + 1} ${name} from`} value={row.values[k]?.min ?? ''} onChange={(e) => setValue(i, k, 'min', e.target.value)} />
                      <input className={input} inputMode="decimal" aria-label={`Row ${i + 1} ${name} to`} value={row.values[k]?.max ?? ''} onChange={(e) => setValue(i, k, 'max', e.target.value)} />
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && <p role="alert" className="text-sm font-medium text-danger">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => setRows((r) => [...r, blankRow()])} disabled={rows.length >= 30}>Add a size</Button>
        <Button type="submit" variant="accent" size="sm">{initial ? "These numbers are right: use this chart" : "Use this chart"}</Button>
        {onCancel && <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>}
      </div>
    </form>
  )
}

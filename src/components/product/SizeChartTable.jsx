import { fromCanonical } from '../../utils/units'

const HEADINGS = {
  chest: 'Chest', shoulder: 'Shoulder', waist: 'Waist', hips: 'Hips', inseam: 'Inseam',
  footLength: 'Foot length', headCircumference: 'Head',
}

// Chart values are stored in cm; shown in the user's preferred length unit.
export default function SizeChartTable({ chart, unit = 'cm', highlightSize }) {
  const fmt = ([lo, hi]) => `${fromCanonical(lo, 'length', unit)}–${fromCanonical(hi, 'length', unit)}`
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[320px] text-left text-sm">
        <caption className="sr-only">{chart.name} size chart, body measurements in {unit}</caption>
        <thead className="bg-fog text-muted">
          <tr>
            <th scope="col" className="px-4 py-2.5 font-medium">Size</th>
            {chart.measurements.map((m) => (
              <th key={m} scope="col" className="px-4 py-2.5 font-medium">{HEADINGS[m]} ({unit})</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {chart.rows.map((row) => (
            <tr key={row.size} className={`border-t border-line ${row.size === highlightSize ? 'bg-tape-soft' : ''}`}>
              <th scope="row" className="px-4 py-2.5 font-semibold">{row.size}</th>
              {chart.measurements.map((m) => <td key={m} className="px-4 py-2.5">{fmt(row[m])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

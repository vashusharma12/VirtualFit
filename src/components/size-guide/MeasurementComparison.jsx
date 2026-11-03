import { fromCanonical } from '../../utils/units'

const STATUS_TEXT = {
  within: (r) => (r.position === 'middle' ? 'Comfortable fit' : r.position === 'low' ? 'Fits, near the lower end' : 'Fits, near the upper end'),
  above: (r, show) => `${show(r.diff)} over: ${r.feel}`,
  below: (r, show) => `${show(r.diff)} under: ${r.feel}`,
}

export default function MeasurementComparison({ comparison, unit }) {
  const show = (cm) => `${fromCanonical(cm, 'length', unit)} ${unit}`
  const { size, rows, missing } = comparison.recommended
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[460px] text-left text-sm">
        <caption className="sr-only">Your measurements compared with size {size}</caption>
        <thead className="bg-fog text-muted">
          <tr>
            <th scope="col" className="px-4 py-2.5 font-medium">Measurement</th>
            <th scope="col" className="px-4 py-2.5 font-medium">You</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Size {size}</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Result</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-t border-line">
              <th scope="row" className="px-4 py-2.5 font-medium capitalize">{r.label}</th>
              <td className="px-4 py-2.5">{show(r.user)}</td>
              <td className="px-4 py-2.5">{show(r.rangeLow)} to {show(r.rangeHigh)}</td>
              <td className={`px-4 py-2.5 font-medium ${r.status === 'within' ? 'text-ok' : 'text-danger'}`}>{STATUS_TEXT[r.status](r, show)}</td>
            </tr>
          ))}
          {missing.map((m) => (
            <tr key={m.key} className="border-t border-line text-muted">
              <th scope="row" className="px-4 py-2.5 font-medium capitalize">{m.label}</th>
              <td className="px-4 py-2.5">Not entered</td><td className="px-4 py-2.5">—</td><td className="px-4 py-2.5">Not used</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

import { useSelector } from 'react-redux'
import { MEASUREMENT_FIELDS } from '../../data/measurementFields'
import { formatMeasurement } from '../../utils/units'
import Card from '../common/Card'
import Button from '../common/Button'

export default function MeasurementsSummary() {
  const m = useSelector((s) => s.measurements)
  const entered = MEASUREMENT_FIELDS.filter((f) => m[f.key] != null)

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Your measurements</h2>
        <Button to="/measurements" variant="secondary" size="sm">{entered.length ? 'Edit' : 'Add'}</Button>
      </div>
      {entered.length === 0 ? (
        <p className="mt-3 text-sm text-muted">You have not added any measurements yet. They are what size recommendations are based on.</p>
      ) : (
        <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {entered.map((f) => (
            <div key={f.key} className="rounded-lg border border-line px-3 py-2">
              <dt className="text-xs text-muted">{f.label}</dt>
              <dd className="font-display text-lg font-bold">{formatMeasurement(m[f.key], f.kind, m.displayUnits[f.kind])}</dd>
            </div>
          ))}
        </dl>
      )}
    </Card>
  )
}

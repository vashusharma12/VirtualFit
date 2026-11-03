import { useSelector } from 'react-redux'
import { CATEGORY_BY_ID } from '../../data/categories'
import { FIELD_BY_KEY } from '../../data/measurementFields'
import { measurementStatus } from '../../utils/calculations'
import { formatMeasurement } from '../../utils/units'
import Card from '../common/Card'
import Badge from '../common/Badge'
import Button from '../common/Button'

const NAMES = { ...Object.fromEntries(Object.entries(FIELD_BY_KEY).map(([k, f]) => [k, f.label])) }

// Shows only the measurements this category needs, and which of them you have entered.
export default function MeasurementReadiness({ category }) {
  const measurements = useSelector((s) => s.measurements)
  const items = measurementStatus(category, measurements)
  const missing = items.filter((i) => !i.present)
  if (!missing.length) return null

  return (
    <Card className="p-5 sm:p-7">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-bold">Make this more accurate</h2>
        <Badge tone="accent">{missing.length} missing</Badge>
      </div>
      <p className="mt-2 text-sm text-muted">{CATEGORY_BY_ID[category].singular} sizing uses these measurements. Adding the missing ones makes the result more reliable.</p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {items.map((i) => {
          const f = FIELD_BY_KEY[i.key]
          return (
            <li key={i.key} className="flex justify-between rounded-lg border border-line px-3 py-2 text-sm">
              <span className="text-muted">{NAMES[i.key]}</span>
              <span className={i.present ? 'font-medium' : 'text-danger'}>
                {i.present ? formatMeasurement(i.value, f.kind, measurements.displayUnits[f.kind]) : 'Missing'}
              </span>
            </li>
          )
        })}
      </ul>
      <Button to="/measurements" variant="secondary" size="sm" className="mt-4">Add missing measurements</Button>
    </Card>
  )
}

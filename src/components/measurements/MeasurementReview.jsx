import { MEASUREMENT_FIELDS, MEASUREMENT_STEPS } from '../../data/measurementFields'
import Button from '../common/Button'

export default function MeasurementReview({ values, units, onEdit }) {
  return (
    <div className="space-y-5">
      {MEASUREMENT_STEPS.filter((s) => s.fields.length).map((s, i) => (
        <section key={s.id} aria-labelledby={`review-${s.id}`}>
          <div className="flex items-center justify-between">
            <h3 id={`review-${s.id}`} className="text-base font-bold">{s.title}</h3>
            <Button variant="ghost" size="sm" onClick={() => onEdit(i)} aria-label={`Edit ${s.title} measurements`}>
              Edit
            </Button>
          </div>
          <dl className="mt-1 divide-y divide-line rounded-xl border border-line">
            {s.fields.map((key) => {
              const f = MEASUREMENT_FIELDS.find((x) => x.key === key)
              const v = values[key].trim()
              return (
                <div key={key} className="flex justify-between gap-4 px-4 py-2.5 text-sm">
                  <dt className="text-muted">{f.label}</dt>
                  <dd className="font-medium">{v ? `${v} ${units[f.kind]}` : 'Not added'}</dd>
                </div>
              )
            })}
          </dl>
        </section>
      ))}
    </div>
  )
}

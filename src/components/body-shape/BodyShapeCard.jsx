import { useSelector } from 'react-redux'
import Card from '../common/Card'
import Badge from '../common/Badge'
import { fromCanonical } from '../../utils/units'
import BodyShapeFigure from './BodyShapeFigure'

export default function BodyShapeCard({ result }) {
  const unit = useSelector((s) => s.measurements.displayUnits.length)
  const show = (cm) => `${fromCanonical(cm, 'length', unit)} ${unit}`
  const { chest, waist, hips } = result.basedOn

  return (
    <Card className="p-5 sm:p-8">
      <div className="grid gap-6 sm:grid-cols-[150px_1fr] sm:items-center">
        <div className="mx-auto h-44 w-36 rounded-2xl bg-fog p-3"><BodyShapeFigure shape={result.shape} /></div>
        <div>
          <Badge tone="accent">Estimated from your measurements</Badge>
          <h3 className="mt-2 text-3xl font-bold">{result.label}</h3>
          <p className="mt-2">{result.summary}</p>
          <p className="mt-3 text-sm text-muted">{result.fitNotes}</p>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-3 gap-3 text-center">
        {[['Chest', chest], ['Waist', waist], ['Hips', hips]].map(([label, v]) => (
          <div key={label} className="rounded-xl border border-line p-3">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="mt-0.5 font-display text-lg font-bold">{show(v)}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-5 text-xs text-muted">
        This is an estimate from standard proportion rules using your chest, waist and hips. It does not analyse your photos,
        and body shape is a rough guide, not a diagnosis. Your size is decided by your actual measurements.
      </p>
    </Card>
  )
}

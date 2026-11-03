import { useSelector } from 'react-redux'
import { BODY_SHAPES } from '../../services/bodyShapeService'
import Card from '../common/Card'
import Button from '../common/Button'
import BodyShapeFigure from '../body-shape/BodyShapeFigure'

export default function BodyShapeSummary() {
  const shape = useSelector((s) => s.profile.bodyShape)
  const info = BODY_SHAPES[shape]
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-xl font-bold">Body shape</h2>
      {info ? (
        <div className="mt-3 flex items-center gap-4">
          <div className="h-24 w-20 shrink-0 rounded-xl bg-fog p-2"><BodyShapeFigure shape={shape} /></div>
          <div>
            <p className="font-display text-xl font-bold">{info.label}</p>
            <p className="text-sm text-muted">{info.summary}</p>
            <p className="mt-1 text-xs text-muted">Estimated from your measurements.</p>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-3 text-sm text-muted">Add your chest, waist and hips to see an estimate.</p>
          <Button to="/body-profile" variant="secondary" size="sm" className="mt-3">Estimate my body shape</Button>
        </>
      )}
    </Card>
  )
}

import { useBodyShape } from '../../hooks/useBodyShape'
import BodyShapeCard from './BodyShapeCard'
import Card from '../common/Card'
import Button from '../common/Button'
import Skeleton from '../common/Skeleton'
import ErrorState from '../common/ErrorState'
import Spinner from '../common/Spinner'

const LABELS = { chest: 'chest', waist: 'waist', hips: 'hips' }

export default function BodyShapeSection() {
  const { status, result, retry } = useBodyShape()

  if (status === 'loading') {
    return (
      <Card className="p-8" aria-busy="true">
        <div className="flex items-center gap-3 text-muted"><Spinner size={20} /> Estimating your body shape…</div>
        <Skeleton className="mt-5 h-32 w-full" />
      </Card>
    )
  }
  if (status === 'error') return <ErrorState title="Could not estimate your body shape" onRetry={retry} />
  if (status === 'insufficient') {
    return (
      <Card className="p-6 sm:p-8">
        <h3 className="text-xl font-bold">We need a few more measurements</h3>
        <p className="mt-2 text-muted">
          Add your {result.missing.map((k) => LABELS[k]).join(', ')} to see your estimated body shape.
        </p>
        <Button to="/measurements" variant="accent" className="mt-5">Add measurements</Button>
      </Card>
    )
  }
  return (
    <div className="space-y-4">
      <BodyShapeCard result={result} />
      <Button to="/measurements" variant="secondary" size="sm">Edit measurements</Button>
    </div>
  )
}

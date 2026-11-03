import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import Card from '../common/Card'
import ResultThumb from '../try-on/ResultThumb'
import Skeleton from '../common/Skeleton'

export default function TryOnHistory() {
  const { history } = useSelector((s) => s.tryOn)
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Try-on results</h2>
        <Link to="/results" className="text-sm font-medium text-denim underline underline-offset-2">See all</Link>
      </div>
      {(history.status === 'idle' || history.status === 'loading') && <Skeleton className="mt-4 h-32" />}
      {history.status === 'failed' && <p className="mt-3 text-sm text-muted">Could not load your results.</p>}
      {history.status === 'succeeded' && history.items.length === 0 && <p className="mt-3 text-sm text-muted">No try-on results yet. Pick a product and a size to create one.</p>}
      {history.status === 'succeeded' && history.items.length > 0 && (
        <ul className="mt-4 grid grid-cols-2 gap-3">{history.items.slice(0, 4).map((j) => <li key={j.id}><ResultThumb job={j} /></li>)}</ul>
      )}
    </Card>
  )
}

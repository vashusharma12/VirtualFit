import Card from '../common/Card'
import Button from '../common/Button'

export default function TryOnProcessing({ job, onCancel }) {
  const progress = job?.progress ?? 0
  return (
    <Card className="mx-auto max-w-xl p-8 text-center" aria-busy="true">
      <h2 className="text-2xl font-bold">Preparing your virtual try-on…</h2>
      <p className="mt-2 text-muted" role="status" aria-live="polite">{job?.stage || 'Starting'}</p>
      <div className="mt-6 h-3 overflow-hidden rounded-full bg-ink/10" role="progressbar" aria-label="Try-on progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
        <div className="h-full rounded-full bg-tape transition-all duration-500" style={{ width: `${Math.max(6, progress)}%` }} />
      </div>
      <p className="mt-2 text-sm text-muted">{progress}%. This usually takes under a minute.</p>
      <Button variant="secondary" className="mt-6" onClick={onCancel}>Cancel</Button>
    </Card>
  )
}

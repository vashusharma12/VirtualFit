import Card from '../common/Card'
import Badge from '../common/Badge'
import ConfidenceMeter from './ConfidenceMeter'
import SizeRuler from './SizeRuler'

const REASON_STYLE = {
  good: { dot: 'bg-ok', sr: 'Good news: ' },
  note: { dot: 'bg-denim', sr: 'Note: ' },
  warn: { dot: 'bg-danger', sr: 'Heads up: ' },
}
const BASIS = { body: 'Body measurements', garment: 'Garment measurements', unknown: 'Basis unclear' }
const SOURCE = { page: 'From the product page', demo: 'Demo chart', manual: 'Entered by you', generic: 'Standard sizing' }

export default function RecommendationCard({ result, product, unit }) {
  const { meta } = result
  const closest = result.status === 'no_good_fit'
  const used = meta.measurementsUsed.length
  const details = [
    ['Fit quality', `${Math.round(meta.score * 100)}%`],
    ['Gap to the next-best size', meta.margin >= 0.4 ? 'Clear' : meta.margin >= 0.15 ? 'Small' : 'Very close'],
    ['Measurements used', `${used} of ${used + meta.missingMeasurements.length}`],
    ['Size chart', `${SOURCE[meta.source] ?? 'Size chart'}, ${BASIS[meta.basis].toLowerCase()}`],
  ]
  const head = result.comparison.recommended.rows.reduce((a, b) => (b.weight > a.weight ? b : a))

  return (
    <Card className={`p-5 sm:p-8 ${closest ? 'border-danger/40' : ''}`}>
      <p className="text-sm text-muted">{product.brand ? `${product.brand} · ` : ''}{product.name}</p>
      <div className="mt-3 grid gap-6 sm:grid-cols-2 sm:items-end">
        <div>
          <p className="text-sm text-muted">{closest ? 'Closest size (may not fit well)' : 'Recommended size'}</p>
          <p className="font-display text-7xl font-bold leading-none sm:text-8xl" aria-label={`${closest ? 'Closest' : 'Recommended'} size ${result.recommendedSize}`}>{result.recommendedSize}</p>
          {meta.between && <div className="mt-3"><Badge tone="accent">Between {meta.between[0]} and {meta.between[1]}</Badge></div>}
        </div>
        <ConfidenceMeter value={result.confidence} label={result.confidenceLabel} details={details} />
      </div>

      <div className="mt-6"><SizeRuler meta={meta} label={head.label} unit={unit} chosen={result.recommendedSize} /></div>

      <section className="mt-6" aria-labelledby="why-heading">
        <h3 id="why-heading" className="text-lg font-bold">Why {result.recommendedSize}?</h3>
        <p className="mt-1.5">{result.explanation}</p>
        {result.reasons.length > 0 && (
          <ul className="mt-3 space-y-2 text-sm">
            {result.reasons.map((r) => (
              <li key={r.text} className="flex gap-2.5">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${REASON_STYLE[r.tone].dot}`} aria-hidden="true" />
                <span><span className="sr-only">{REASON_STYLE[r.tone].sr}</span>{r.text}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Card>
  )
}

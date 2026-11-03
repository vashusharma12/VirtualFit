import { formatCount } from '../../utils/format'

function Star({ fill }) {
  return (
    <span className="relative inline-block h-4 w-4" aria-hidden="true">
      <svg viewBox="0 0 20 20" className="absolute inset-0 text-ink/15" fill="currentColor"><path d="M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L10 14.9 4.8 17.7l1-5.9L1.5 7.7l5.9-.8z" /></svg>
      <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
        <svg viewBox="0 0 20 20" className="h-4 w-4 text-tape" fill="currentColor"><path d="M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L10 14.9 4.8 17.7l1-5.9L1.5 7.7l5.9-.8z" /></svg>
      </span>
    </span>
  )
}

export default function ProductRating({ rating, reviewCount, compact = false }) {
  return (
    <div className="flex items-center gap-1.5" role="img" aria-label={`Rated ${rating} out of 5${reviewCount ? ` from ${formatCount(reviewCount)} reviews` : ''}`}>
      <span className="flex">
        {[0, 1, 2, 3, 4].map((i) => <Star key={i} fill={Math.max(0, Math.min(1, rating - i))} />)}
      </span>
      <span className="text-sm font-medium" aria-hidden="true">{rating.toFixed(1)}</span>
      {reviewCount != null && !compact && <span className="text-sm text-muted" aria-hidden="true">({formatCount(reviewCount)})</span>}
    </div>
  )
}

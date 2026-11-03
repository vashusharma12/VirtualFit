import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { removeRecommendation } from '../../redux/slices/sizeGuideSlice'
import { CATEGORY_BY_ID } from '../../data/categories'
import Badge from '../common/Badge'
import Button from '../common/Button'

const isDemoId = (id) => /^p-\d+$/.test(id ?? '')
const linkFor = (h) => (isDemoId(h.product.id) ? `/products/${h.product.id}` : h.product.productUrl ?? '/size-guide')

// Saved size recommendations. `limit` shortens it for the dashboard; `manage` adds remove buttons.
export default function RecommendationHistory({ limit, manage = false }) {
  const dispatch = useDispatch()
  const history = useSelector((s) => s.sizeGuide.history)
  const items = limit ? history.slice(0, limit) : history
  if (!items.length) return null

  return (
    <ul className="divide-y divide-line rounded-xl border border-line bg-white">
      {items.map((h) => {
        const external = !isDemoId(h.product.id) && /^https?:/.test(linkFor(h))
        const to = linkFor(h)
        return (
          <li key={h.id} className="flex items-center gap-3 p-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-tape font-display text-lg font-bold" aria-label={`Size ${h.size}`}>{h.size}</div>
            <div className="min-w-0 flex-1">
              {external
                ? <a href={to} target="_blank" rel="noopener noreferrer" className="block truncate font-medium hover:underline">{h.product.name}</a>
                : <Link to={to} className="block truncate font-medium hover:underline">{h.product.name}</Link>}
              <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
                {CATEGORY_BY_ID[h.product.category]?.singular} · {h.confidence}% confidence · {new Date(h.savedAt).toLocaleDateString()}
                {h.status === 'no_good_fit' && <Badge tone="danger">Poor fit</Badge>}
              </p>
            </div>
            {manage && <Button variant="ghost" size="sm" onClick={() => dispatch(removeRecommendation(h.id))} aria-label={`Remove saved size for ${h.product.name}`}>Remove</Button>}
          </li>
        )
      })}
    </ul>
  )
}

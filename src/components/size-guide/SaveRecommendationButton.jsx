import { useDispatch, useSelector } from 'react-redux'
import { removeRecommendation, saveRecommendation } from '../../redux/slices/sizeGuideSlice'
import Button from '../common/Button'

const http = (u) => (/^https?:\/\//i.test(u ?? '') ? u : null)

export default function SaveRecommendationButton({ product, result, category }) {
  const dispatch = useDispatch()
  const history = useSelector((s) => s.sizeGuide.history)
  const measurements = useSelector((s) => s.measurements)
  const existing = history.find((h) => h.product.id === product.id && h.size === result.recommendedSize && h.fitPreference === result.meta.fitPreference)

  if (existing) {
    return <Button variant="secondary" onClick={() => dispatch(removeRecommendation(existing.id))} aria-pressed="true">Saved: remove</Button>
  }
  const save = () =>
    dispatch(saveRecommendation({
      id: `rec_${Date.now().toString(36)}`,
      savedAt: new Date().toISOString(),
      product: { id: product.id, name: product.name, brand: product.brand ?? '', category, sourceSite: product.sourceSite ?? '', productUrl: http(product.productUrl), image: http(product.image), source: product.source },
      size: result.recommendedSize,
      confidence: result.confidence,
      status: result.status,
      fitPreference: result.meta.fitPreference,
      chartSource: result.meta.source,
      measurements: Object.fromEntries(result.meta.measurementsUsed.map((k) => [k, measurements[k]])),
    }))
  return <Button variant="secondary" onClick={save}>Save this result</Button>
}

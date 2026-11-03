import { recommendSize } from './sizeEngine'
import { fromCanonical } from './units'

// A frozen copy of the size advice at the moment a try-on was made, stored with the result so the
// result page keeps showing what was true then, even if measurements change later.
export function buildFitSnapshot({ measurements, chart, category, product, size, fitPreference, source, unit }) {
  const result = recommendSize(measurements, chart, category, {
    fitPreference, availableSizes: product.availableSizes?.length ? product.availableSizes : null, productFit: product.fit ?? '', unit, source, selectedSize: size,
  })
  const show = (cm) => `${fromCanonical(cm, 'length', unit)} ${unit}`
  let selectedNote
  if (result.selected && !result.selected.isRecommended) {
    const off = result.selected.rows.filter((r) => r.status !== 'within')
    selectedNote = off.length
      ? `Size ${size}: ${off.map((r) => `your ${r.label} is ${show(r.diff)} ${r.status === 'above' ? 'over' : 'under'} its range, so it may feel ${r.feel}`).join('; ')}.`
      : `Size ${size} also fits your measurements.`
  }
  return {
    recommendedSize: result.recommendedSize,
    confidence: result.confidence,
    confidenceLabel: result.confidenceLabel,
    explanation: result.explanation.slice(0, 600),
    status: result.status === 'insufficient' ? 'insufficient' : result.status,
    fitPreference: result.meta.fitPreference,
    measurementsUsed: Object.fromEntries((result.meta.measurementsUsed ?? []).map((k) => [k, measurements[k]])),
    reasons: result.reasons.slice(0, 4).map((r) => ({ tone: r.tone, text: r.text.slice(0, 300) })),
    ...(selectedNote ? { selectedNote: selectedNote.slice(0, 400) } : {}),
  }
}

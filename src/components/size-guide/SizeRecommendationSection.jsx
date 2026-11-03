import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { computeRecommendation } from '../../redux/slices/sizeGuideSlice'
import { fetchTryOnConfig } from '../../redux/slices/tryOnSlice'
import { CATEGORY_BY_ID } from '../../data/categories'
import RecommendationCard from './RecommendationCard'
import MeasurementComparison from './MeasurementComparison'
import SizeAlternatives from './SizeAlternatives'
import FitPreferenceSelector from './FitPreferenceSelector'
import SaveRecommendationButton from './SaveRecommendationButton'
import Card from '../common/Card'
import Button from '../common/Button'
import Spinner from '../common/Spinner'
import ErrorState from '../common/ErrorState'

export default function SizeRecommendationSection({ resolved, onChooseAnother }) {
  const dispatch = useDispatch()
  const { current } = useSelector((s) => s.sizeGuide)
  const measurements = useSelector((s) => s.measurements)
  const fitPreference = useSelector((s) => s.profile.preferences?.fitPreference)
  const tryOnConfig = useSelector((s) => s.tryOn.config)
  const unit = measurements.displayUnits.length
  const { product, chart } = resolved
  const category = resolved.category.category

  // Recalculates whenever the product, chart, measurements or fit preference change.
  useEffect(() => {
    dispatch(computeRecommendation())
  }, [dispatch, product, chart, category, measurements, fitPreference])

  useEffect(() => {
    if (tryOnConfig.status === 'idle') dispatch(fetchTryOnConfig())
  }, [dispatch, tryOnConfig.status])

  const result = current.forProductId === product.id ? current.result : null

  if (current.status === 'failed') return <ErrorState title="Could not calculate your size" message={current.error} onRetry={() => dispatch(computeRecommendation())} />
  if (!result) {
    return (
      <Card className="flex items-center gap-3 p-6" aria-busy="true">
        <Spinner size={22} /><p className="font-medium">Calculating your size…</p>
      </Card>
    )
  }

  if (result.status === 'insufficient') {
    return (
      <Card className="p-5 sm:p-7">
        <h2 className="text-xl font-bold">We need a measurement to recommend a size</h2>
        <p className="mt-2 text-muted">{result.explanation}</p>
        <Button to="/measurements" variant="accent" className="mt-4">Add measurements</Button>
      </Card>
    )
  }

  return (
    <div className="space-y-6" aria-busy={current.status === 'loading'}>
      <div aria-live="polite">
        <RecommendationCard result={result} product={product} unit={unit} />
      </div>

      <Card className="p-5 sm:p-6"><FitPreferenceSelector /></Card>

      <section aria-labelledby="compare-heading">
        <h3 id="compare-heading" className="mb-3 text-lg font-bold">Your measurements vs size {result.recommendedSize}</h3>
        <MeasurementComparison comparison={result.comparison} unit={unit} />
      </section>

      <section aria-labelledby="alt-heading">
        <h3 id="alt-heading" className="mb-3 text-lg font-bold">What about a different size?</h3>
        <SizeAlternatives comparison={result.comparison} availableSizes={product.availableSizes?.length ? product.availableSizes : null} unit={unit} />
      </section>

      {(category === 'topwear' || category === 'bottomwear') && (() => {
        // Honest about what the button does: a simulated preview is not an AI try-on.
        const simulated = !(tryOnConfig.status === 'succeeded' && tryOnConfig.provider && !tryOnConfig.provider.simulated)
        return (
          <div className="rounded-2xl border border-line bg-white p-5 text-center sm:p-6">
            <Button
              to={`/try-on?product=${encodeURIComponent(product.id)}&size=${encodeURIComponent(result.recommendedSize)}`}
              size="lg"
              className="cta-glow w-full sm:w-auto sm:min-w-[16rem]"
            >
              {simulated ? 'Preview it on me' : 'Try it on me'} <span aria-hidden="true">✨</span>
            </Button>
            <p className="mt-3 text-sm text-muted">
              {simulated
                ? `See size ${result.recommendedSize} next to your photo. This is a simple preview, not an AI try-on.`
                : `See size ${result.recommendedSize} on your photo, made by an AI service. You will be asked to confirm first.`}
            </p>
          </div>
        )
      })()}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <SaveRecommendationButton product={product} result={result} category={category} />
        <Button variant="ghost" onClick={onChooseAnother}>Check another product</Button>
      </div>
      <p className="text-xs text-muted">
        Sizes are an estimate from {CATEGORY_BY_ID[category].requiredMeasurements.length ? 'your measurements and the size chart' : 'the size chart'}. Fabric, cut and how you like to wear things all matter, and self-measurements are rarely exact.
      </p>
    </div>
  )
}

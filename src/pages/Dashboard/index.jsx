import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { fetchProducts } from '../../redux/slices/productSlice'
import { fetchPhotos } from '../../redux/slices/photosSlice'
import { fetchTryOnHistory } from '../../redux/slices/tryOnSlice'
import CompletionCard from '../../components/dashboard/CompletionCard'
import MeasurementsSummary from '../../components/dashboard/MeasurementsSummary'
import BodyShapeSummary from '../../components/dashboard/BodyShapeSummary'
import SavedProducts from '../../components/dashboard/SavedProducts'
import RecommendationHistory from '../../components/dashboard/RecommendationHistory'
import TryOnHistory from '../../components/dashboard/TryOnHistory'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'

export default function Dashboard() {
  const dispatch = useDispatch()
  const user = useSelector((s) => s.auth.user)
  const profile = useSelector((s) => s.profile)
  const sizeHistory = useSelector((s) => s.sizeGuide.history)

  useEffect(() => {
    dispatch(fetchProducts())
    dispatch(fetchPhotos())
    dispatch(fetchTryOnHistory())
  }, [dispatch])

  const name = (profile.name || user?.name || '').split(' ')[0]

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">{name ? `Hi, ${name}` : 'Your dashboard'}</h1>
          <p className="mt-2 text-muted">Your fit profile, saved sizes and try-on results in one place.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button to="/size-guide" variant="accent" size="lg">Check a product link</Button>
          <Button to="/products" variant="secondary" size="lg">Try a demo product</Button>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-6">
          <CompletionCard />
          <MeasurementsSummary />
          <BodyShapeSummary />
        </div>
        <div className="space-y-6">
          {profile.savedProductIds.length > 0 && <SavedProducts />}
          <Card className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold">Previous size recommendations</h2>
              {sizeHistory.length > 0 && <Link to="/results" className="text-sm font-medium text-denim underline underline-offset-2">Manage</Link>}
            </div>
            {sizeHistory.length === 0
              ? <p className="mt-3 text-sm text-muted">When you save a size recommendation it appears here.</p>
              : <div className="mt-4"><RecommendationHistory limit={4} /></div>}
          </Card>
          <TryOnHistory />
        </div>
      </div>
    </div>
  )
}

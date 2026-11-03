import { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { fetchProductById } from '../../redux/slices/productSlice'
import { fetchPhotos } from '../../redux/slices/photosSlice'
import { fetchTryOnConfig, resetTryOn, startTryOn } from '../../redux/slices/tryOnSlice'
import { selectResolvedAnalysis } from '../../redux/selectors/analysisSelectors'
import { recommendSize } from '../../utils/sizeEngine'
import TryOnStage from '../../components/try-on/TryOnStage'
import TryOnProcessing from '../../components/try-on/TryOnProcessing'
import Skeleton from '../../components/common/Skeleton'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import Button from '../../components/common/Button'

const isDemoId = (id) => /^p-\d+$/.test(id ?? '')

// Builds the small "size advice at the time" snapshot that is stored with the result.
function fitSnapshot(rec, size, measurements) {
  if (rec.status === 'insufficient') {
    return { recommendedSize: null, confidence: 0, explanation: rec.explanation.slice(0, 700), status: 'insufficient', reasons: [] }
  }
  return {
    recommendedSize: rec.recommendedSize,
    confidence: rec.confidence,
    confidenceLabel: rec.confidenceLabel,
    explanation: rec.explanation.slice(0, 700),
    status: rec.status,
    measurementsUsed: Object.fromEntries(rec.meta.measurementsUsed.map((k) => [k, measurements[k]])),
    reasons: rec.reasons.slice(0, 8).map((r) => ({ tone: r.tone, text: r.text.slice(0, 400) })),
    fitPreference: rec.meta.fitPreference,
    ...(size !== rec.recommendedSize ? { selectedNote: `You chose size ${size}. The recommended size was ${rec.recommendedSize}.` } : {}),
  }
}

export default function TryOn() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const productId = params.get('product')
  const sizeParam = params.get('size')

  const { selectedProduct, detailStatus } = useSelector((s) => s.products)
  const resolved = useSelector(selectResolvedAnalysis)
  const photos = useSelector((s) => s.photos)
  const measurements = useSelector((s) => s.measurements)
  const fitPreference = useSelector((s) => s.profile.preferences?.fitPreference)
  const { status, job, error, result, config } = useSelector((s) => s.tryOn)
  const lastRecommendation = useSelector((s) => s.sizeGuide.current)

  const [size, setSize] = useState(sizeParam)
  const [confirmed, setConfirmed] = useState(false)
  const running = useRef(null)

  useEffect(() => { dispatch(fetchPhotos()); dispatch(fetchTryOnConfig()) }, [dispatch])
  useEffect(() => { if (isDemoId(productId)) dispatch(fetchProductById(productId)) }, [dispatch, productId])
  // Leaving the page cancels a running preview, so nothing keeps running (or costing money) unseen.
  useEffect(() => () => running.current?.abort?.(), [])

  // Demo products come from the catalog; analyzed or manual ones from the size guide.
  const product = isDemoId(productId)
    ? (detailStatus === 'succeeded' && selectedProduct?.id === productId ? selectedProduct : null)
    : resolved?.product?.id === productId ? resolved.product : null
  const category = isDemoId(productId) ? product?.category : resolved?.category?.category
  const chart = isDemoId(productId) ? product?.sizeChart : resolved?.chart
  const chartSource = isDemoId(productId) ? undefined : resolved?.chartSource

  const recommendation = useMemo(
    () => (product && chart && category
      ? recommendSize(measurements, chart, category, {
        fitPreference, availableSizes: product.availableSizes?.length ? product.availableSizes : null, productFit: product.fit ?? '',
        unit: measurements.displayUnits.length, source: chartSource,
      })
      : null),
    [product, chart, category, measurements, fitPreference, chartSource],
  )

  useEffect(() => {
    if (status === 'succeeded' && result) {
      dispatch(resetTryOn())
      navigate(`/results?job=${result.id}`, { replace: true })
    }
  }, [status, result, dispatch, navigate])

  const pickSize = (s) => {
    setSize(s)
    setParams({ product: productId, size: s }, { replace: true })
  }
  const generate = () => {
    const fit = recommendation ? fitSnapshot(recommendation, size, measurements) : null
    running.current = dispatch(startTryOn({ product: { ...product, category }, size, fit, confirmExternal: confirmed, userImageUrl: photos.items.front?.url }))
  }
  const cancel = () => running.current?.abort()

  const loading = photos.status === 'idle' || photos.status === 'loading' || config.status === 'idle' || config.status === 'loading' || (isDemoId(productId) && detailStatus === 'loading')
  const frontPhoto = photos.items.front

  let body
  const sizeable = resolved?.product && ['topwear', 'bottomwear'].includes(resolved.category?.category)
  if (!productId && sizeable) {
    // Opened from the header after checking a product: carry straight on with that product and its size.
    const size = lastRecommendation.forProductId === resolved.product.id ? lastRecommendation.result?.recommendedSize : null
    body = <Navigate replace to={`/try-on?product=${encodeURIComponent(resolved.product.id)}${size ? `&size=${encodeURIComponent(size)}` : ''}`} />
  } else if (!productId) {
    body = (
      <EmptyState
        title="Check a product first"
        description="A preview needs a product and a size. Paste a product link, get your size, then preview it on your photo."
        action={<div className="flex flex-wrap justify-center gap-3"><Button to="/" variant="accent">Paste a product link</Button><Button to="/results" variant="secondary">See my results</Button></div>}
      />
    )
  } else if (loading) {
    body = <div className="grid gap-4 md:grid-cols-3" aria-busy="true" aria-label="Loading"><Skeleton className="h-96" /><Skeleton className="h-96" /><Skeleton className="h-96" /></div>
  } else if (isDemoId(productId) && detailStatus === 'notFound') {
    body = <EmptyState title="Product not found" action={<Button to="/products" variant="accent">Browse products</Button>} />
  } else if (!product) {
    body = <EmptyState title="We lost track of that product" description="Open it again from the product page or the size guide." action={<Button to="/size-guide" variant="accent">Go to the size guide</Button>} />
  } else if (config.status === 'failed') {
    body = <ErrorState title="Try-on is unavailable" message="We could not reach the try-on service." onRetry={() => dispatch(fetchTryOnConfig())} />
  } else if (!config.supportedCategories.includes(category)) {
    body = <EmptyState title="Try-on is for tops and bottoms" description="Previews are not available for shoes, caps or hats yet. Your size recommendation still works." action={<Button to={`/size-guide?product=${productId}`} variant="accent">Find my size</Button>} />
  } else if (photos.status === 'failed') {
    body = <ErrorState title="Could not load your photos" message={photos.error} onRetry={() => dispatch(fetchPhotos())} />
  } else if (!photos.consent.granted || !frontPhoto) {
    body = <EmptyState title="Add a front photo first" description="A try-on preview needs a photo of you. Your photos stay private and you can delete them any time." action={<Button to="/body-profile" variant="accent">Add photos</Button>} />
  } else if (status === 'preparing' || status === 'processing') {
    body = <TryOnProcessing job={job} onCancel={cancel} />
  } else {
    body = (
      <div className="space-y-6">
        {status === 'failed' && (
          <div role="alert" className="rounded-xl border border-danger/30 bg-danger/5 p-4">
            <p className="font-medium text-danger">{error?.message}</p>
            {['photo_required', 'consent_required'].includes(error?.code) && <Button to="/body-profile" variant="secondary" size="sm" className="mt-3">Go to photos</Button>}
          </div>
        )}
        <TryOnStage
          product={product} photoUrl={frontPhoto.url} sizes={chart.rows.map((r) => r.size)}
          availableSizes={product.availableSizes?.length ? product.availableSizes : chart.rows.map((r) => r.size)}
          size={size} onSizeChange={pickSize} recommendation={recommendation?.status === 'insufficient' ? null : recommendation}
          provider={config.provider} confirmed={confirmed} onConfirm={setConfirmed} onGenerate={generate}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-bold sm:text-4xl">Virtual try-on</h1>
      <p className="mt-2 max-w-2xl text-muted">See your chosen size next to you before you buy.</p>
      <div className="mt-8">{body}</div>
    </div>
  )
}

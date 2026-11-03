import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useSearchParams } from 'react-router-dom'
import { analyzeProductUrl, clearAnalysis, loadDemoProduct } from '../../redux/slices/productSlice'
import { clearPendingLink, getPendingLink } from '../../utils/pendingLink'
import { selectResolvedAnalysis } from '../../redux/selectors/analysisSelectors'
import ProductUrlInput from '../../components/product-analysis/ProductUrlInput'
import AnalysisSummary from '../../components/product-analysis/AnalysisSummary'
import CategoryCheck from '../../components/product-analysis/CategoryCheck'
import SizeChartStatus from '../../components/product-analysis/SizeChartStatus'
import MeasurementReadiness from '../../components/product-analysis/MeasurementReadiness'
import SizeRecommendationSection from '../../components/size-guide/SizeRecommendationSection'
import AnalysisError from '../../components/product-analysis/AnalysisError'
import Spinner from '../../components/common/Spinner'
import Card from '../../components/common/Card'

export default function SizeGuide() {
  const dispatch = useDispatch()
  const [params] = useSearchParams()
  const productParam = params.get('product')
  const { status, error, url } = useSelector((s) => s.products.analysis)
  const resolved = useSelector(selectResolvedAnalysis)

  // Arriving from a demo product page (/size-guide?product=p-004) loads that product.
  useEffect(() => {
    if (productParam && !productParam.startsWith('ext-')) dispatch(loadDemoProduct(productParam))
  }, [productParam, dispatch])

  // A link pasted on the home page before signing up is analysed as soon as the person arrives here.
  useEffect(() => {
    if (productParam || status !== 'idle') return
    const pending = getPendingLink()
    if (!pending) return
    clearPendingLink()
    dispatch(analyzeProductUrl({ url: pending.url, selectedCategory: pending.category }))
  }, [dispatch, productParam, status])

  const chooseAnother = () => {
    dispatch(clearAnalysis())
    setTimeout(() => document.querySelector('input[name="productUrl"]')?.focus(), 0)
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-bold sm:text-4xl">Find your size</h1>
      <p className="mt-2 text-muted">Paste a product link, or pick a product from the catalog. VirtualFit reads its sizes, compares them with your measurements, and explains which size to buy.</p>

      <div className="mt-8 space-y-6">
        <ProductUrlInput />

        <div aria-live="polite">
          {status === 'analyzing' && (
            <Card className="flex items-center gap-3 p-6" aria-busy="true">
              <Spinner size={22} />
              <div>
                <p className="font-medium">Reading the product page…</p>
                <p className="text-sm text-muted">This can take up to half a minute for slow stores.</p>
              </div>
            </Card>
          )}
        </div>

        {status === 'failed' && <AnalysisError error={error} url={url} />}

        {status === 'succeeded' && resolved && (
          <>
            <AnalysisSummary product={resolved.product} info={resolved.info} />
            <CategoryCheck category={resolved.category} info={resolved.info} onChooseAnother={chooseAnother} />
            {resolved.category.category && resolved.chart && <SizeRecommendationSection resolved={resolved} onChooseAnother={chooseAnother} />}
            {resolved.category.category && <SizeChartStatus resolved={resolved} />}
            {resolved.category.category && resolved.chart && <MeasurementReadiness category={resolved.category.category} />}
          </>
        )}
      </div>
    </div>
  )
}

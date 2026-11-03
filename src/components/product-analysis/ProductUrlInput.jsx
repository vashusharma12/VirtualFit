import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { analyzeProductUrl } from '../../redux/slices/productSlice'
import { CATEGORIES } from '../../data/categories'
import { USE_MOCK } from '../../services/apiClient'
import { validators } from '../../utils/validation'
import FormField from '../common/FormField'
import SegmentedControl from '../common/SegmentedControl'
import Button from '../common/Button'
import Card from '../common/Card'
import Badge from '../common/Badge'

const CATEGORY_OPTIONS = [{ value: '', label: 'Not sure' }, ...CATEGORIES.map((c) => ({ value: c.id, label: c.singular }))]
const STORES = ['Myntra', 'Ajio', 'Flipkart', 'Amazon.in']

// `onAnalyze({ url, category })` lets a parent decide what happens with the link (the home page does).
export default function ProductUrlInput({ variant = 'card', ctaLabel = 'Analyze Product', onAnalyze = null }) {
  const dispatch = useDispatch()
  const analyzing = useSelector((s) => s.products.analysis.status === 'analyzing')
  const [url, setUrl] = useState('')
  const [category, setCategory] = useState('')
  const [touched, setTouched] = useState(false)
  const error = touched ? validators.productUrl(url) : ''

  const onSubmit = (e) => {
    e.preventDefault()
    setTouched(true)
    if (validators.productUrl(url)) return
    if (onAnalyze) onAnalyze({ url: url.trim(), category: category || null })
    else dispatch(analyzeProductUrl({ url, selectedCategory: category || null }))
  }

  return (
    <Card className={variant === 'hero' ? 'hero-box p-5 sm:p-7' : 'p-5 sm:p-7'}>
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <div>
          <FormField
            label="Paste Product URL"
            name="productUrl"
            inputMode="url"
            autoComplete="off"
            placeholder="https://www.myntra.com/..."
            value={url}
            error={error}
            hint="Use the link of one product page, not a search or category page."
            onChange={(e) => setUrl(e.target.value)}
            onBlur={() => setTouched(true)}
          />
          <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted">
            Built for: {STORES.map((s) => <Badge key={s}>{s}</Badge>)} Other stores may work too.
          </p>
        </div>

        <div>
          <SegmentedControl legend="What are you shopping for?" name="shopping-category" options={CATEGORY_OPTIONS} value={category} onChange={setCategory} />
          <p className="mt-1.5 text-xs text-muted">Optional. We check this against the product, so a wrong choice is caught.</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button type="submit" variant="accent" size="lg" loading={analyzing} className={variant === 'hero' ? 'cta-glow w-full sm:w-auto' : ''}>
            {analyzing ? 'Analyzing…' : ctaLabel}
          </Button>
          {USE_MOCK && <Badge tone="accent">Demo mode: results are sample data</Badge>}
        </div>
        <p className="text-xs text-muted">
          Our server opens this page to read the product details. Do not paste links that contain private information.
        </p>
      </form>
    </Card>
  )
}

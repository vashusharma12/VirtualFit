import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { clearAnalysis, startManualProduct } from '../../redux/slices/productSlice'
import { CATEGORIES } from '../../data/categories'
import SegmentedControl from '../common/SegmentedControl'
import Button from '../common/Button'
import Card from '../common/Card'

const COPY = {
  not_a_product_page: { title: 'That is not a single product page', tip: "Open one clothing product on the store, then copy the link from your browser's address bar. A product page shows one item with its price and sizes.", manual: false },
  not_clothing: { title: 'That is not a clothing product', tip: 'VirtualFit works out sizes for clothing, shoes, and caps or hats. Paste the link of one of those.', manual: false },
  invalid_url: { title: 'That link will not work', tip: 'Check that you copied the whole address, starting with http or https.', manual: false },
  blocked_host: { title: 'That address cannot be analyzed', tip: 'Use the link of a product page on a public shopping website.', manual: false },
  rate_limited: { title: 'Too many links for now', tip: 'Please wait a little while and try again.', manual: false },
  blocked_by_site: { title: 'This store blocked automated access', tip: 'Some stores, Amazon in particular, refuse automated requests. VirtualFit does not try to get around that. You can still enter the details yourself.', manual: true },
  no_product_data: { title: 'We could not find a product on that page', tip: 'Make sure it is the page of a single product, not a search, category or cart page.', manual: true },
  fetch_failed: { title: 'We could not open that page', tip: 'The link may be wrong, the product removed, or the store may be down.', manual: true },
  timeout: { title: 'The store took too long to respond', tip: 'Try again in a moment.', manual: true },
  not_html: { title: 'That link is not a web page', tip: 'Paste the link of the product page itself.', manual: false },
  too_large: { title: 'That page is too large to read', tip: 'Try a different link to the same product.', manual: true },
}

export default function AnalysisError({ error, url }) {
  const dispatch = useDispatch()
  const selected = useSelector((s) => s.products.analysis.selectedCategory)
  const [category, setCategory] = useState(selected ?? '')
  const copy = COPY[error.code] ?? { title: 'Something went wrong', tip: 'Please try again.', manual: true }

  return (
    <Card role="alert" className="border-danger/30 bg-danger/5 p-5 sm:p-7">
      <h2 className="text-xl font-bold">{copy.title}</h2>
      <p className="mt-2">{error.message}</p>
      <p className="mt-1 text-sm text-muted">{copy.tip}</p>

      {copy.manual && (
        <div className="mt-5 rounded-xl bg-white p-4">
          <p className="font-medium">Or enter the details yourself</p>
          <div className="mt-3">
            <SegmentedControl legend="What kind of product is it?" name="manual-category" options={CATEGORIES.map((c) => ({ value: c.id, label: c.singular }))} value={category} onChange={setCategory} />
          </div>
          <Button className="mt-3" variant="accent" size="sm" disabled={!category} onClick={() => dispatch(startManualProduct({ category, url }))}>
            Continue manually
          </Button>
        </div>
      )}
      <Button className="mt-4" variant="secondary" size="sm" onClick={() => dispatch(clearAnalysis())}>Try another link</Button>
    </Card>
  )
}

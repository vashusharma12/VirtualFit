import { formatPrice } from '../../utils/format'
import { CATEGORY_BY_ID } from '../../data/categories'
import ProductImage from '../product/ProductImage'
import Card from '../common/Card'
import Badge from '../common/Badge'

const METHOD_LABELS = {
  'json-ld': 'Page data', 'open-graph': 'Page tags', 'html-size-table': 'Size table', 'amazon-adapter': 'Amazon reader',
  'myntra-adapter': 'Myntra reader', 'ajio-adapter': 'Ajio reader', 'flipkart-adapter': 'Flipkart reader',
  'demo-mode': 'Demo data', 'demo-catalog': 'Demo catalog', manual: 'Entered by you',
}
const isHttp = (u) => /^https?:\/\//i.test(u ?? '')

export default function AnalysisSummary({ product, info }) {
  const allSizes = product.allSizes ?? []
  // An empty availability list means "unknown", not "everything is sold out".
  const known = product.availableSizes ?? []
  const unavailable = known.length ? allSizes.filter((s) => !known.includes(s)) : []
  return (
    <Card className="p-5 sm:p-7">
      <div className="grid gap-5 sm:grid-cols-[150px_1fr]">
        <div className="mx-auto aspect-[4/5] w-36 overflow-hidden rounded-xl border border-line bg-fog sm:w-full">
          {product.image ? (
            <ProductImage src={product.image} alt={product.name} />
          ) : (
            <div className="grid h-full place-items-center p-3 text-center text-xs text-muted">No image</div>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">{product.sourceSite}</Badge>
            {product.category && CATEGORY_BY_ID[product.category] && <Badge>{CATEGORY_BY_ID[product.category].singular}</Badge>}
          </div>
          {product.brand && <p className="mt-2 text-sm text-muted">{product.brand}</p>}
          <h2 className="mt-0.5 text-2xl font-bold leading-tight">{product.name}</h2>
          {product.price != null && <p className="mt-2 font-display text-xl font-bold">{product.currency && product.currency !== 'INR' ? `${product.currency} ${product.price}` : formatPrice(product.price)}</p>}

          <div className="mt-4">
            <p className="text-sm font-medium">Sizes found</p>
            {allSizes.length ? (
              <ul className="mt-1.5 flex flex-wrap gap-1.5" aria-label="Sizes found on the page">
                {allSizes.map((s) => (
                  <li key={s} className={`rounded-md border px-2.5 py-1 text-sm ${unavailable.includes(s) ? 'border-line bg-fog text-muted line-through' : 'border-line bg-white'}`}>
                    {s}{unavailable.includes(s) && <span className="sr-only"> (out of stock)</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-muted">None found on the page.</p>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span>Read using:</span>
            {info.extractionMethods.map((m) => <Badge key={m}>{METHOD_LABELS[m] ?? m}</Badge>)}
            {isHttp(product.productUrl) && (
              <a href={product.productUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-denim underline underline-offset-2">Open original page</a>
            )}
          </div>

          {info.warnings.length > 0 && (
            <ul className="mt-3 space-y-1.5" aria-label="Notes about this analysis">
              {info.warnings.map((w) => <li key={w} className="rounded-md bg-tape-soft px-3 py-2 text-sm">{w}</li>)}
            </ul>
          )}
        </div>
      </div>
    </Card>
  )
}

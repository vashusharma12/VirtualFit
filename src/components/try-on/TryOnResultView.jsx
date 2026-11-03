import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { deleteTryOnResult, saveTryOnResult } from '../../redux/slices/tryOnSlice'
import { CATEGORY_BY_ID } from '../../data/categories'
import { FIELD_BY_KEY } from '../../data/measurementFields'
import { formatMeasurement } from '../../utils/units'
import Card from '../common/Card'
import Button from '../common/Button'
import Badge from '../common/Badge'
import ConfirmAction from '../common/ConfirmAction'
import ConfidenceMeter from '../size-guide/ConfidenceMeter'
import SimulatedNotice from './SimulatedNotice'
import ProductImage from '../product/ProductImage'

const isDemoId = (id) => /^p-\d+$/.test(id)
const isHttp = (u) => /^https?:\/\//i.test(u ?? '')

export default function TryOnResultView({ job }) {
  const dispatch = useDispatch()
  const units = useSelector((s) => s.measurements.displayUnits)
  const { product, fit } = job
  const backTo = isDemoId(product.id) ? `/products/${product.id}` : '/size-guide'
  const tryAgain = `/try-on?product=${encodeURIComponent(product.id)}&size=${encodeURIComponent(job.size)}`

  return (
    <div className="space-y-6">
      {job.provider.simulated && <SimulatedNotice strong />}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Card className="p-3">
          <div className="overflow-hidden rounded-xl bg-fog">
            <ProductImage src={job.imageUrl} alt={`${job.provider.simulated ? 'Simulated preview' : 'Try-on preview'} of ${product.name} in size ${job.size}`} eager className="!object-contain" />
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="accent">Size {job.size}</Badge>
              <Badge>{CATEGORY_BY_ID[job.category]?.singular}</Badge>
              {job.saved && <Badge tone="success">Saved</Badge>}
            </div>
            <p className="mt-3 text-sm text-muted">{product.brand}</p>
            <h2 className="text-2xl font-bold">{product.name}</h2>
            {isHttp(product.productUrl) && (
              <a href={product.productUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-sm font-medium text-denim underline underline-offset-2">Open the store page</a>
            )}
          </Card>

          {fit && fit.status !== 'insufficient' && (
            <Card className="p-5">
              <h3 className="text-lg font-bold">Size advice at the time</h3>
              <div className="mt-3 grid gap-4 sm:grid-cols-2 sm:items-end">
                <div>
                  <p className="text-sm text-muted">Recommended size</p>
                  <p className="font-display text-5xl font-bold leading-none">{fit.recommendedSize}</p>
                </div>
                <ConfidenceMeter value={fit.confidence} label={fit.confidenceLabel} />
              </div>
              <p className="mt-4 text-sm">{fit.explanation}</p>
              {fit.selectedNote && <p className="mt-2 rounded-lg bg-tape-soft px-3 py-2 text-sm">{fit.selectedNote}</p>}
              {fit.reasons?.length > 0 && (
                <ul className="mt-3 space-y-1.5 text-sm text-muted">
                  {fit.reasons.map((r) => <li key={r.text}>• {r.text}</li>)}
                </ul>
              )}
              {Object.keys(fit.measurementsUsed ?? {}).length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium">Measurements used</p>
                  <dl className="mt-1.5 grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(fit.measurementsUsed).map(([k, v]) => {
                      const f = FIELD_BY_KEY[k]
                      return (
                        <div key={k} className="flex justify-between rounded-lg border border-line px-3 py-1.5">
                          <dt className="text-muted">{f?.label ?? k}</dt><dd className="font-medium">{formatMeasurement(v, 'length', units.length)}</dd>
                        </div>
                      )
                    })}
                  </dl>
                </div>
              )}
            </Card>
          )}
          {fit?.status === 'insufficient' && (
            <Card className="p-5 text-sm text-muted">No size advice was available for this try-on because measurements were missing.</Card>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start">
        <Button to={tryAgain} variant="accent">Try Another Size</Button>
        <Button to="/products" variant="secondary">Try Another Product</Button>
        <Button variant="secondary" aria-pressed={job.saved} onClick={() => dispatch(saveTryOnResult({ id: job.id, saved: !job.saved }))}>
          {job.saved ? 'Saved: remove from saved' : 'Save Result'}
        </Button>
        <Button to={backTo} variant="ghost">Back to Product</Button>
        <a href={job.imageUrl} download="virtualfit-preview.jpg" className="inline-flex h-11 items-center rounded-lg px-5 text-sm font-medium hover:bg-ink/5">Download image</a>
      </div>

      <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-sm text-muted">
          {job.saved ? 'Saved results stay until you delete them.' : 'Results you do not save are deleted automatically after 24 hours.'}{' '}
          <Link to="/results" className="font-medium text-denim underline underline-offset-2">All results</Link>
        </p>
        <ConfirmAction label="Delete this result" confirmLabel="Yes, delete" message="This permanently deletes this try-on image." onConfirm={() => dispatch(deleteTryOnResult(job.id))} />
      </div>
    </div>
  )
}

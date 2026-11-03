import { useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setChartOverride } from '../../redux/slices/productSlice'
import { productAnalysisService } from '../../services/productAnalysisService'
import { useAnalyzerCapabilities } from '../../hooks/useAnalyzerCapabilities'
import { flipGuessedUnit } from '../../utils/calculations'
import { validateImageFile } from '../../utils/image'
import Card from '../common/Card'
import Button from '../common/Button'
import Badge from '../common/Badge'
import Spinner from '../common/Spinner'
import SizeChartTable from '../product/SizeChartTable'
import ManualSizeChartForm from './ManualSizeChartForm'

const TITLES = {
  page: 'Size chart from the product page',
  demo: 'Demo size chart',
  generic: "Standard sizing (not this brand's chart)",
  manual: 'Size chart you entered',
  ai: 'Size chart read by AI and checked by you',
}
const BADGES = { generic: ['accent', 'Approximate'], manual: ['success', 'From you'], ai: ['success', 'Checked by you'] }

const READ_ERRORS = {
  chart_unreadable: 'We could not read a size chart from that picture. Try a closer, sharper screenshot of just the chart table.',
  chart_reader_unavailable: 'Reading screenshots is not turned on for this server.',
  rate_limited: 'You have read a lot of charts. Please try again in a little while.',
}

export default function SizeChartStatus({ resolved }) {
  const dispatch = useDispatch()
  const unit = useSelector((s) => s.measurements.displayUnits.length)
  const override = useSelector((s) => s.products.analysis.chartOverride)
  const fileInput = useRef(null)
  const [entering, setEntering] = useState(false)
  const [review, setReview] = useState(null) // { chart, from: 'screenshot' | 'page' }
  const [reading, setReading] = useState(false)
  const [readError, setReadError] = useState('')
  const [dismissedPageChart, setDismissedPageChart] = useState(false)

  const { category, chart, chartSource, genericChart, genericGender, info } = resolved
  const source = chartSource
  const caps = useAnalyzerCapabilities(!chart)
  const pageSuggestion = !dismissedPageChart && info.suggestedChart ? { chart: info.suggestedChart, from: 'page' } : null
  const active = review ?? pageSuggestion

  const chooseFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const problem = validateImageFile(file)
    if (problem) return setReadError(problem)
    setReadError('')
    setReading(true)
    try {
      const read = await productAnalysisService.readChartImage(file, category.category)
      setReview({ chart: read, from: 'screenshot' })
    } catch (err) {
      setReadError(READ_ERRORS[err.code] ?? err.message ?? 'We could not read that picture.')
    } finally {
      setReading(false)
    }
  }

  const confirmed = (c) => {
    dispatch(setChartOverride({ chart: c, source: c.source === 'ai' ? 'ai' : 'manual' }))
    setReview(null)
    setEntering(false)
    setDismissedPageChart(true)
  }

  if (chart) {
    const guessed = chart.unitGuessed
    return (
      <Card className="p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-bold">{TITLES[source] ?? 'Size chart'}</h2>
          <Badge tone={(BADGES[source] ?? ['success', 'Found'])[0]}>{(BADGES[source] ?? ['success', 'Found'])[1]}</Badge>
        </div>
        {source === 'generic' && (
          <p className="mt-2 text-sm text-muted">
            This page had no size chart we could read, so we are using standard {genericGender === 'women' ? "women's" : "men's"} sizing. Brands differ, so treat the result as a rough guide.
          </p>
        )}
        {guessed && (
          <p role="note" className="mt-3 rounded-lg bg-tape-soft px-3 py-2 text-sm">
            The page did not say whether this chart is in centimetres or inches. The numbers look like <strong>{guessed === 'in' ? 'inches' : 'centimetres'}</strong>, so that is how they were read.{' '}
            <button type="button" className="font-medium text-denim underline underline-offset-2" onClick={() => dispatch(setChartOverride({ chart: flipGuessedUnit(chart), source: chartSource }))}>
              Read them as {guessed === 'in' ? 'centimetres' : 'inches'} instead
            </button>
          </p>
        )}
        {chart.basis !== 'body' && source !== 'generic' && (
          <p className="mt-2 text-sm text-muted">
            {chart.basis === 'garment'
              ? 'This chart lists garment measurements, so the recommendation will allow for how much room the clothing has.'
              : 'We could not tell if this chart lists body or garment measurements. The recommendation will be marked less certain.'}
          </p>
        )}
        <div className="mt-4"><SizeChartTable chart={chart} unit={unit} /></div>
        <div className="mt-3 flex flex-wrap gap-2">
          {['generic', 'manual', 'ai'].includes(source) && <Button variant="ghost" size="sm" onClick={() => dispatch(setChartOverride(null))}>Choose a different chart</Button>}
          {override && !['generic', 'manual', 'ai'].includes(source) && <Button variant="ghost" size="sm" onClick={() => dispatch(setChartOverride(null))}>Use the original numbers</Button>}
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-5 sm:p-7">
      <h2 className="text-xl font-bold">{active ? 'Check this size chart' : 'We could not read a size chart from this page'}</h2>
      {!active && (
        <p className="mt-2 text-sm text-muted">
          Many stores only load their chart when you click "Size chart", or show it as a picture. You can still get a result:
        </p>
      )}

      {active && (
        <ManualSizeChartForm
          category={category.category}
          unit={unit}
          initial={active.chart}
          source="ai"
          notice={`${active.from === 'page' ? 'We read this chart from the page using AI.' : 'We read this chart from your screenshot using AI.'} AI can misread numbers, so compare every row with the store's chart before using it.${active.chart.notes ? ` ${active.chart.notes}` : ''}`}
          onCancel={() => { setReview(null); setDismissedPageChart(true) }}
          onSubmit={confirmed}
        />
      )}

      {!active && (
        <>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {caps.chartReader && (
              <Button variant="accent" onClick={() => fileInput.current?.click()} loading={reading}>
                {reading ? 'Reading your screenshot…' : 'Upload a screenshot of the size chart'}
              </Button>
            )}
            {genericChart && (
              <Button variant={caps.chartReader ? 'secondary' : 'accent'} onClick={() => dispatch(setChartOverride({ chart: genericChart, source: 'generic' }))}>
                Use standard {genericGender === 'women' ? "women's" : "men's"} sizing
              </Button>
            )}
            <Button variant="secondary" onClick={() => setEntering(true)} aria-expanded={entering}>Enter the size chart myself</Button>
          </div>
          <input ref={fileInput} type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} aria-label="Screenshot of the size chart" onChange={chooseFile} />
          {reading && <p role="status" className="mt-3 flex items-center gap-2 text-sm text-muted"><Spinner size={16} /> Reading the chart. This can take up to half a minute.</p>}
          {readError && <p role="alert" className="mt-3 text-sm font-medium text-danger">{readError}</p>}
          {caps.chartReader ? (
            <p className="mt-2 text-xs text-muted">A screenshot works for any store: open the store's size chart, take a screenshot of the table, and upload it. Check the numbers after.</p>
          ) : !caps.loading && (
            <p className="mt-2 text-xs text-muted">Reading screenshots is not turned on for this server (it needs an AI key, see the README).</p>
          )}
          <p className="mt-1 text-xs text-muted">Standard sizing is approximate, because brands size differently. The store's own chart is more accurate.</p>
        </>
      )}

      {entering && !active && (
        <ManualSizeChartForm category={category.category} unit={unit} onCancel={() => setEntering(false)} onSubmit={confirmed} />
      )}
    </Card>
  )
}

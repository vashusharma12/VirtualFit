import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useSearchParams } from 'react-router-dom'
import { deleteAllTryOnResults, fetchTryOnHistory, fetchTryOnJob } from '../../redux/slices/tryOnSlice'
import TryOnResultView from '../../components/try-on/TryOnResultView'
import ResultThumb from '../../components/try-on/ResultThumb'
import RecommendationHistory from '../../components/dashboard/RecommendationHistory'
import Skeleton from '../../components/common/Skeleton'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import Button from '../../components/common/Button'
import ConfirmAction from '../../components/common/ConfirmAction'

function SingleResult({ id }) {
  const dispatch = useDispatch()
  const { viewing } = useSelector((s) => s.tryOn)
  useEffect(() => { dispatch(fetchTryOnJob(id)) }, [dispatch, id])
  const job = viewing.job?.id === id ? viewing.job : null

  if (viewing.status === 'notFound') {
    return <EmptyState title="Result not found" description={viewing.error ?? 'It may have been deleted, or unsaved results expire after 24 hours.'} action={<Button to="/results" variant="accent">See all results</Button>} />
  }
  if (viewing.status === 'failed') return <ErrorState title="Could not load this result" message={viewing.error} onRetry={() => dispatch(fetchTryOnJob(id))} />
  if (!job) return <div aria-busy="true" aria-label="Loading result" className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-[28rem]" /><Skeleton className="h-[28rem]" /></div>
  if (job.status !== 'succeeded') {
    return <EmptyState title="This preview is not ready" description={job.status === 'failed' ? job.error?.message : 'It did not finish.'} action={<Button to="/try-on" variant="accent">Start a new try-on</Button>} />
  }
  return <TryOnResultView job={job} />
}

function AllResults() {
  const dispatch = useDispatch()
  const { history } = useSelector((s) => s.tryOn)
  const sizeHistory = useSelector((s) => s.sizeGuide.history)
  useEffect(() => { dispatch(fetchTryOnHistory()) }, [dispatch])

  return (
    <div className="space-y-12">
      <section aria-labelledby="tryon-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="tryon-heading" className="text-2xl font-bold">Try-on previews</h2>
            <p className="mt-1 text-sm text-muted">Results you do not save are deleted automatically after 24 hours.</p>
          </div>
          {history.items.length > 0 && (
            <ConfirmAction label="Delete all previews" confirmLabel="Yes, delete all" message="This permanently deletes every try-on image, including saved ones." onConfirm={() => dispatch(deleteAllTryOnResults())} />
          )}
        </div>
        <div className="mt-5">
          {(history.status === 'idle' || history.status === 'loading') && (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4" aria-busy="true" aria-label="Loading previews">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="aspect-[24/25]" />)}</div>
          )}
          {history.status === 'failed' && <ErrorState title="Could not load your previews" message={history.error} onRetry={() => dispatch(fetchTryOnHistory())} />}
          {history.status === 'succeeded' && history.items.length === 0 && (
            <EmptyState title="No previews yet" description="Pick a product and a size to see a try-on preview here." action={<Button to="/products" variant="accent">Try a product</Button>} />
          )}
          {history.status === 'succeeded' && history.items.length > 0 && (
            <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">{history.items.map((j) => <li key={j.id}><ResultThumb job={j} /></li>)}</ul>
          )}
        </div>
      </section>

      <section aria-labelledby="sizes-heading">
        <h2 id="sizes-heading" className="text-2xl font-bold">Saved size recommendations</h2>
        <div className="mt-5">
          {sizeHistory.length === 0
            ? <EmptyState title="Nothing saved yet" description='Use "Save this result" on a size recommendation to keep it here.' action={<Button to="/size-guide" variant="accent">Find my size</Button>} />
            : <RecommendationHistory manage />}
        </div>
      </section>
    </div>
  )
}

export default function Results() {
  const [params] = useSearchParams()
  const jobId = params.get('job')
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-bold sm:text-4xl">{jobId ? 'Your try-on result' : 'Your results'}</h1>
      <div className="mt-8">{jobId ? <SingleResult id={jobId} /> : <AllResults />}</div>
    </div>
  )
}

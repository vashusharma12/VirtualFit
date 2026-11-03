import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchPhotos } from '../../redux/slices/photosSlice'
import OnboardingProgress from '../../components/layout/OnboardingProgress'
import ErrorState from '../../components/common/ErrorState'
import Skeleton from '../../components/common/Skeleton'
import ProgressBar from '../../components/common/ProgressBar'
import Button from '../../components/common/Button'
import PhotoConsent from '../../components/photos/PhotoConsent'
import PhotoGrid from '../../components/photos/PhotoGrid'
import CaptureTips from '../../components/photos/CaptureTips'
import PhotoPrivacyActions from '../../components/photos/PhotoPrivacyActions'
import BodyShapeSection from '../../components/body-shape/BodyShapeSection'

export default function BodyProfile() {
  const dispatch = useDispatch()
  const { status, error, consent, items } = useSelector((s) => s.photos)
  const count = Object.values(items).filter(Boolean).length

  useEffect(() => {
    dispatch(fetchPhotos())
  }, [dispatch])

  const loading = status === 'idle' || status === 'loading'

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <OnboardingProgress current={2} />
      <h1 className="mt-8 text-3xl font-bold sm:text-4xl">Body profile</h1>

      <section aria-labelledby="photos-heading" className="mt-8">
        <h2 id="photos-heading" className="text-2xl font-bold">Photos <span className="text-base font-normal text-muted">(optional)</span></h2>
        <p className="mt-1 max-w-2xl text-muted">Photos let VirtualFit show products on you. You can skip this and add them later.</p>

        <div className="mt-5">
          {loading && (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-busy="true" aria-label="Loading your photos">
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="aspect-[3/4]" />)}
            </div>
          )}
          {status === 'failed' && <ErrorState title="Could not load your photos" message={error} onRetry={() => dispatch(fetchPhotos())} />}
          {status === 'succeeded' && !consent.granted && <PhotoConsent />}
          {status === 'succeeded' && consent.granted && (
            <div className="space-y-6">
              <ProgressBar label={`${count} of 4 photos added`} value={count * 25} />
              <CaptureTips />
              <PhotoGrid />
              <PhotoPrivacyActions hasPhotos={count > 0} />
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="shape-heading" className="mt-12">
        <h2 id="shape-heading" className="text-2xl font-bold">Body shape</h2>
        <p className="mt-1 max-w-2xl text-muted">A quick estimate from your measurements, to help explain how clothes tend to fit you.</p>
        <div className="mt-5"><BodyShapeSection /></div>
      </section>

      <div className="mt-10 flex justify-end">
        <Button to="/dashboard" variant="accent" size="lg">Continue</Button>
      </div>
    </div>
  )
}

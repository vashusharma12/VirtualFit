import { useDispatch, useSelector } from 'react-redux'
import { deleteAllPhotos, setPhotoConsent } from '../../redux/slices/photosSlice'
import ConfirmAction from '../common/ConfirmAction'

export default function PhotoPrivacyActions({ hasPhotos }) {
  const dispatch = useDispatch()
  const { bulkStatus, bulkError, consentStatus } = useSelector((s) => s.photos)

  return (
    <section aria-labelledby="privacy-heading" className="rounded-2xl border border-line bg-white p-5">
      <h2 id="privacy-heading" className="text-lg font-bold">Your photos, your control</h2>
      <p className="mt-1 text-sm text-muted">Photos are private to you. You can remove them whenever you like.</p>
      {bulkError && <p role="alert" className="mt-2 text-sm font-medium text-danger">{bulkError}</p>}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start">
        {hasPhotos && (
          <ConfirmAction
            label="Delete all my photos"
            confirmLabel="Yes, delete all"
            message="This permanently deletes every photo you have added. This cannot be undone."
            loading={bulkStatus === 'deleting'}
            onConfirm={() => dispatch(deleteAllPhotos())}
          />
        )}
        <ConfirmAction
          label="Withdraw consent"
          confirmLabel="Withdraw and delete"
          message="This deletes all your photos and stops VirtualFit storing new ones until you agree again."
          loading={consentStatus === 'saving'}
          onConfirm={() => dispatch(setPhotoConsent(false))}
        />
      </div>
    </section>
  )
}

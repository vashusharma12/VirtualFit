import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { deleteAllTryOnResults } from '../../redux/slices/tryOnSlice'
import { authService } from '../../services/authService'
import SettingsSection from './SettingsSection'
import PhotoPrivacyActions from '../photos/PhotoPrivacyActions'
import ConfirmAction from '../common/ConfirmAction'
import Button from '../common/Button'
import Badge from '../common/Badge'
import Skeleton from '../common/Skeleton'

function download(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function PrivacySettings() {
  const dispatch = useDispatch()
  const photos = useSelector((s) => s.photos)
  const snapshot = useSelector((s) => ({ profile: s.profile, measurements: s.measurements, sizeHistory: s.sizeGuide.history }))
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const count = Object.values(photos.items).filter(Boolean).length

  const exportData = async () => {
    setExporting(true)
    setExportError('')
    try {
      download(await authService.exportData(snapshot), 'virtualfit-my-data.json')
    } catch (err) {
      setExportError(err.message || 'Could not export your data.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <SettingsSection title="Privacy and data" description="Your photos and measurements are private to you. You are in control of them.">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-bold">Photos</h3>
          {photos.status === 'succeeded' && <Badge tone={photos.consent.granted ? 'success' : 'neutral'}>{photos.consent.granted ? `Consent given, ${count} stored` : 'No consent, nothing stored'}</Badge>}
        </div>
        <div className="mt-3">
          {(photos.status === 'idle' || photos.status === 'loading') && <Skeleton className="h-24" />}
          {photos.status === 'failed' && <p className="text-sm text-danger">Could not load your photo settings.</p>}
          {photos.status === 'succeeded' && photos.consent.granted && <PhotoPrivacyActions hasPhotos={count > 0} />}
          {photos.status === 'succeeded' && !photos.consent.granted && <p className="text-sm text-muted">VirtualFit is not storing any photos of you.</p>}
        </div>
      </div>

      <div>
        <h3 className="font-bold">Try-on results</h3>
        <p className="mt-1 text-sm text-muted">Results you do not save are deleted after 24 hours.</p>
        <div className="mt-3">
          <ConfirmAction label="Delete all try-on results" confirmLabel="Yes, delete all" message="This permanently deletes every try-on image, including saved ones." onConfirm={() => dispatch(deleteAllTryOnResults())} />
        </div>
      </div>

      <div>
        <h3 className="font-bold">Download my data</h3>
        <p className="mt-1 text-sm text-muted">A file with your account details, measurements, preferences and saved sizes. Photos are not included.</p>
        {exportError && <p role="alert" className="mt-2 text-sm font-medium text-danger">{exportError}</p>}
        <Button variant="secondary" className="mt-3" loading={exporting} onClick={exportData}>Download my data</Button>
      </div>
    </SettingsSection>
  )
}

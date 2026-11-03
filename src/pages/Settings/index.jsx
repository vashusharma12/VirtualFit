import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { fetchPhotos } from '../../redux/slices/photosSlice'
import PreferencesSettings from '../../components/settings/PreferencesSettings'
import PrivacySettings from '../../components/settings/PrivacySettings'
import DangerZone from '../../components/settings/DangerZone'

export default function Settings() {
  const dispatch = useDispatch()
  useEffect(() => { dispatch(fetchPhotos()) }, [dispatch])
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-bold sm:text-4xl">Settings</h1>
      <p className="mt-2 text-muted">Your preferences, privacy and account.</p>
      <div className="mt-8 space-y-6">
        <PreferencesSettings />
        <PrivacySettings />
        <DangerZone />
      </div>
    </div>
  )
}

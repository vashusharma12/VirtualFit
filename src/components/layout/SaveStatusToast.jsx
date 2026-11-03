import { useDispatch, useSelector } from 'react-redux'
import { saveUserData } from '../../redux/thunks/userData'
import Button from '../common/Button'

// Silent when saving works; only speaks up when a save fails.
export default function SaveStatusToast() {
  const dispatch = useDispatch()
  const { saveStatus, saveError } = useSelector((s) => s.userData)
  if (saveStatus !== 'error') return null
  return (
    <div role="alert" className="fixed bottom-4 right-4 z-50 flex max-w-sm items-center gap-3 rounded-xl border border-danger/30 bg-white p-4 shadow-lg">
      <p className="text-sm">Your latest changes could not be saved. {saveError}</p>
      <Button size="sm" variant="secondary" onClick={() => dispatch(saveUserData())}>Retry</Button>
    </div>
  )
}

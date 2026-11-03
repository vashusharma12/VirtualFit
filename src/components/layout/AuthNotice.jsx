import { useDispatch, useSelector } from 'react-redux'
import { clearAuthNotice } from '../../redux/slices/authSlice'

// A one-off message after signing in. It stays until it is dismissed, because it explains a change.
export default function AuthNotice() {
  const dispatch = useDispatch()
  const notice = useSelector((s) => s.auth.notice)
  if (!notice) return null
  return (
    <div role="status" className="border-b border-line bg-tape-soft">
      <div className="mx-auto flex max-w-6xl items-start justify-between gap-4 px-4 py-3 text-sm sm:px-6">
        <p>{notice}</p>
        <button type="button" onClick={() => dispatch(clearAuthNotice())} className="shrink-0 font-medium underline underline-offset-2">Dismiss</button>
      </div>
    </div>
  )
}

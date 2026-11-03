import { useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { logoutUser, sessionExpired } from '../../redux/slices/authSlice'
import { authService } from '../../services/authService'
import SettingsSection from './SettingsSection'
import FormField from '../common/FormField'
import Button from '../common/Button'
import ConsentCheckbox from '../common/ConsentCheckbox'
import GoogleSignInButton from '../auth/GoogleSignInButton'
import { useGoogleConfig } from '../../hooks/useGoogleConfig'

export default function DangerZone() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector((s) => s.auth.user)
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [understood, setUnderstood] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const googleOnly = user.hasPassword === false // signed up with Google: there is no password to confirm with
  const { clientId } = useGoogleConfig()
  const understoodRef = useRef(false)
  understoodRef.current = understood

  const remove = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await authService.deleteAccount(user.id, password)
      dispatch(sessionExpired()) // clears the user and wipes everything held in memory
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message || 'Could not delete your account.')
      setBusy(false)
    }
  }

  // Google-only accounts confirm with a fresh Google sign-in instead of a password.
  const removeWithGoogle = async (credential) => {
    if (!understoodRef.current) return setError('Tick the box first, then confirm with Google.')
    setBusy(true)
    setError('')
    try {
      await authService.deleteAccount(user.id, { credential })
      dispatch(sessionExpired())
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message || 'Could not delete your account.')
      setBusy(false)
    }
  }

  return (
    <SettingsSection title="Session and account" danger>
      <div>
        <h3 className="font-bold">Log out</h3>
        {user.google && <p className="mt-1 text-sm text-muted">You sign in with Google ({user.email}).</p>}
        <Button variant="secondary" className="mt-3" onClick={() => dispatch(logoutUser()).then(() => navigate('/'))}>Log out</Button>
      </div>

      <div>
        <h3 className="font-bold">Delete my account</h3>
        <p className="mt-1 text-sm text-muted">This permanently deletes your account, measurements, photos, try-on images and saved sizes. It cannot be undone.</p>
        {!open ? (
          <Button variant="secondary" className="mt-3" onClick={() => setOpen(true)} aria-expanded="false">Delete my account…</Button>
        ) : googleOnly ? (
          <div className="mt-4 max-w-md space-y-4 rounded-xl border border-danger/30 bg-danger/5 p-4">
            <ConsentCheckbox checked={understood} onChange={setUnderstood}>I understand that everything will be permanently deleted.</ConsentCheckbox>
            <p className="text-sm">Then confirm it is you with Google:</p>
            {clientId ? <GoogleSignInButton clientId={clientId} text="continue_with" onCredential={removeWithGoogle} /> : <p className="text-sm text-danger">Google sign-in is not available right now, so this account cannot be confirmed.</p>}
            {busy && <p role="status" className="text-sm text-muted">Deleting…</p>}
            {error && <p role="alert" className="text-sm font-medium text-danger">{error}</p>}
            <Button variant="ghost" onClick={() => { setOpen(false); setError(''); setUnderstood(false) }} disabled={busy}>Cancel</Button>
          </div>
        ) : (
          <form onSubmit={remove} noValidate className="mt-4 max-w-md space-y-4 rounded-xl border border-danger/30 bg-danger/5 p-4">
            <FormField label="Confirm with your password" name="deletePassword" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <ConsentCheckbox checked={understood} onChange={setUnderstood}>I understand that everything will be permanently deleted.</ConsentCheckbox>
            {error && <p role="alert" className="text-sm font-medium text-danger">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" variant="danger" loading={busy} disabled={!password || !understood}>Permanently delete</Button>
              <Button variant="ghost" onClick={() => { setOpen(false); setError(''); setPassword(''); setUnderstood(false) }} disabled={busy}>Cancel</Button>
            </div>
          </form>
        )}
      </div>
    </SettingsSection>
  )
}

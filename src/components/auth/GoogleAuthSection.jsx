import { useDispatch } from 'react-redux'
import { loginWithGoogle } from '../../redux/slices/authSlice'
import { useGoogleConfig } from '../../hooks/useGoogleConfig'
import GoogleSignInButton from './GoogleSignInButton'

// "or continue with Google", shown only when the server has Google sign-in turned on.
export default function GoogleAuthSection({ text = 'continue_with' }) {
  const dispatch = useDispatch()
  const { clientId } = useGoogleConfig()
  if (!clientId) return null
  return (
    <div className="mt-6">
      <div className="relative text-center" aria-hidden="true">
        <span className="absolute inset-x-0 top-1/2 h-px bg-line" />
        <span className="relative bg-white px-3 text-xs text-muted">or</span>
      </div>
      <div className="mt-4">
        <GoogleSignInButton clientId={clientId} text={text} onCredential={(credential) => dispatch(loginWithGoogle(credential))} />
      </div>
    </div>
  )
}

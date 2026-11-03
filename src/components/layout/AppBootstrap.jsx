import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { restoreSession, sessionExpired } from '../../redux/slices/authSlice'
import { loadUserData } from '../../redux/thunks/userData'
import FullPageLoader from '../common/FullPageLoader'
import ErrorState from '../common/ErrorState'

// Restores the session and loads the user's saved data before any page renders, so pages never
// flash empty or redirect while we are still finding out who the user is.
export default function AppBootstrap({ children }) {
  const dispatch = useDispatch()
  const { bootstrapped, user } = useSelector((s) => s.auth)
  const { loadStatus, loadedUserId, loadError } = useSelector((s) => s.userData)

  useEffect(() => {
    dispatch(restoreSession())
  }, [dispatch])

  useEffect(() => {
    const onUnauthorized = () => dispatch(sessionExpired())
    window.addEventListener('virtualfit:unauthorized', onUnauthorized)
    return () => window.removeEventListener('virtualfit:unauthorized', onUnauthorized)
  }, [dispatch])

  useEffect(() => {
    if (user && loadedUserId !== user.id && loadStatus !== 'loading' && loadStatus !== 'failed') {
      dispatch(loadUserData())
    }
  }, [user, loadedUserId, loadStatus, dispatch])

  if (!bootstrapped) return <FullPageLoader label="Loading VirtualFit…" />
  if (user && loadStatus === 'failed') {
    return (
      <div className="grid min-h-screen place-items-center bg-fog px-4">
        <ErrorState title="Could not load your profile" message={loadError} onRetry={() => dispatch(loadUserData())} />
      </div>
    )
  }
  if (user && loadedUserId !== user.id) return <FullPageLoader label="Loading your profile…" />
  return children
}

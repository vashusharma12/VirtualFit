import { useEffect, useState } from 'react'
import { authService } from '../services/authService'

let cached = null // asked once per page load

// The Google client id from the server, or null when Google sign-in is not turned on.
export function useGoogleConfig() {
  const [state, setState] = useState({ loading: true, clientId: null })
  useEffect(() => {
    let cancelled = false
    cached ??= authService.googleConfig().catch(() => null)
    cached.then((clientId) => !cancelled && setState({ loading: false, clientId }))
    return () => { cancelled = true }
  }, [])
  return state
}

export function resetGoogleConfigCache() {
  cached = null
}

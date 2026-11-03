import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { updateProfile } from '../redux/slices/profileSlice'
import { estimateBodyShape } from '../services/bodyShapeService'

// Re-estimates whenever chest, waist or hips change, and keeps profile.bodyShape in sync.
export function useBodyShape() {
  const dispatch = useDispatch()
  const { chest, waist, hips } = useSelector((s) => s.measurements)
  const saved = useSelector((s) => s.profile.bodyShape)
  const [state, setState] = useState({ status: 'loading', result: null })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading', result: null })
    estimateBodyShape({ chest, waist, hips })
      .then((result) => {
        if (cancelled) return
        setState({ status: result.status, result })
      })
      .catch(() => !cancelled && setState({ status: 'error', result: null }))
    return () => { cancelled = true }
  }, [chest, waist, hips, attempt])

  const shape = state.result?.status === 'ok' ? state.result.shape : null
  useEffect(() => {
    if (state.status === 'ok' && saved !== shape) dispatch(updateProfile({ bodyShape: shape }))
    if (state.status === 'insufficient' && saved !== null) dispatch(updateProfile({ bodyShape: null }))
  }, [state.status, shape, saved, dispatch])

  return { ...state, retry: () => setAttempt((n) => n + 1) }
}

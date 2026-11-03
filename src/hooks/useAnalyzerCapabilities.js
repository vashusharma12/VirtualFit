import { useEffect, useState } from 'react'
import { productAnalysisService } from '../services/productAnalysisService'

let cached = null // asked once per page load

// Whether the server can read a size chart from a screenshot. `loading` until known.
export function useAnalyzerCapabilities(enabled = true) {
  const [state, setState] = useState({ loading: true, chartReader: false })
  useEffect(() => {
    if (!enabled) return undefined
    let cancelled = false
    cached ??= productAnalysisService.getCapabilities().catch(() => ({ chartReader: false }))
    cached.then((c) => !cancelled && setState({ loading: false, chartReader: c.chartReader }))
    return () => { cancelled = true }
  }, [enabled])
  return state
}

export function resetCapabilitiesCache() {
  cached = null
}

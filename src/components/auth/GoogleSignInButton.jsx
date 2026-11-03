import { useEffect, useRef, useState } from 'react'

const SRC = 'https://accounts.google.com/gsi/client'
let loading = null

function loadGoogle() {
  loading ??= new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve(window.google)
    const script = document.createElement('script')
    script.src = SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve(window.google)
    script.onerror = () => { loading = null; reject(new Error('Google sign-in could not load')) }
    document.head.appendChild(script)
  })
  return loading
}

// Google's own "Sign in with Google" button. It hands back a signed credential, which our server verifies.
export default function GoogleSignInButton({ clientId, text = 'continue_with', onCredential }) {
  const box = useRef(null)
  const handler = useRef(onCredential)
  const [failed, setFailed] = useState(false)
  handler.current = onCredential

  useEffect(() => {
    let cancelled = false
    loadGoogle()
      .then((google) => {
        if (cancelled || !box.current) return
        google.accounts.id.initialize({ client_id: clientId, callback: (r) => r?.credential && handler.current(r.credential) })
        google.accounts.id.renderButton(box.current, { type: 'standard', theme: 'outline', size: 'large', text, shape: 'rectangular', width: Math.min(360, box.current.offsetWidth || 320) })
      })
      .catch(() => !cancelled && setFailed(true))
    return () => { cancelled = true }
  }, [clientId, text])

  if (failed) {
    return <p className="text-center text-xs text-muted">Google sign-in could not load. Check your connection or any ad blocker, or use your email and password.</p>
  }
  return <div ref={box} role="group" aria-label="Sign in with Google" className="flex min-h-[44px] justify-center" />
}

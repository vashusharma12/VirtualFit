import { useState } from 'react'
import Button from './Button'

// A destructive button that asks "are you sure?" inline before running.
export default function ConfirmAction({ label, confirmLabel, message, onConfirm, loading = false }) {
  const [asking, setAsking] = useState(false)

  if (!asking) {
    return <Button variant="secondary" size="sm" onClick={() => setAsking(true)}>{label}</Button>
  }
  return (
    <div role="group" aria-label={label} className="rounded-xl border border-danger/30 bg-danger/5 p-4">
      <p className="text-sm">{message}</p>
      <div className="mt-3 flex gap-2">
        <Button variant="danger" size="sm" loading={loading} onClick={async () => { await onConfirm(); setAsking(false) }}>
          {confirmLabel}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setAsking(false)} disabled={loading}>Cancel</Button>
      </div>
    </div>
  )
}

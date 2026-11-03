import { useRef, useState } from 'react'
import { ACCEPT_ATTR, validateImageFile } from '../../utils/image'
import Spinner from '../common/Spinner'
import Button from '../common/Button'
import PoseSilhouette from './PoseSilhouette'

export default function PhotoSlot({ angle, item, slot, onUpload, onRemove }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [localError, setLocalError] = useState('')

  const busy = slot.status !== 'idle'
  const error = localError || slot.error
  const openPicker = () => inputRef.current?.click()

  const handleFile = (file) => {
    if (!file) return
    const problem = validateImageFile(file)
    setLocalError(problem)
    if (!problem) onUpload(file)
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    if (!busy) handleFile(e.dataTransfer.files?.[0])
  }

  return (
    <section className="flex flex-col rounded-2xl border border-line bg-white p-3 sm:p-4" aria-label={`${angle.label} photo`}>
      <h3 className="text-base font-bold">{angle.label}</h3>

      <div
        className="relative mt-2 aspect-[3/4] overflow-hidden rounded-xl bg-fog"
        onDragOver={(e) => { e.preventDefault(); if (!busy) setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        {item ? (
          <img src={item.url} alt={`Your ${angle.label.toLowerCase()} photo`} className="h-full w-full object-cover" />
        ) : (
          <button
            type="button"
            onClick={openPicker}
            disabled={busy}
            aria-label={`Add ${angle.label.toLowerCase()} photo`}
            className={`flex h-full w-full flex-col items-center justify-center gap-2 border-2 border-dashed p-3 text-center transition-colors ${
              dragging ? 'border-denim bg-denim/5' : 'border-line hover:border-ink/40'
            }`}
          >
            <span className="h-24 w-14"><PoseSilhouette angle={angle.id} /></span>
            <span className="text-sm font-medium">Add photo</span>
            <span className="text-xs text-muted">Click, or drop a file here</span>
          </button>
        )}

        {busy && (
          <div role="status" className="absolute inset-0 grid place-items-center bg-white/80">
            <div className="flex flex-col items-center gap-2 text-sm">
              <Spinner size={24} label={slot.status === 'uploading' ? 'Uploading' : 'Removing'} />
              {slot.status === 'uploading' ? 'Uploading…' : 'Removing…'}
            </div>
          </div>
        )}
      </div>

      <p className="mt-2 text-xs text-muted">{angle.instruction}</p>

      {error && <p role="alert" className="mt-2 text-xs font-medium text-danger">{error}</p>}
      {!error && slot.warnings.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs text-ink" aria-label="Photo quality notes">
          {slot.warnings.map((w) => (
            <li key={w.code} className="rounded-md bg-tape-soft px-2 py-1.5">{w.message}</li>
          ))}
        </ul>
      )}

      {item && (
        <div className="mt-3 flex gap-2">
          <Button variant="secondary" size="sm" onClick={openPicker} disabled={busy}>Replace</Button>
          <Button variant="ghost" size="sm" onClick={onRemove} disabled={busy}>Remove</Button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = '' }}
      />
    </section>
  )
}

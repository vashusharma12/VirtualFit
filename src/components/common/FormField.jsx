import { useId, useState } from 'react'

export default function FormField({ label, name, type = 'text', error, hint, suffix, ...rest }) {
  const id = useId()
  const [shown, setShown] = useState(false)
  const isPassword = type === 'password'
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(' ') || undefined

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={isPassword && shown ? 'text' : type}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className={`h-11 w-full rounded-lg border bg-white px-3 text-base outline-none transition-colors placeholder:text-muted/70 focus:border-denim sm:text-sm ${
            error ? 'border-danger' : 'border-line'
          } ${isPassword ? 'pr-16' : ''} ${suffix ? 'pr-12' : ''}`}
          {...rest}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted" aria-hidden="true">
            {suffix}
          </span>
        )}
        {isPassword && (
          <button
            type="button"
            onClick={() => setShown((s) => !s)}
            aria-pressed={shown}
            className="absolute inset-y-0 right-2 my-auto h-8 rounded-md px-2 text-xs font-medium text-muted hover:text-ink"
          >
            {shown ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

const TONE = { High: 'bg-ok', Medium: 'bg-tape', Low: 'bg-danger' }

export default function ConfidenceMeter({ value, label, details }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-sm text-muted">Confidence</p>
        <p className="font-display text-3xl font-bold">{value}%</p>
      </div>
      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-ink/10" role="meter" aria-label="Fit confidence" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} aria-valuetext={`${value} percent, ${label}`}>
        <div className={`h-full rounded-full transition-all ${TONE[label]}`} style={{ width: `${value}%` }} />
      </div>
      <p className="mt-1.5 text-sm font-medium">{label} confidence</p>
      {details && (
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer text-muted hover:text-ink">What affects this?</summary>
          <dl className="mt-2 space-y-1 rounded-lg bg-fog p-3">
            {details.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3"><dt className="text-muted">{k}</dt><dd className="font-medium">{v}</dd></div>
            ))}
          </dl>
        </details>
      )}
    </div>
  )
}

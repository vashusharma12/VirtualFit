export default function ProgressBar({ value, label }) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted">{value}%</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-ink/10"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
      >
        <div className="h-full rounded-full bg-tape transition-all" style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

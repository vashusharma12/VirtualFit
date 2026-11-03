import { fromCanonical } from '../../utils/units'

// Shows where your measurement sits among every size's range.
export default function SizeRuler({ meta, label, unit, chosen }) {
  const { sizeRanges, primaryValue } = meta
  if (!sizeRanges?.length || !primaryValue) return null
  const lo = Math.min(...sizeRanges.map((r) => r.low), primaryValue) - 2
  const hi = Math.max(...sizeRanges.map((r) => r.high), primaryValue) + 2
  const pct = (v) => ((v - lo) / (hi - lo)) * 100
  const show = (v) => fromCanonical(v, 'length', unit)
  const current = sizeRanges.find((r) => r.size === chosen)

  return (
    <figure>
      <div
        role="img"
        aria-label={`Your ${label} is ${show(primaryValue)} ${unit}. Size ${chosen} covers ${show(current.low)} to ${show(current.high)} ${unit}.`}
        className="relative h-16"
      >
        <div className="absolute inset-x-0 top-5 h-9 overflow-hidden rounded-md bg-ink/5">
          {sizeRanges.map((r) => (
            <div
              key={r.size}
              className={`absolute top-0 flex h-full items-center justify-center border-l-2 border-white text-xs font-semibold sm:text-sm ${r.size === chosen ? 'bg-ink text-tape' : 'bg-tape text-ink'}`}
              style={{ left: `${Math.max(0, pct(r.low))}%`, width: `${Math.min(100, pct(r.high)) - Math.max(0, pct(r.low))}%` }}
            >
              {r.size}
            </div>
          ))}
        </div>
        <div className="absolute top-0 flex -translate-x-1/2 flex-col items-center" style={{ left: `${pct(primaryValue)}%` }} aria-hidden="true">
          <span className="rounded bg-denim px-1.5 py-0.5 text-[11px] font-semibold text-white">You: {show(primaryValue)}</span>
          <span className="h-3 w-0.5 bg-denim" />
        </div>
      </div>
      <figcaption className="mt-1 text-xs text-muted">Your {label} compared with each size ({unit}).</figcaption>
    </figure>
  )
}

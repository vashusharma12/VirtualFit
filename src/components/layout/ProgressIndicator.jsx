import { Link } from 'react-router-dom'

// steps: [{ label, to? , onSelect? }], current: index. Completed steps are links/buttons so users can go back and edit.
export default function ProgressIndicator({ steps, current }) {
  return (
    <nav aria-label="Progress">
      <ol className="flex items-center gap-2">
        {steps.map((step, i) => {
          const done = i < current
          const active = i === current
          const dot = (
            <span
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                done ? 'bg-ok text-white' : active ? 'bg-ink text-white' : 'bg-ink/10 text-muted'
              }`}
            >
              {done ? '✓' : i + 1}
            </span>
          )
          return (
            <li key={step.label} className="flex flex-1 items-center gap-2 last:flex-none">
              {done && step.to ? (
                <Link to={step.to} className="flex items-center gap-2" aria-label={`Edit ${step.label}`}>
                  {dot}
                  <span className="hidden text-sm font-medium sm:inline">{step.label}</span>
                </Link>
              ) : done && step.onSelect ? (
                <button type="button" onClick={step.onSelect} className="flex items-center gap-2" aria-label={`Go back to ${step.label}`}>
                  {dot}
                  <span className="hidden text-sm font-medium sm:inline">{step.label}</span>
                </button>
              ) : (
                <span className="flex items-center gap-2" aria-current={active ? 'step' : undefined}>
                  {dot}
                  <span className={`hidden text-sm sm:inline ${active ? 'font-semibold' : 'text-muted'}`}>
                    {step.label}
                  </span>
                </span>
              )}
              {i < steps.length - 1 && <span aria-hidden="true" className={`h-px flex-1 ${done ? 'bg-ok' : 'bg-line'}`} />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

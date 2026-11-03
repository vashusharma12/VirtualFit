import { useId, useState } from 'react'

// A live demo of the core idea, using a SAMPLE chart (not a real product).
const SAMPLE_CHART = [
  { size: 'S', min: 88, max: 94 },
  { size: 'M', min: 94, max: 102 },
  { size: 'L', min: 102, max: 110 },
  { size: 'XL', min: 110, max: 118 },
]
const SCALE_MIN = 84
const SCALE_MAX = 122
const pct = (v) => ((v - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100

function describe(chest) {
  const idx = SAMPLE_CHART.findIndex((s) => chest >= s.min && chest < s.max)
  if (chest < SAMPLE_CHART[0].min) return { title: 'Below S', note: 'Smaller than this chart covers.' }
  if (chest >= SAMPLE_CHART[SAMPLE_CHART.length - 1].max) return { title: 'Above XL', note: 'Larger than this chart covers.' }
  const { size, min, max } = SAMPLE_CHART[idx]
  if (chest - min < 2 && idx > 0) return { title: `Size ${size}`, note: `Close to the edge: ${SAMPLE_CHART[idx - 1].size} would fit tighter.` }
  if (max - chest <= 2 && idx < SAMPLE_CHART.length - 1) return { title: `Size ${size}`, note: `Close to the edge: ${SAMPLE_CHART[idx + 1].size} would fit looser.` }
  return { title: `Size ${size}`, note: 'Your chest sits comfortably inside this size.' }
}

export default function FitDemo() {
  const [chest, setChest] = useState(98)
  const id = useId()
  const result = describe(chest)

  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium">Your chest</label>
        <output htmlFor={id} className="font-display text-2xl font-bold">{chest} cm</output>
      </div>

      <div className="relative mt-5 h-14">
        <div className="absolute inset-x-0 top-0 h-9 overflow-hidden rounded-md bg-tape">
          {SAMPLE_CHART.map((s, i) => {
            const active = chest >= s.min && chest < s.max
            return (
              <div
                key={s.size}
                className={`absolute top-0 flex h-full items-center justify-center border-l-2 border-ink/80 text-sm font-semibold transition-colors ${active ? 'bg-ink text-tape' : 'text-ink'}`}
                style={{ left: `${pct(s.min)}%`, width: `${pct(s.max) - pct(s.min)}%`, borderLeftWidth: i === 0 ? 2 : 2 }}
              >
                {s.size}
              </div>
            )
          })}
        </div>
        <div className="pointer-events-none absolute top-9 h-4 w-0.5 bg-denim" style={{ left: `${pct(chest)}%` }} aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0 flex justify-between text-[11px] text-muted" aria-hidden="true">
          <span>{SCALE_MIN}</span>
          <span>{SCALE_MAX}</span>
        </div>
      </div>

      <input
        id={id}
        type="range"
        min={SCALE_MIN}
        max={SCALE_MAX}
        step="1"
        value={chest}
        onChange={(e) => setChest(Number(e.target.value))}
        aria-valuetext={`${chest} centimetres`}
        className="mt-1 w-full accent-denim"
      />

      <div className="mt-4 rounded-xl bg-fog p-4" aria-live="polite">
        <p className="font-display text-xl font-bold">{result.title}</p>
        <p className="mt-0.5 text-sm text-muted">{result.note}</p>
      </div>
      <p className="mt-3 text-xs text-muted">Sample size chart. Real recommendations use the chart of the product you choose.</p>
    </div>
  )
}

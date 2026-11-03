// Accessible radio group styled as a segmented control.
export default function SegmentedControl({ legend, name, options, value, onChange }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium">{legend}</legend>
      <div className="inline-flex flex-wrap gap-1 rounded-lg border border-line bg-white p-1">
        {options.map((o) => (
          <label key={o.value} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="peer sr-only"
            />
            <span className="block rounded-md px-3.5 py-2 text-sm font-medium text-muted transition-colors peer-checked:bg-ink peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-denim peer-focus-visible:ring-offset-1">
              {o.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

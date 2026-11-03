import { useId } from 'react'

export default function ConsentCheckbox({ checked, onChange, children }) {
  const id = useId()
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-5 w-5 shrink-0 rounded border-line accent-denim"
      />
      <label htmlFor={id} className="text-sm">{children}</label>
    </div>
  )
}

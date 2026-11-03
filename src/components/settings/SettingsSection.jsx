import { useId } from 'react'
import Card from '../common/Card'

export default function SettingsSection({ title, description, danger = false, children }) {
  const id = useId()
  return (
    <section aria-labelledby={id}>
      <Card className={`p-5 sm:p-7 ${danger ? 'border-danger/40' : ''}`}>
        <h2 id={id} className={`text-xl font-bold ${danger ? 'text-danger' : ''}`}>{title}</h2>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        <div className="mt-5 space-y-6">{children}</div>
      </Card>
    </section>
  )
}

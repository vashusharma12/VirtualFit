import Card from '../common/Card'
import Badge from '../common/Badge'
import { fromCanonical } from '../../utils/units'

function Alternative({ title, option, availableSizes, unit }) {
  if (!option) {
    return (
      <Card className="p-4">
        <h4 className="font-bold">{title}</h4>
        <p className="mt-1 text-sm text-muted">There is no {title.toLowerCase().includes('smaller') ? 'smaller' : 'larger'} size in this chart.</p>
      </Card>
    )
  }
  const show = (cm) => `${fromCanonical(cm, 'length', unit)} ${unit}`
  const soldOut = availableSizes && !availableSizes.map(String).includes(option.size)
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-bold">{title}: {option.size}</h4>
        {soldOut && <Badge tone="danger">Out of stock</Badge>}
      </div>
      <ul className="mt-2 space-y-1.5 text-sm">
        {option.rows.map((r) => (
          <li key={r.key} className="flex gap-2">
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${r.status === 'within' ? 'bg-ok' : 'bg-danger'}`} aria-hidden="true" />
            <span>
              <span className="capitalize">{r.label}</span>:{' '}
              {r.status === 'within' ? 'would also fit' : `${show(r.diff)} ${r.status === 'above' ? 'over' : 'under'} the range, ${r.feel}`}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export default function SizeAlternatives({ comparison, availableSizes, unit }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Alternative title="One size smaller" option={comparison.smaller} availableSizes={availableSizes} unit={unit} />
      <Alternative title="One size larger" option={comparison.larger} availableSizes={availableSizes} unit={unit} />
    </div>
  )
}

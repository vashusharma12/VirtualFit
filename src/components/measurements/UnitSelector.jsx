import SegmentedControl from '../common/SegmentedControl'

const OPTIONS = {
  length: { legend: 'Length units', options: [{ value: 'cm', label: 'Centimetres (cm)' }, { value: 'in', label: 'Inches (in)' }] },
  weight: { legend: 'Weight units', options: [{ value: 'kg', label: 'Kilograms (kg)' }, { value: 'lbs', label: 'Pounds (lbs)' }] },
}

export default function UnitSelector({ kind, value, onChange }) {
  const cfg = OPTIONS[kind]
  return <SegmentedControl legend={cfg.legend} name={`unit-${kind}`} options={cfg.options} value={value} onChange={onChange} />
}

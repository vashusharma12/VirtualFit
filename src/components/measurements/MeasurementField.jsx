import FormField from '../common/FormField'
import { UNIT_LABELS } from '../../utils/units'

export default function MeasurementField({ field, value, unit, error, onChange, onBlur }) {
  return (
    <FormField
      label={field.required ? field.label : `${field.label} (optional)`}
      name={field.key}
      inputMode="decimal"
      autoComplete="off"
      placeholder={field.required ? '' : 'Skip if unsure'}
      suffix={UNIT_LABELS[unit]}
      hint={field.howTo}
      value={value}
      error={error}
      onChange={(e) => onChange(field.key, e.target.value)}
      onBlur={() => onBlur([field.key])}
    />
  )
}

import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { useMeasurementForm } from '../../hooks/useMeasurementForm'
import ProgressIndicator from '../layout/ProgressIndicator'
import Button from '../common/Button'
import Card from '../common/Card'
import UnitSelector from './UnitSelector'
import MeasurementField from './MeasurementField'
import MeasurementReview from './MeasurementReview'
import { MEASUREMENT_STEPS } from '../../data/measurementFields'

export default function MeasurementForm() {
  const navigate = useNavigate()
  const hasProduct = useSelector((s) => Boolean(s.products.analysis.result))
  const form = useMeasurementForm()
  const { step, stepIndex, isLast, units, values, errors } = form

  const progressSteps = MEASUREMENT_STEPS.map((s, i) => ({ label: s.title, onSelect: () => form.goTo(i) }))
  const needsLength = step.fields.some((k) => form.fieldFor(k).kind === 'length')
  const needsWeight = step.fields.some((k) => form.fieldFor(k).kind === 'weight')

  const onSubmit = (e) => {
    e.preventDefault()
    if (isLast) {
      if (form.submit()) navigate(hasProduct ? '/size-guide' : '/body-profile') // back to their product if they came from a link
    } else {
      form.next()
    }
  }

  return (
    <Card className="p-5 sm:p-8">
      <ProgressIndicator steps={progressSteps} current={stepIndex} />

      <form onSubmit={onSubmit} noValidate className="mt-8">
        <p className="text-sm text-muted">Step {stepIndex + 1} of {MEASUREMENT_STEPS.length}</p>
        <h2 className="text-2xl font-bold">{step.title}</h2>
        <p className="mt-1 text-sm text-muted">{step.description}</p>

        {!isLast && (
          <>
            <div className="mt-5 flex flex-wrap gap-4">
              {needsLength && <UnitSelector kind="length" value={units.length} onChange={(u) => form.setUnit('length', u)} />}
              {needsWeight && <UnitSelector kind="weight" value={units.weight} onChange={(u) => form.setUnit('weight', u)} />}
            </div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              {step.fields.map((key) => {
                const field = form.fieldFor(key)
                return (
                  <MeasurementField
                    key={key}
                    field={field}
                    value={values[key]}
                    unit={units[field.kind]}
                    error={errors[key]}
                    onChange={form.setValue}
                    onBlur={form.touch}
                  />
                )
              })}
            </div>
          </>
        )}

        {isLast && (
          <div className="mt-6">
            <MeasurementReview values={values} units={units} onEdit={form.goTo} />
          </div>
        )}

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          {stepIndex > 0 ? (
            <Button variant="secondary" onClick={form.back}>Back</Button>
          ) : (
            <Button to="/profile" variant="secondary">Back to profile</Button>
          )}
          <Button type="submit" variant="accent">
            {isLast ? 'Save measurements' : 'Continue'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setMeasurements } from '../redux/slices/measurementSlice'
import { MEASUREMENT_FIELDS, MEASUREMENT_STEPS, FIELD_BY_KEY } from '../data/measurementFields'
import { toCanonical, fromCanonical, round1 } from '../utils/units'
import { parseNumeric, sanitizeNumericInput, validateMeasurement } from '../utils/validation'

export function useMeasurementForm() {
  const dispatch = useDispatch()
  const saved = useSelector((s) => s.measurements)

  const [units, setUnitsState] = useState(saved.displayUnits)
  const [values, setValues] = useState(() =>
    Object.fromEntries(
      MEASUREMENT_FIELDS.map((f) => [
        f.key,
        saved[f.key] == null ? '' : String(fromCanonical(saved[f.key], f.kind, saved.displayUnits[f.kind])),
      ]),
    ),
  )
  const [touched, setTouched] = useState({})
  const [stepIndex, setStepIndex] = useState(0)

  const errors = Object.fromEntries(
    MEASUREMENT_FIELDS.map((f) => [f.key, validateMeasurement(f, values[f.key], units[f.kind])]),
  )
  const visibleErrors = Object.fromEntries(
    Object.entries(errors).map(([k, v]) => [k, touched[k] ? v : '']),
  )

  const setValue = (key, raw) => setValues((prev) => ({ ...prev, [key]: sanitizeNumericInput(raw) }))
  const touch = (keys) => setTouched((prev) => ({ ...prev, ...Object.fromEntries(keys.map((k) => [k, true])) }))

  // Switching units converts what the user already typed, so their numbers stay meaningful.
  const setUnit = (kind, nextUnit) => {
    const prevUnit = units[kind]
    if (prevUnit === nextUnit) return
    setValues((prev) => {
      const next = { ...prev }
      MEASUREMENT_FIELDS.filter((f) => f.kind === kind).forEach((f) => {
        const num = parseNumeric(prev[f.key])
        if (!Number.isNaN(num)) {
          next[f.key] = String(round1(fromCanonical(toCanonical(num, kind, prevUnit), kind, nextUnit)))
        }
      })
      return next
    })
    setUnitsState((u) => ({ ...u, [kind]: nextUnit }))
  }

  // Saves every valid field; empty optional fields are stored as null.
  const persist = () => {
    const payload = { displayUnits: units }
    MEASUREMENT_FIELDS.forEach((f) => {
      const text = values[f.key].trim()
      payload[f.key] = text && !errors[f.key] ? round1(toCanonical(parseNumeric(text), f.kind, units[f.kind])) : null
    })
    dispatch(setMeasurements(payload))
  }

  const step = MEASUREMENT_STEPS[stepIndex]
  const isLast = stepIndex === MEASUREMENT_STEPS.length - 1

  const next = () => {
    touch(step.fields)
    if (step.fields.some((k) => errors[k])) return false
    persist()
    setStepIndex((i) => Math.min(i + 1, MEASUREMENT_STEPS.length - 1))
    return true
  }
  const back = () => setStepIndex((i) => Math.max(i - 1, 0))
  const goTo = (i) => setStepIndex(i)

  // Final save from the review step. Returns true when everything required is valid.
  const submit = () => {
    const invalidStep = MEASUREMENT_STEPS.findIndex((s) => s.fields.some((k) => errors[k]))
    if (invalidStep !== -1) {
      touch(MEASUREMENT_STEPS[invalidStep].fields)
      setStepIndex(invalidStep)
      return false
    }
    persist()
    return true
  }

  return {
    step, stepIndex, isLast, units, values, errors: visibleErrors, rawErrors: errors,
    setValue, touch, setUnit, next, back, goTo, submit, fieldFor: (k) => FIELD_BY_KEY[k],
  }
}

import { useState, useCallback } from 'react'

// rules: { field: (value, allValues) => errorString }
export function useFormValidation(initialValues, rules) {
  const [values, setValues] = useState(initialValues)
  const [touched, setTouched] = useState({})

  const errors = Object.fromEntries(
    Object.keys(rules).map((key) => [key, rules[key](values[key], values)]),
  )
  const visibleErrors = Object.fromEntries(
    Object.entries(errors).map(([k, v]) => [k, touched[k] ? v : '']),
  )

  const handleChange = useCallback((e) => {
    const { name, value } = e.target
    setValues((prev) => ({ ...prev, [name]: value }))
  }, [])

  const handleBlur = useCallback((e) => {
    const { name } = e.target
    setTouched((prev) => ({ ...prev, [name]: true }))
  }, [])

  // Marks every field touched and reports whether the form is valid.
  const validateAll = () => {
    setTouched(Object.fromEntries(Object.keys(rules).map((k) => [k, true])))
    return Object.values(errors).every((msg) => !msg)
  }

  return { values, errors: visibleErrors, handleChange, handleBlur, validateAll }
}

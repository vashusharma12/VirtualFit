import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { signupUser, clearAuthError } from '../../redux/slices/authSlice'
import { validators } from '../../utils/validation'
import { useFormValidation } from '../../hooks/useFormValidation'
import { useAuth } from '../../hooks/useAuth'
import { USE_MOCK } from '../../services/apiClient'
import FormField from '../common/FormField'
import Button from '../common/Button'
import AuthError from './AuthError'
import GoogleAuthSection from './GoogleAuthSection'

const rules = {
  name: validators.name,
  email: validators.email,
  password: validators.password,
  confirmPassword: validators.confirmPassword,
}

export default function SignupForm() {
  const dispatch = useDispatch()
  const { loading, error } = useAuth()
  const { values, errors, handleChange, handleBlur, validateAll } = useFormValidation(
    { name: '', email: '', password: '', confirmPassword: '' },
    rules,
  )

  useEffect(() => () => dispatch(clearAuthError()), [dispatch])

  const onSubmit = (e) => {
    e.preventDefault()
    if (!validateAll()) return
    const { name, email, password } = values
    dispatch(signupUser({ name, email, password }))
  }

  const common = { onChange: handleChange, onBlur: handleBlur }

  return (
    <>
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <AuthError message={error} />
      <FormField label="Full name" name="name" autoComplete="name" value={values.name} error={errors.name} {...common} />
      <FormField label="Email" name="email" type="email" autoComplete="email" inputMode="email"
        value={values.email} error={errors.email} {...common} />
      <FormField label="Password" name="password" type="password" autoComplete="new-password"
        hint="At least 8 characters, with a letter and a number."
        value={values.password} error={errors.password} {...common} />
      <FormField label="Confirm password" name="confirmPassword" type="password" autoComplete="new-password"
        value={values.confirmPassword} error={errors.confirmPassword} {...common} />
      <Button type="submit" size="lg" className="w-full" loading={loading}>
        {loading ? 'Creating account…' : 'Create account'}
      </Button>
      {USE_MOCK && (
        <p className="text-xs text-muted">
          Demo mode: your account is kept in this browser only. Do not reuse a real password.
        </p>
      )}
    </form>
    <GoogleAuthSection text="signup_with" />
    </>
  )
}

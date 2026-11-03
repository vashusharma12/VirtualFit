import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { loginUser, clearAuthError } from '../../redux/slices/authSlice'
import { validators } from '../../utils/validation'
import { useFormValidation } from '../../hooks/useFormValidation'
import { useAuth } from '../../hooks/useAuth'
import FormField from '../common/FormField'
import Button from '../common/Button'
import AuthError from './AuthError'
import GoogleAuthSection from './GoogleAuthSection'

const rules = { email: validators.email, password: validators.loginPassword }

export default function LoginForm() {
  const dispatch = useDispatch()
  const { loading, error } = useAuth()
  const { values, errors, handleChange, handleBlur, validateAll } = useFormValidation(
    { email: '', password: '' },
    rules,
  )

  useEffect(() => () => dispatch(clearAuthError()), [dispatch])

  const onSubmit = (e) => {
    e.preventDefault()
    if (!validateAll()) return
    dispatch(loginUser(values))
  }

  return (
    <>
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <AuthError message={error} />
      <FormField label="Email" name="email" type="email" autoComplete="email" inputMode="email"
        value={values.email} onChange={handleChange} onBlur={handleBlur} error={errors.email} />
      <FormField label="Password" name="password" type="password" autoComplete="current-password"
        value={values.password} onChange={handleChange} onBlur={handleBlur} error={errors.password} />
      <Button type="submit" size="lg" className="w-full" loading={loading}>
        {loading ? 'Logging in…' : 'Log in'}
      </Button>
    </form>
    <GoogleAuthSection text="signin_with" />
    </>
  )
}

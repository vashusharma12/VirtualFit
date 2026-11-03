import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import AuthShell from '../../components/auth/AuthShell'
import LoginForm from '../../components/auth/LoginForm'
import PendingLinkNote from '../../components/auth/PendingLinkNote'
import { getPendingLink } from '../../utils/pendingLink'

export default function Login() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  const from = location.state?.from || '/dashboard'

  if (isAuthenticated) return <Navigate to={getPendingLink() ? '/size-guide' : from} replace />

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to see your measurements, sizes and saved results."
      footer={<>New to VirtualFit? <Link to="/signup" className="font-medium text-ink underline">Create your profile</Link></>}
    >
      <PendingLinkNote action="Log in" />
      <LoginForm />
    </AuthShell>
  )
}

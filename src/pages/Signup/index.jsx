import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import AuthShell from '../../components/auth/AuthShell'
import SignupForm from '../../components/auth/SignupForm'
import PendingLinkNote from '../../components/auth/PendingLinkNote'
import { getPendingLink } from '../../utils/pendingLink'

export default function Signup() {
  const { isAuthenticated } = useAuth()

  // New accounts continue into onboarding, unless they arrived with a product link: then straight to its result.
  if (isAuthenticated) return <Navigate to={getPendingLink() ? '/size-guide' : '/profile'} replace />

  return (
    <AuthShell
      title="Create your fit profile"
      subtitle="It takes a few minutes. You decide what to share."
      footer={<>Already have an account? <Link to="/login" className="font-medium text-ink underline">Log in</Link></>}
    >
      <PendingLinkNote action="Create your profile" />
      <SignupForm />
    </AuthShell>
  )
}

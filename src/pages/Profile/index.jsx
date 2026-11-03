import { useSelector } from 'react-redux'
import { profileCompletion } from '../../utils/calculations'
import OnboardingProgress from '../../components/layout/OnboardingProgress'
import ProfileForm from '../../components/profile/ProfileForm'
import ProgressBar from '../../components/common/ProgressBar'

export default function Profile() {
  const profile = useSelector((s) => s.profile)
  const measurements = useSelector((s) => s.measurements)

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <OnboardingProgress current={0} />
      <h1 className="mt-8 text-3xl font-bold sm:text-4xl">Your profile</h1>
      <p className="mt-2 text-muted">A few basics so recommendations use the right size charts and units.</p>
      <div className="mt-6"><ProgressBar label="Profile completion" value={profileCompletion(profile, measurements)} /></div>
      <div className="mt-6"><ProfileForm /></div>
    </div>
  )
}

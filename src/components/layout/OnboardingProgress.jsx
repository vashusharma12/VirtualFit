import ProgressIndicator from './ProgressIndicator'

const STEPS = [
  { label: 'Profile', to: '/profile' },
  { label: 'Measurements', to: '/measurements' },
  { label: 'Body profile', to: '/body-profile' },
]

export default function OnboardingProgress({ current }) {
  return <ProgressIndicator steps={STEPS} current={current} />
}

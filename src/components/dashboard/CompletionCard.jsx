import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { profileCompletion } from '../../utils/calculations'
import Card from '../common/Card'
import ProgressBar from '../common/ProgressBar'

const REQUIRED = ['height', 'weight', 'chest', 'waist', 'hips']

export default function CompletionCard() {
  const profile = useSelector((s) => s.profile)
  const measurements = useSelector((s) => s.measurements)
  const photos = useSelector((s) => s.photos)
  const photoCount = photos.status === 'succeeded' ? Object.values(photos.items).filter(Boolean).length : null
  const percent = profileCompletion(profile, measurements, photoCount)

  const steps = [
    { label: 'Profile basics', done: Boolean(profile.name?.trim() && profile.genderPreference), to: '/profile' },
    { label: 'Core measurements', done: REQUIRED.every((k) => measurements[k] != null), to: '/measurements' },
    { label: 'Optional measurements', done: ['shoulder', 'inseam', 'footLength', 'headCircumference'].every((k) => measurements[k] != null), to: '/measurements' },
    { label: 'Photos for try-on', done: photoCount == null ? null : photoCount > 0, to: '/body-profile' },
    { label: 'Body shape', done: Boolean(profile.bodyShape), to: '/body-profile' },
  ]

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-xl font-bold">Profile completion</h2>
      <div className="mt-4"><ProgressBar label="Complete" value={percent} /></div>
      <ul className="mt-4 space-y-1.5 text-sm">
        {steps.map((s) => (
          <li key={s.label} className="flex items-center justify-between gap-3">
            <span className={s.done ? 'text-muted' : 'font-medium'}>
              <span aria-hidden="true">{s.done ? '✓ ' : '○ '}</span>{s.label}
              <span className="sr-only">{s.done ? ' (done)' : ' (to do)'}</span>
            </span>
            {!s.done && <Link to={s.to} className="font-medium text-denim underline underline-offset-2">{s.done === null ? 'Check' : 'Add'}</Link>}
          </li>
        ))}
      </ul>
    </Card>
  )
}

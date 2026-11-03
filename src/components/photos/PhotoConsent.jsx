import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setPhotoConsent } from '../../redux/slices/photosSlice'
import Card from '../common/Card'
import Button from '../common/Button'
import ConsentCheckbox from '../common/ConsentCheckbox'

const POINTS = [
  { title: 'What is stored', text: 'Up to four photos of you (front, left, right and back). Each is resized, and camera and location data is removed.' },
  { title: 'Why', text: 'Only to show products on you in try-on previews. Your photos are never public, never shown to other users, and never used for advertising.' },
  { title: 'Who can see them', text: 'Only you, in your private storage. Before any photo is sent to an AI service to create a try-on preview, you will be asked to confirm again.' },
  { title: 'How long', text: 'Until you delete them. You can delete one photo or all of them at any time, and withdrawing consent deletes everything.' },
]

export default function PhotoConsent() {
  const dispatch = useDispatch()
  const { consentStatus, consentError } = useSelector((s) => s.photos)
  const [agreed, setAgreed] = useState(false)

  return (
    <Card className="p-5 sm:p-8">
      <h2 className="text-2xl font-bold">Before you add photos</h2>
      <p className="mt-2 text-muted">Photos of your body are sensitive. Here is exactly what happens to them.</p>
      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        {POINTS.map((p) => (
          <div key={p.title} className="rounded-xl bg-fog p-4">
            <dt className="font-display font-bold">{p.title}</dt>
            <dd className="mt-1 text-sm text-muted">{p.text}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6">
        <ConsentCheckbox checked={agreed} onChange={setAgreed}>
          I agree that VirtualFit may store photos of me for the purposes described above. I understand I can delete them at any time.
        </ConsentCheckbox>
      </div>

      {consentError && <p role="alert" className="mt-3 text-sm font-medium text-danger">{consentError}</p>}

      <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <Button variant="accent" disabled={!agreed} loading={consentStatus === 'saving'} onClick={() => dispatch(setPhotoConsent(true))}>
          Allow and add photos
        </Button>
        <span className="text-sm text-muted">Not now? You can skip photos and continue below.</span>
      </div>
    </Card>
  )
}

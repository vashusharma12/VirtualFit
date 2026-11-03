import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { updateProfile } from '../../redux/slices/profileSlice'
import { setMeasurements } from '../../redux/slices/measurementSlice'
import { validators } from '../../utils/validation'
import FormField from '../common/FormField'
import SegmentedControl from '../common/SegmentedControl'
import Button from '../common/Button'
import Card from '../common/Card'
import UnitSelector from '../measurements/UnitSelector'

const PREFERENCES = [
  { value: 'men', label: "Men's sizing" },
  { value: 'women', label: "Women's sizing" },
  { value: 'unisex', label: 'Unisex / no preference' },
]

export default function ProfileForm() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector((s) => s.auth.user)
  const profile = useSelector((s) => s.profile)
  const savedUnits = useSelector((s) => s.measurements.displayUnits)

  const [name, setName] = useState(profile.name || user?.name || '')
  const [preference, setPreference] = useState(profile.genderPreference || 'unisex')
  const [units, setUnits] = useState(savedUnits)
  const [touched, setTouched] = useState(false)

  const error = touched ? validators.name(name) : ''

  const onSubmit = (e) => {
    e.preventDefault()
    setTouched(true)
    if (validators.name(name)) return
    dispatch(updateProfile({ name: name.trim(), genderPreference: preference }))
    dispatch(setMeasurements({ displayUnits: units }))
    navigate('/measurements')
  }

  return (
    <Card className="p-5 sm:p-8">
      <form onSubmit={onSubmit} noValidate className="space-y-6">
        <FormField label="Your name" name="name" autoComplete="name" value={name} error={error}
          onChange={(e) => setName(e.target.value)} onBlur={() => setTouched(true)} />

        <div>
          <SegmentedControl legend="Which size charts should we show first?" name="preference"
            options={PREFERENCES} value={preference} onChange={setPreference} />
          <p className="mt-1.5 text-xs text-muted">
            Many brands size men's and women's clothing differently. This only affects which chart is used.
          </p>
        </div>

        <div className="flex flex-wrap gap-4">
          <UnitSelector kind="length" value={units.length} onChange={(u) => setUnits((x) => ({ ...x, length: u }))} />
          <UnitSelector kind="weight" value={units.weight} onChange={(u) => setUnits((x) => ({ ...x, weight: u }))} />
        </div>

        <div className="flex justify-end">
          <Button type="submit" variant="accent">Save and continue</Button>
        </div>
      </form>
    </Card>
  )
}

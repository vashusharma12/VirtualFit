import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { updateProfile } from '../../redux/slices/profileSlice'
import { setMeasurements } from '../../redux/slices/measurementSlice'
import { validators } from '../../utils/validation'
import SettingsSection from './SettingsSection'
import FormField from '../common/FormField'
import Button from '../common/Button'
import SegmentedControl from '../common/SegmentedControl'
import UnitSelector from '../measurements/UnitSelector'
import FitPreferenceSelector from '../size-guide/FitPreferenceSelector'

const SIZING = [{ value: 'men', label: "Men's sizing" }, { value: 'women', label: "Women's sizing" }, { value: 'unisex', label: 'Unisex / no preference' }]

export default function PreferencesSettings() {
  const dispatch = useDispatch()
  const profile = useSelector((s) => s.profile)
  const units = useSelector((s) => s.measurements.displayUnits)
  const [name, setName] = useState(profile.name)
  const [touched, setTouched] = useState(false)
  const [saved, setSaved] = useState(false)
  const error = touched ? validators.name(name) : ''

  const saveName = (e) => {
    e.preventDefault()
    setTouched(true)
    if (validators.name(name)) return
    dispatch(updateProfile({ name: name.trim() }))
    setSaved(true)
  }

  return (
    <SettingsSection title="Preferences" description="Changes are saved automatically.">
      <form onSubmit={saveName} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <FormField label="Your name" name="name" autoComplete="name" value={name} error={error} onChange={(e) => { setName(e.target.value); setSaved(false) }} onBlur={() => setTouched(true)} />
        </div>
        <Button type="submit" variant="secondary">Save name</Button>
        <span role="status" className="text-sm text-ok sm:pb-3">{saved ? 'Saved' : ''}</span>
      </form>
      <div className="flex flex-wrap gap-4">
        <UnitSelector kind="length" value={units.length} onChange={(u) => dispatch(setMeasurements({ displayUnits: { ...units, length: u } }))} />
        <UnitSelector kind="weight" value={units.weight} onChange={(u) => dispatch(setMeasurements({ displayUnits: { ...units, weight: u } }))} />
      </div>
      <SegmentedControl legend="Which size charts should we show first?" name="settings-sizing" options={SIZING} value={profile.genderPreference || 'unisex'} onChange={(v) => dispatch(updateProfile({ genderPreference: v }))} />
      <FitPreferenceSelector />
    </SettingsSection>
  )
}

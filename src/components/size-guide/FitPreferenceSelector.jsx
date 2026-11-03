import { useDispatch, useSelector } from 'react-redux'
import { updateProfile } from '../../redux/slices/profileSlice'
import SegmentedControl from '../common/SegmentedControl'

const OPTIONS = [{ value: 'snug', label: 'Snug' }, { value: 'regular', label: 'Regular' }, { value: 'relaxed', label: 'Relaxed' }]

export default function FitPreferenceSelector() {
  const dispatch = useDispatch()
  const preferences = useSelector((s) => s.profile.preferences)
  return (
    <div>
      <SegmentedControl
        legend="How do you like it to fit?"
        name="fit-preference"
        options={OPTIONS}
        value={preferences?.fitPreference ?? 'regular'}
        onChange={(v) => dispatch(updateProfile({ preferences: { ...preferences, fitPreference: v } }))}
      />
    </div>
  )
}

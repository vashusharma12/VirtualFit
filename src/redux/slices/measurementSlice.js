import { createSlice } from '@reduxjs/toolkit'
import { loadUserData } from '../thunks/userData'

// Values are stored in canonical units (cm / kg). Display units are a UI preference.
const initialState = {
  height: null,
  weight: null,
  chest: null,
  waist: null,
  hips: null,
  shoulder: null,
  inseam: null,
  footLength: null,
  headCircumference: null,
  displayUnits: { length: 'cm', weight: 'kg' },
}

const measurementSlice = createSlice({
  name: 'measurements',
  initialState,
  reducers: {
    setMeasurements: (state, action) => ({ ...state, ...action.payload }),
  },
  extraReducers: (builder) => {
    builder.addCase(loadUserData.fulfilled, (_state, action) => {
      const saved = action.payload.data?.measurements
      return saved
        ? { ...initialState, ...saved, displayUnits: { ...initialState.displayUnits, ...saved.displayUnits } }
        : initialState
    })
  },
})

export const { setMeasurements } = measurementSlice.actions
export default measurementSlice.reducer

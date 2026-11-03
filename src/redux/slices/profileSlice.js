import { createSlice } from '@reduxjs/toolkit'
import { loadUserData } from '../thunks/userData'

const initialState = {
  name: '',
  genderPreference: '',
  bodyShape: null,
  savedProductIds: [],
  preferences: {},
}

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    updateProfile: (state, action) => ({ ...state, ...action.payload }),
    toggleSavedProduct(state, action) {
      const id = action.payload
      state.savedProductIds = state.savedProductIds.includes(id)
        ? state.savedProductIds.filter((x) => x !== id)
        : [...state.savedProductIds, id]
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loadUserData.fulfilled, (_state, action) => {
      const saved = action.payload.data?.profile
      return saved ? { ...initialState, ...saved } : initialState
    })
  },
})

export const { updateProfile, toggleSavedProduct } = profileSlice.actions
export default profileSlice.reducer

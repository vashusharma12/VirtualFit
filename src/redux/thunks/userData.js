import { createAsyncThunk } from '@reduxjs/toolkit'
import { userDataService } from '../../services/userDataService'

export const loadUserData = createAsyncThunk(
  'userData/load',
  async (_, { getState, rejectWithValue }) => {
    const user = getState().auth.user
    try {
      return { userId: user.id, data: await userDataService.load(user.id) }
    } catch (err) {
      return rejectWithValue(err.message)
    }
  },
  { condition: (_, { getState }) => getState().userData.loadStatus !== 'loading' },
)

export const saveUserData = createAsyncThunk('userData/save', async (_, { getState, rejectWithValue }) => {
  const s = getState()
  if (!s.auth.user) return null
  try {
    await userDataService.save(s.auth.user.id, {
      profile: s.profile,
      measurements: s.measurements,
      sizeHistory: s.sizeGuide.history,
      tryOnHistory: [], // kept for compatibility; try-on results are stored as images on the server
    })
    return true
  } catch (err) {
    return rejectWithValue(err.message)
  }
})

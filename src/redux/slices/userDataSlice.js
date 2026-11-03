import { createSlice } from '@reduxjs/toolkit'
import { loadUserData, saveUserData } from '../thunks/userData'

const initialState = {
  loadStatus: 'idle', // idle | loading | succeeded | failed
  loadedUserId: null,
  loadError: null,
  saveStatus: 'idle', // idle | saving | saved | error
  saveError: null,
}

const userDataSlice = createSlice({
  name: 'userData',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadUserData.pending, (s) => { s.loadStatus = 'loading'; s.loadError = null })
      .addCase(loadUserData.fulfilled, (s, a) => { s.loadStatus = 'succeeded'; s.loadedUserId = a.payload.userId })
      .addCase(loadUserData.rejected, (s, a) => { s.loadStatus = 'failed'; s.loadError = a.payload || 'Could not load your data.' })
      .addCase(saveUserData.pending, (s) => { s.saveStatus = 'saving'; s.saveError = null })
      .addCase(saveUserData.fulfilled, (s) => { s.saveStatus = 'saved' })
      .addCase(saveUserData.rejected, (s, a) => { s.saveStatus = 'error'; s.saveError = a.payload || 'Could not save your changes.' })
  },
})

export default userDataSlice.reducer

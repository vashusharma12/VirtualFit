import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { photosService } from '../../services/photosService'
import { prepareImage } from '../../utils/image'
import { ANGLE_IDS } from '../../data/photoAngles'

const emptySlot = () => ({ status: 'idle', error: null, warnings: [] }) // idle | uploading | removing
const emptyItems = () => Object.fromEntries(ANGLE_IDS.map((a) => [a, null]))

const initialState = {
  status: 'idle', // idle | loading | succeeded | failed
  error: null,
  consent: { granted: false, grantedAt: null },
  consentStatus: 'idle', // idle | saving
  consentError: null,
  items: emptyItems(),
  slots: Object.fromEntries(ANGLE_IDS.map((a) => [a, emptySlot()])),
  bulkStatus: 'idle', // idle | deleting
  bulkError: null,
}

const uid = (getState) => getState().auth.user?.id

export const fetchPhotos = createAsyncThunk('photos/fetch', async (_, { getState, rejectWithValue }) => {
  try {
    return await photosService.list(uid(getState))
  } catch (err) {
    return rejectWithValue(err.message)
  }
})

export const setPhotoConsent = createAsyncThunk('photos/consent', async (granted, { getState, rejectWithValue }) => {
  try {
    return await photosService.setConsent(uid(getState), granted)
  } catch (err) {
    return rejectWithValue(err.message)
  }
})

export const uploadPhoto = createAsyncThunk('photos/upload', async ({ angle, file }, { getState, rejectWithValue }) => {
  try {
    const prepared = await prepareImage(file)
    const result = await photosService.upload(uid(getState), angle, prepared.blob)
    const seen = new Set()
    const warnings = [...prepared.warnings, ...result.warnings].filter((w) => !seen.has(w.code) && seen.add(w.code))
    return { angle, photo: result.photo, warnings }
  } catch (err) {
    return rejectWithValue(err.message)
  }
})

export const deletePhoto = createAsyncThunk('photos/delete', async (angle, { getState, rejectWithValue }) => {
  try {
    await photosService.remove(uid(getState), angle)
    return angle
  } catch (err) {
    return rejectWithValue(err.message)
  }
})

export const deleteAllPhotos = createAsyncThunk('photos/deleteAll', async (_, { getState, rejectWithValue }) => {
  try {
    await photosService.removeAll(uid(getState))
  } catch (err) {
    return rejectWithValue(err.message)
  }
})

const photosSlice = createSlice({
  name: 'photos',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    const resetPhotos = (state) => {
      state.items = emptyItems()
      state.slots = Object.fromEntries(ANGLE_IDS.map((a) => [a, emptySlot()]))
    }
    builder
      .addCase(fetchPhotos.pending, (s) => { s.status = 'loading'; s.error = null })
      .addCase(fetchPhotos.fulfilled, (s, a) => {
        s.status = 'succeeded'
        s.consent = { granted: a.payload.consent.granted, grantedAt: a.payload.consent.grantedAt }
        s.items = emptyItems()
        a.payload.photos.forEach((p) => { s.items[p.angle] = p })
      })
      .addCase(fetchPhotos.rejected, (s, a) => { s.status = 'failed'; s.error = a.payload || 'Could not load your photos.' })

      .addCase(setPhotoConsent.pending, (s) => { s.consentStatus = 'saving'; s.consentError = null })
      .addCase(setPhotoConsent.fulfilled, (s, a) => {
        s.consentStatus = 'idle'
        s.consent = { granted: a.payload.granted, grantedAt: a.payload.grantedAt }
        if (!a.payload.granted) resetPhotos(s)
      })
      .addCase(setPhotoConsent.rejected, (s, a) => { s.consentStatus = 'idle'; s.consentError = a.payload || 'Could not save your choice.' })

      .addCase(uploadPhoto.pending, (s, a) => { s.slots[a.meta.arg.angle] = { status: 'uploading', error: null, warnings: [] } })
      .addCase(uploadPhoto.fulfilled, (s, a) => {
        s.items[a.payload.angle] = a.payload.photo
        s.slots[a.payload.angle] = { status: 'idle', error: null, warnings: a.payload.warnings }
      })
      .addCase(uploadPhoto.rejected, (s, a) => {
        s.slots[a.meta.arg.angle] = { status: 'idle', error: a.payload || 'Upload failed. Please try again.', warnings: [] }
      })

      .addCase(deletePhoto.pending, (s, a) => { s.slots[a.meta.arg].status = 'removing'; s.slots[a.meta.arg].error = null })
      .addCase(deletePhoto.fulfilled, (s, a) => { s.items[a.payload] = null; s.slots[a.payload] = emptySlot() })
      .addCase(deletePhoto.rejected, (s, a) => {
        s.slots[a.meta.arg] = { ...s.slots[a.meta.arg], status: 'idle', error: a.payload || 'Could not remove the photo.' }
      })

      .addCase(deleteAllPhotos.pending, (s) => { s.bulkStatus = 'deleting'; s.bulkError = null })
      .addCase(deleteAllPhotos.fulfilled, (s) => { s.bulkStatus = 'idle'; resetPhotos(s) })
      .addCase(deleteAllPhotos.rejected, (s, a) => { s.bulkStatus = 'idle'; s.bulkError = a.payload || 'Could not delete your photos.' })
  },
})

export default photosSlice.reducer

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { tryOnService } from '../../services/tryOnService'

// Polling interval for a running job. A mutable object so tests can speed it up.
export const pollConfig = { ms: 900 }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const initialState = {
  userImage: null, // the photo URL being used (a private, login-protected URL; never persisted)
  productImage: null,
  selectedSize: null,
  status: 'idle', // idle | preparing | processing | succeeded | failed
  job: null, // { id, progress, stage } while a job runs
  result: null, // the latest finished job
  error: null, // { code, message }
  config: { status: 'idle', provider: null, supportedCategories: [] },
  viewing: { status: 'idle', job: null, error: null }, // the result open on the results page
  history: { status: 'idle', items: [], error: null }, // finished results (the server keeps unsaved ones for 24 hours)
}

export const fetchTryOnConfig = createAsyncThunk('tryOn/config', async (_, { rejectWithValue }) => {
  try {
    return await tryOnService.config()
  } catch (err) {
    return rejectWithValue(err.message)
  }
})

// Creates the job, then polls until it finishes. Aborting (promise.abort()) cancels it on the server.
export const startTryOn = createAsyncThunk('tryOn/start', async ({ product, size, fit, confirmExternal, userImageUrl }, { dispatch, signal, rejectWithValue }) => {
  let job
  try {
    job = await tryOnService.start({ product, size, fit, confirmExternal, userImageUrl })
    dispatch(tryOnSlice.actions.progress(job))
    while (!['succeeded', 'failed', 'cancelled'].includes(job.status)) {
      await sleep(pollConfig.ms)
      if (signal.aborted) {
        await tryOnService.cancel(job.id).catch(() => {})
        return rejectWithValue({ code: 'cancelled', message: 'Cancelled.' })
      }
      job = await tryOnService.get(job.id)
      dispatch(tryOnSlice.actions.progress(job))
    }
  } catch (err) {
    return rejectWithValue({ code: err.code ?? 'request_failed', message: err.message })
  }
  if (job.status === 'succeeded') return job
  return rejectWithValue({ code: job.error?.code ?? job.status, message: job.error?.message ?? 'The preview could not be created.' })
})

export const fetchTryOnJob = createAsyncThunk('tryOn/job', async (id, { rejectWithValue }) => {
  try {
    return await tryOnService.get(id)
  } catch (err) {
    return rejectWithValue({ message: err.message, notFound: err.status === 404 })
  }
})

export const fetchTryOnHistory = createAsyncThunk('tryOn/history', async (_, { rejectWithValue }) => {
  try {
    return await tryOnService.list()
  } catch (err) {
    return rejectWithValue(err.message)
  }
})

export const saveTryOnResult = createAsyncThunk('tryOn/save', async ({ id, saved }, { rejectWithValue }) => {
  try {
    return await tryOnService.save(id, saved)
  } catch (err) {
    return rejectWithValue(err.message)
  }
})

export const deleteTryOnResult = createAsyncThunk('tryOn/delete', async (id, { rejectWithValue }) => {
  try {
    await tryOnService.remove(id)
    return id
  } catch (err) {
    return rejectWithValue(err.message)
  }
})

export const deleteAllTryOnResults = createAsyncThunk('tryOn/deleteAll', async (_, { rejectWithValue }) => {
  try {
    await tryOnService.removeAll()
  } catch (err) {
    return rejectWithValue(err.message)
  }
})

const tryOnSlice = createSlice({
  name: 'tryOn',
  initialState,
  reducers: {
    setTryOnInputs(state, action) {
      Object.assign(state, action.payload)
    },
    resetTryOn(state) {
      state.status = 'idle'; state.job = null; state.error = null
    },
    progress(state, action) {
      const j = action.payload
      state.status = 'processing'
      state.job = { id: j.id, progress: j.progress, stage: j.stage }
    },
  },
  extraReducers: (builder) => {
    const replace = (state, job) => {
      state.history.items = state.history.items.map((i) => (i.id === job.id ? job : i))
      if (state.viewing.job?.id === job.id) state.viewing.job = job
    }
    builder
      .addCase(fetchTryOnConfig.pending, (s) => { s.config.status = 'loading' })
      .addCase(fetchTryOnConfig.fulfilled, (s, a) => { s.config = { status: 'succeeded', provider: a.payload.provider, supportedCategories: a.payload.supportedCategories } })
      .addCase(fetchTryOnConfig.rejected, (s) => { s.config.status = 'failed' })

      .addCase(startTryOn.pending, (s) => { s.status = 'preparing'; s.error = null; s.job = null; s.result = null })
      .addCase(startTryOn.fulfilled, (s, a) => { s.status = 'succeeded'; s.result = a.payload; s.job = null })
      .addCase(startTryOn.rejected, (s, a) => {
        s.job = null
        if (a.meta.aborted || a.payload?.code === 'cancelled') { s.status = 'idle'; s.error = null; return }
        s.status = 'failed'
        s.error = a.payload ?? { code: 'request_failed', message: 'Something went wrong. Please try again.' }
      })

      .addCase(fetchTryOnJob.pending, (s) => { s.viewing = { status: 'loading', job: null, error: null } })
      .addCase(fetchTryOnJob.fulfilled, (s, a) => { s.viewing = { status: 'succeeded', job: a.payload, error: null } })
      .addCase(fetchTryOnJob.rejected, (s, a) => { s.viewing = { status: a.payload?.notFound ? 'notFound' : 'failed', job: null, error: a.payload?.message ?? 'Could not load this result.' } })

      .addCase(fetchTryOnHistory.pending, (s) => { s.history.status = 'loading' })
      .addCase(fetchTryOnHistory.fulfilled, (s, a) => { s.history = { status: 'succeeded', items: a.payload, error: null } })
      .addCase(fetchTryOnHistory.rejected, (s, a) => { s.history.status = 'failed'; s.history.error = a.payload })

      .addCase(saveTryOnResult.fulfilled, (s, a) => replace(s, a.payload))
      .addCase(deleteTryOnResult.fulfilled, (s, a) => {
        s.history.items = s.history.items.filter((i) => i.id !== a.payload)
        if (s.viewing.job?.id === a.payload) s.viewing = { status: 'notFound', job: null, error: 'This result was deleted.' }
      })
      .addCase(deleteAllTryOnResults.fulfilled, (s) => { s.history.items = []; s.viewing = initialState.viewing })
  },
})

export const { setTryOnInputs, resetTryOn } = tryOnSlice.actions
export default tryOnSlice.reducer

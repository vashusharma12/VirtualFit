import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { authService } from '../../services/authService'
import { flushPendingSave } from '../persistence'

const initialState = {
  user: null,
  isAuthenticated: false,
  bootstrapped: false, // true once we know whether a session exists
  loading: false,
  error: null,
  notice: null, // a one-off message shown after signing in (for example when accounts were connected)
}

// Asks the backend (or the mock) whether a valid session already exists. Never throws.
export const restoreSession = createAsyncThunk('auth/restore', async () => {
  try {
    return await authService.me()
  } catch {
    return null
  }
})

export const loginUser = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    return await authService.login(credentials)
  } catch (err) {
    return rejectWithValue(err.message)
  }
})

export const signupUser = createAsyncThunk('auth/signup', async (details, { rejectWithValue }) => {
  try {
    return await authService.signup(details)
  } catch (err) {
    return rejectWithValue(err.message)
  }
})

export const loginWithGoogle = createAsyncThunk('auth/google', async (credential, { rejectWithValue }) => {
  try {
    return await authService.loginWithGoogle(credential)
  } catch (err) {
    return rejectWithValue(err.message)
  }
})

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  await flushPendingSave().catch(() => {}) // don't lose a change made just before logging out
  await authService.logout().catch(() => {})
  return true
})

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthError(state) {
      state.error = null
    },
    clearAuthNotice(state) {
      state.notice = null
    },
    sessionExpired(state) {
      state.user = null
      state.isAuthenticated = false
    },
  },
  extraReducers: (builder) => {
    const pending = (state) => {
      state.loading = true
      state.error = null
    }
    const signedIn = (state, action) => {
      state.loading = false
      state.user = action.payload
      state.isAuthenticated = true
    }
    const failed = (state, action) => {
      state.loading = false
      state.error = action.payload || 'Something went wrong. Please try again.'
    }
    builder
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.user = action.payload
        state.isAuthenticated = Boolean(action.payload)
        state.bootstrapped = true
      })
      .addCase(loginUser.pending, pending)
      .addCase(loginUser.fulfilled, signedIn)
      .addCase(loginUser.rejected, failed)
      .addCase(signupUser.pending, pending)
      .addCase(signupUser.fulfilled, signedIn)
      .addCase(signupUser.rejected, failed)
      .addCase(loginWithGoogle.pending, pending)
      .addCase(loginWithGoogle.fulfilled, (state, action) => {
        state.loading = false
        state.user = action.payload.user
        state.isAuthenticated = true
        state.notice = action.payload.linked
          ? 'We connected Google to your existing VirtualFit account, and kept all your data. From now on, sign in with Google. Your old password no longer works.'
          : null
      })
      .addCase(loginWithGoogle.rejected, failed)
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null
        state.isAuthenticated = false
      })
  },
})

export const { clearAuthError, clearAuthNotice, sessionExpired } = authSlice.actions
export default authSlice.reducer

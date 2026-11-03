import { combineReducers, configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import userDataReducer from './slices/userDataSlice'
import profileReducer from './slices/profileSlice'
import measurementReducer from './slices/measurementSlice'
import productReducer from './slices/productSlice'
import sizeGuideReducer from './slices/sizeGuideSlice'
import tryOnReducer from './slices/tryOnSlice'
import photosReducer from './slices/photosSlice'
import { attachPersistence } from './persistence'

const combined = combineReducers({
  auth: authReducer,
  userData: userDataReducer,
  profile: profileReducer,
  measurements: measurementReducer,
  products: productReducer,
  sizeGuide: sizeGuideReducer,
  tryOn: tryOnReducer,
  photos: photosReducer,
})

// Logging out (or an expired session) wipes everything except auth, so the next person on this
// browser never sees the previous user's measurements or photos.
const RESET_ON = new Set(['auth/logout/fulfilled', 'auth/sessionExpired'])
const rootReducer = (state, action) =>
  RESET_ON.has(action.type) && state ? combined({ auth: state.auth }, action) : combined(state, action)

export const store = configureStore({ reducer: rootReducer })

attachPersistence(store)

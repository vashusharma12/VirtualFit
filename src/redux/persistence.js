import { storage } from '../utils/storage'
import { USE_MOCK } from '../services/apiClient'
import { saveUserData } from './thunks/userData'

const SAVE_DELAY_MS = 600
let timer = null
let storeRef = null

// Saves immediately if a debounced save is waiting (used before logging out).
export async function flushPendingSave() {
  if (!timer || !storeRef) return
  clearTimeout(timer)
  timer = null
  await storeRef.dispatch(saveUserData())
}

// Watches the store: keeps the mock session in localStorage, and saves the user's data (debounced)
// whenever it changes after it has been loaded. Photos are never part of this.
export function attachPersistence(store) {
  storeRef = store
  const prev = { authUser: undefined, loadedFor: null, slices: [] }

  store.subscribe(() => {
    const s = store.getState()
    const user = s.auth.user

    if (USE_MOCK && s.auth.bootstrapped && user !== prev.authUser) {
      user ? storage.set('auth', { user }) : storage.remove('auth')
      prev.authUser = user
    }

    const slices = [s.profile, s.measurements, s.sizeGuide.history]
    if (!user) {
      clearTimeout(timer)
      timer = null
      prev.loadedFor = null
      prev.slices = slices
      return
    }
    if (s.userData.loadedUserId !== user.id) {
      prev.loadedFor = null
      prev.slices = slices
      return
    }
    if (prev.loadedFor !== user.id) {
      // Data was just loaded: take a snapshot so loading does not trigger a save.
      prev.loadedFor = user.id
      prev.slices = slices
      return
    }
    if (slices.some((x, i) => x !== prev.slices[i])) {
      prev.slices = slices
      clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        store.dispatch(saveUserData())
      }, SAVE_DELAY_MS)
    }
  })
}

import { storage } from '../utils/storage'
import { USE_MOCK, apiClient, delay } from './apiClient'

// `mock` is for running the frontend alone (VITE_USE_MOCK=true). It is NOT secure: accounts live in this
// browser's localStorage. `remote` talks to the Express backend (bcrypt hashes, httpOnly cookie session).
const USERS_KEY = 'mockUsers'

async function hashPassword(password) {
  const data = new TextEncoder().encode(`virtualfit-mock:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

const publicUser = ({ id, name, email }) => ({ id, name, email })

const mock = {
  async signup({ name, email, password }) {
    await delay(700)
    const users = storage.get(USERS_KEY, [])
    const normalized = email.trim().toLowerCase()
    if (users.some((u) => u.email === normalized)) {
      throw new Error('An account with this email already exists. Try logging in.')
    }
    const user = {
      id: `u_${Date.now().toString(36)}`,
      name: name.trim(),
      email: normalized,
      passwordHash: await hashPassword(password),
    }
    storage.set(USERS_KEY, [...users, user])
    return publicUser(user)
  },
  async login({ email, password }) {
    await delay(600)
    const users = storage.get(USERS_KEY, [])
    const user = users.find((u) => u.email === email.trim().toLowerCase())
    if (!user || user.passwordHash !== (await hashPassword(password))) {
      throw new Error('Incorrect email or password.')
    }
    return publicUser(user)
  },
  async logout() {},
  async googleConfig() {
    return null // Google sign-in needs the real server
  },
  async loginWithGoogle() {
    throw new Error('Google sign-in needs the server. Run the full app with "npm run dev".')
  },
  async me() {
    return storage.get('auth')?.user ?? null
  },
  async exportData(snapshot) {
    return new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), note: 'Demo mode: this data only ever lived in this browser.', ...snapshot }, null, 2)], { type: 'application/json' })
  },
  async deleteAccount(userId, password) {
    await delay(400)
    const users = storage.get(USERS_KEY, [])
    const user = users.find((u) => u.id === userId)
    if (!user || user.passwordHash !== (await hashPassword(password))) throw Object.assign(new Error('That password is not correct.'), { code: 'wrong_password' })
    storage.set(USERS_KEY, users.filter((u) => u.id !== userId))
    storage.remove(`userdata:${userId}`)
    storage.remove(`photoConsent:${userId}`)
    storage.remove('auth')
  },
}

const remote = {
  async signup(payload) {
    const { data } = await apiClient.post('/auth/signup', payload)
    return data.user
  },
  async login(payload) {
    const { data } = await apiClient.post('/auth/login', payload)
    return data.user
  },
  async logout() {
    await apiClient.post('/auth/logout')
  },
  // The public Google client id, or null when Google sign-in is not set up on the server.
  async googleConfig() {
    try {
      const { data } = await apiClient.get('/auth/config')
      return data.googleClientId ?? null
    } catch {
      return null
    }
  },
  async loginWithGoogle(credential) {
    const { data } = await apiClient.post('/auth/google', { credential })
    return { user: data.user, linked: Boolean(data.linked) }
  },
  async exportData() {
    const { data } = await apiClient.get('/account/export', { responseType: 'blob' })
    return data
  },
  async deleteAccount(_userId, proof) {
    await apiClient.delete('/account', { data: typeof proof === 'string' ? { password: proof } : { credential: proof.credential } })
  },
  // Returns the logged-in user, or null when there is no valid session.
  async me() {
    try {
      const { data } = await apiClient.get('/auth/me', { timeout: 6000 })
      return data.user
    } catch (err) {
      if (err.status === 401) return null
      throw err
    }
  },
}

export const authService = USE_MOCK ? mock : remote

import { storage } from '../utils/storage'
import { USE_MOCK, apiClient } from './apiClient'

// Per-user profile, measurements and history. Keyed by user id so accounts never see each other's data.
const mock = {
  async load(userId) {
    return storage.get(`userdata:${userId}`, null)
  },
  async save(userId, data) {
    if (!storage.set(`userdata:${userId}`, data)) throw new Error('Browser storage is full or unavailable.')
  },
}

const remote = {
  async load() {
    const { data } = await apiClient.get('/profile')
    return data.data
  },
  async save(_userId, data) {
    await apiClient.put('/profile', data)
  },
}

export const userDataService = USE_MOCK ? mock : remote

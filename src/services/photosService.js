import { storage } from '../utils/storage'
import { USE_MOCK, apiClient } from './apiClient'

// Every method takes the user id first. The real backend ignores it (the session cookie identifies
// the user); the mock uses it to keep accounts separate.

const withUrl = (p) => ({
  ...p,
  url: `${apiClient.defaults.baseURL}/photos/${p.angle}/image?v=${encodeURIComponent(p.updatedAt)}`,
})

const remote = {
  async list() {
    const { data } = await apiClient.get('/photos')
    return { consent: data.consent, photos: data.photos.map(withUrl) }
  },
  async setConsent(_uid, granted) {
    const { data } = await apiClient.post('/photos/consent', { granted })
    return data.consent
  },
  async upload(_uid, angle, blob) {
    const form = new FormData()
    form.append('photo', blob, `${angle}.jpg`)
    const { data } = await apiClient.put(`/photos/${angle}`, form, { timeout: 60000 })
    return { photo: withUrl(data.photo), warnings: data.warnings }
  },
  async remove(_uid, angle) {
    await apiClient.delete(`/photos/${angle}`)
  },
  async removeAll() {
    await apiClient.delete('/photos')
  },
}

// Mock: photos live in memory only (gone on refresh). Consent is remembered per user.
const memory = {}
const bucket = (uid) => (memory[uid] ??= {})
const mock = {
  async list(uid) {
    const granted = Boolean(storage.get(`photoConsent:${uid}`))
    return {
      consent: { granted, grantedAt: granted ? storage.get(`photoConsent:${uid}`) : null, version: 'mock' },
      photos: Object.values(bucket(uid)),
    }
  },
  async setConsent(uid, granted) {
    if (granted) storage.set(`photoConsent:${uid}`, new Date().toISOString())
    else {
      storage.remove(`photoConsent:${uid}`)
      await this.removeAll(uid)
    }
    return (await this.list(uid)).consent
  },
  async upload(uid, angle, blob) {
    if (!storage.get(`photoConsent:${uid}`)) throw new Error('Please give consent before uploading photos.')
    const old = bucket(uid)[angle]
    if (old) URL.revokeObjectURL(old.url)
    const photo = { angle, width: 0, height: 0, updatedAt: new Date().toISOString(), url: URL.createObjectURL(blob) }
    bucket(uid)[angle] = photo
    return { photo, warnings: [] }
  },
  async remove(uid, angle) {
    const old = bucket(uid)[angle]
    if (old) URL.revokeObjectURL(old.url)
    delete bucket(uid)[angle]
  },
  async removeAll(uid) {
    Object.keys(bucket(uid)).forEach((a) => this.remove(uid, a))
  },
}

export const photosService = USE_MOCK ? mock : remote

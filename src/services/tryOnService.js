import { USE_MOCK, apiClient, delay } from './apiClient'
import { dataUriToPngBlob } from '../utils/image'

// The try-on API. The REAL service talks to the Express backend, which owns the AI provider and its
// API key (never put a provider key in the frontend). Jobs are asynchronous: start, then poll get().
// Every job looks like: { id, status, stage, progress, category, size, product, fit, saved, provider,
// error, imageUrl, createdAt } with status queued | processing | succeeded | failed | cancelled.

const imageUrl = (job) => (job.imageUrl ? `${apiClient.defaults.baseURL}/try-on/${job.id}/image` : null)
const withImage = (job) => ({ ...job, imageUrl: imageUrl(job) })

const remote = {
  async config() {
    const { data } = await apiClient.get('/try-on/config')
    return data
  },

  // product: { id, name, brand, sourceSite, productUrl, image, category }. userImageUrl is unused here:
  // the server uses the photo you already uploaded.
  async start({ product, size, angle = 'front', confirmExternal = false, fit }) {
    const form = new FormData()
    form.append('size', size)
    form.append('category', product.category)
    form.append('angle', angle)
    form.append('confirmExternal', String(confirmExternal))
    form.append('product', JSON.stringify({ id: product.id, name: product.name, brand: product.brand ?? '', sourceSite: product.sourceSite ?? '', productUrl: /^https?:/.test(product.productUrl ?? '') ? product.productUrl : null }))
    if (fit) form.append('fit', JSON.stringify(fit))
    if (/^data:/.test(product.image ?? '')) form.append('productImage', await dataUriToPngBlob(product.image), 'product.png')
    else if (/^https?:/.test(product.image ?? '')) form.append('productImageUrl', product.image)
    const { data } = await apiClient.post('/try-on', form, { timeout: 60000 })
    return withImage(data.job)
  },
  async get(id) {
    const { data } = await apiClient.get(`/try-on/${id}`)
    return withImage(data.job)
  },
  async cancel(id) {
    const { data } = await apiClient.post(`/try-on/${id}/cancel`)
    return withImage(data.job)
  },
  async save(id, saved) {
    const { data } = await apiClient.post(`/try-on/${id}/save`, { saved })
    return withImage(data.job)
  },
  async remove(id) {
    await apiClient.delete(`/try-on/${id}`)
  },
  async list() {
    const { data } = await apiClient.get('/try-on')
    return data.results.map(withImage)
  },
  async removeAll() {
    await apiClient.delete('/try-on')
  },
}

// DEMO MODE (VITE_USE_MOCK=true): builds a labelled side-by-side picture in the browser and keeps
// results in memory only. No AI, nothing leaves the browser.
const jobs = new Map()
const DURATION_MS = 2500

async function loadImg(src) {
  return new Promise((resolve) => {
    const i = new Image()
    i.crossOrigin = 'anonymous'
    i.onload = () => resolve(i)
    i.onerror = () => resolve(null)
    i.src = src
  })
}

async function composite(userImageUrl, productImage, size) {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 1200; canvas.height = 1250
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('no canvas')
    ctx.fillStyle = '#f4f6f8'; ctx.fillRect(0, 0, 1200, 1250)
    const person = userImageUrl && (await loadImg(userImageUrl))
    if (person) {
      const s = Math.max(700 / person.width, 1250 / person.height)
      ctx.drawImage(person, (700 - person.width * s) / 2, (1250 - person.height * s) / 2, person.width * s, person.height * s)
    }
    ctx.fillStyle = '#fff'; ctx.fillRect(720, 110, 420, 540)
    const garment = productImage && (await loadImg(productImage))
    if (garment) {
      const s = Math.min(380 / garment.width, 500 / garment.height)
      ctx.drawImage(garment, 740 + (380 - garment.width * s) / 2, 130 + (500 - garment.height * s) / 2, garment.width * s, garment.height * s)
    }
    ctx.fillStyle = '#1b1f2a'; ctx.fillRect(720, 690, 190, 64)
    ctx.fillStyle = '#f5c518'; ctx.font = 'bold 30px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(`Size ${size}`, 815, 732)
    ctx.fillStyle = '#fdf3c4'; ctx.fillRect(720, 1050, 420, 120)
    ctx.fillStyle = '#1b1f2a'; ctx.font = 'bold 26px sans-serif'; ctx.fillText('SIMULATED PREVIEW', 930, 1096)
    ctx.font = '20px sans-serif'; ctx.fillText('Not an AI try-on', 930, 1136)
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.9))
    if (blob) return URL.createObjectURL(blob)
  } catch {
    /* fall through */
  }
  return null
}

const snapshot = (j) => {
  const elapsed = Date.now() - j.startedAt
  const status = j.status === 'cancelled' ? 'cancelled' : elapsed >= DURATION_MS ? 'succeeded' : 'processing'
  const progress = status === 'succeeded' ? 100 : Math.min(95, Math.round((elapsed / DURATION_MS) * 100))
  const stage = status === 'succeeded' ? 'Done' : progress < 35 ? 'Preparing your photo' : progress < 70 ? 'Preparing the product image' : 'Building the preview'
  return { ...j.base, status, progress, stage, saved: j.saved, imageUrl: status === 'succeeded' ? j.url ?? 'about:blank' : null, error: null }
}

const mock = {
  async config() {
    return { provider: { id: 'simulated', name: 'Simulated preview (demo mode)', external: false, simulated: true }, supportedCategories: ['topwear', 'bottomwear'] }
  },
  async start({ product, size, fit, userImageUrl }) {
    await delay(300)
    if (!userImageUrl) throw Object.assign(new Error('Add a front photo first.'), { code: 'photo_required' })
    const id = `mock_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
    const j = {
      startedAt: Date.now(), saved: false, url: null,
      base: { id, category: product.category, size, angle: 'front', product: { id: product.id, name: product.name, brand: product.brand ?? '', sourceSite: product.sourceSite ?? '', productUrl: product.productUrl ?? null }, fit: fit ?? null, provider: { id: 'simulated', name: 'Simulated preview (demo mode)', simulated: true }, createdAt: new Date().toISOString() },
    }
    jobs.set(id, j)
    composite(userImageUrl, product.image, size).then((u) => { j.url = u })
    return snapshot(j)
  },
  async get(id) {
    const j = jobs.get(id)
    if (!j) throw Object.assign(new Error('That try-on result was not found.'), { status: 404 })
    return snapshot(j)
  },
  async cancel(id) { const j = jobs.get(id); if (j) j.status = 'cancelled'; return snapshot(j) },
  async save(id, saved) { const j = jobs.get(id); j.saved = saved; return snapshot(j) },
  async remove(id) { jobs.delete(id) },
  async list() { return [...jobs.values()].map(snapshot).filter((j) => j.status === 'succeeded').reverse() },
  async removeAll() { jobs.clear() },
}

export const tryOnService = USE_MOCK ? mock : remote

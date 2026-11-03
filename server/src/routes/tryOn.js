import { Router } from 'express'
import multer from 'multer'
import sharp from 'sharp'
import crypto from 'node:crypto'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import { HttpError } from '../utils/errors.js'
import { CONSENT_VERSION } from './photos.js'
import { angleSchema } from '../schemas.js'
import { AnalyzeError, STATUS_FOR_CODE } from '../analyzer/errors.js'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 6 * 1024 * 1024, files: 1 } })
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false,
  keyGenerator: (req) => req.user.id,
  message: { code: 'rate_limited', message: 'You have created a lot of previews. Please try again later.' },
})

const httpUrl = z.string().max(2048).refine((u) => /^https?:\/\//i.test(u), 'Must be an http(s) link').nullable().optional()
const productSchema = z.object({
  id: z.string().max(80), name: z.string().min(1).max(120), brand: z.string().max(80).optional().default(''),
  sourceSite: z.string().max(60).optional().default(''), productUrl: httpUrl,
})
// A snapshot of the size recommendation shown with the result. Informational only: nothing trusts it.
const fitSchema = z.object({
  recommendedSize: z.string().max(12).nullable(),
  confidence: z.number().min(0).max(100),
  confidenceLabel: z.string().max(10).optional(),
  explanation: z.string().max(700),
  status: z.string().max(20),
  measurementsUsed: z.union([z.record(z.string().max(30), z.number()), z.array(z.string().max(30)).max(10)]).optional(),
  reasons: z.array(z.object({ tone: z.string().max(10).optional(), text: z.string().max(400) })).max(12).optional().default([]),
  fitPreference: z.string().max(10).optional(),
  selectedNote: z.string().max(300).optional(),
}).nullable()
const metaSchema = z.object({
  category: z.enum(['topwear', 'bottomwear', 'shoes', 'headwear']),
  size: z.string().min(1).max(12),
  angle: angleSchema.default('front'),
  confirmExternal: z.string().optional(),
})

function parseJsonField(value, label) {
  if (value == null || value === '') return null
  try {
    return JSON.parse(value)
  } catch {
    throw new HttpError(400, `${label} is not valid JSON.`, 'invalid_request')
  }
}

const now = () => new Date().toISOString()

// Jobs left running by a server restart can never finish. Mark them failed so nobody waits forever.
export function failInterrupted(db) {
  return db.prepare("UPDATE tryon_jobs SET status = 'failed', error_code = 'interrupted', error_message = 'The server restarted while this was running. Please try again.', updated_at = ? WHERE status IN ('queued', 'processing')").run(now()).changes
}

// Unsaved results are temporary: removed after `hours` (default 24). Saved ones stay until deleted.
export async function cleanupExpired(db, storage, hours = 24) {
  const cutoff = new Date(Date.now() - hours * 3600 * 1000).toISOString()
  const rows = db.prepare("SELECT id, result_key FROM tryon_jobs WHERE saved = 0 AND status NOT IN ('queued', 'processing') AND created_at < ?").all(cutoff)
  for (const { id, result_key } of rows) {
    if (result_key) await storage.remove(result_key)
    db.prepare('DELETE FROM tryon_jobs WHERE id = ?').run(id)
  }
  return rows.length
}

export function tryOnRouter(db, storage, { provider, fetchImage }) {
  const router = Router()
  router.use(requireAuth(db))

  const q = {
    consent: db.prepare('SELECT version FROM photo_consents WHERE user_id = ?'),
    photo: db.prepare('SELECT storage_key FROM photos WHERE user_id = ? AND angle = ?'),
    active: db.prepare("SELECT id FROM tryon_jobs WHERE user_id = ? AND status IN ('queued', 'processing')"),
    insert: db.prepare(`INSERT INTO tryon_jobs (id, user_id, status, provider, category, size, angle, product, fit, created_at, updated_at)
      VALUES (@id, @user_id, 'queued', @provider, @category, @size, @angle, @product, @fit, @now, @now)`),
    get: db.prepare('SELECT * FROM tryon_jobs WHERE id = ? AND user_id = ?'),
    status: db.prepare('SELECT status FROM tryon_jobs WHERE id = ?'),
    progress: db.prepare("UPDATE tryon_jobs SET status = 'processing', stage = ?, progress = ?, updated_at = ? WHERE id = ? AND status IN ('queued', 'processing')"),
    succeed: db.prepare("UPDATE tryon_jobs SET status = 'succeeded', stage = 'Done', progress = 100, result_key = ?, updated_at = ? WHERE id = ? AND status IN ('queued', 'processing')"),
    fail: db.prepare("UPDATE tryon_jobs SET status = 'failed', error_code = ?, error_message = ?, updated_at = ? WHERE id = ? AND status IN ('queued', 'processing')"),
    cancel: db.prepare("UPDATE tryon_jobs SET status = 'cancelled', updated_at = ? WHERE id = ? AND user_id = ? AND status IN ('queued', 'processing')"),
    list: db.prepare("SELECT * FROM tryon_jobs WHERE user_id = ? AND status = 'succeeded' ORDER BY created_at DESC LIMIT 50"),
    listSaved: db.prepare("SELECT * FROM tryon_jobs WHERE user_id = ? AND status = 'succeeded' AND saved = 1 ORDER BY created_at DESC LIMIT 50"),
    setSaved: db.prepare("UPDATE tryon_jobs SET saved = ?, updated_at = ? WHERE id = ? AND user_id = ? AND status = 'succeeded'"),
    del: db.prepare('DELETE FROM tryon_jobs WHERE id = ? AND user_id = ?'),
    keys: db.prepare('SELECT result_key FROM tryon_jobs WHERE user_id = ? AND result_key IS NOT NULL'),
    delAll: db.prepare("DELETE FROM tryon_jobs WHERE user_id = ? AND status NOT IN ('queued', 'processing')"),
  }

  const publicProvider = { id: provider.id, name: provider.name, external: Boolean(provider.external), simulated: provider.id === 'simulated' }
  const toPublic = (r) => ({
    id: r.id, status: r.status, stage: r.stage, progress: r.progress, category: r.category, size: r.size, angle: r.angle,
    product: JSON.parse(r.product), fit: r.fit ? JSON.parse(r.fit) : null, saved: Boolean(r.saved), createdAt: r.created_at,
    error: r.status === 'failed' ? { code: r.error_code, message: r.error_message } : null,
    imageUrl: r.status === 'succeeded' ? `/api/try-on/${r.id}/image` : null,
    provider: publicProvider,
  })

  async function runJob({ id, person, garment, category, size, productName }) {
    const shouldStop = () => q.status.get(id)?.status === 'cancelled'
    try {
      const out = await provider.generate({
        person, garment, category, size, productName, shouldStop,
        report: (stage, progress) => { q.progress.run(stage, progress, now(), id) },
      })
      if (!out || shouldStop()) return
      const final = await sharp(out).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer()
      const key = `tryon/${id}.jpg`
      await storage.put(key, final)
      if (shouldStop()) { await storage.remove(key); return }
      q.succeed.run(key, now(), id)
    } catch (err) {
      // Only our own provider errors carry a message that is safe to show. Anything else stays in the log.
      console.error('[try-on]', id, err.message)
      const safe = ['provider_error', 'timeout'].includes(err.code)
      q.fail.run(safe ? err.code : 'provider_error', safe ? err.message : 'The preview could not be created. Please try again.', now(), id)
    }
  }

  router.get('/config', (_req, res) => {
    res.json({ provider: publicProvider, supportedCategories: provider.supportedCategories })
  })

  router.post('/', limiter, upload.single('productImage'), async (req, res) => {
    const meta = metaSchema.parse(req.body)
    const product = productSchema.parse(parseJsonField(req.body.product, 'product') ?? {})
    const fit = fitSchema.parse(parseJsonField(req.body.fit, 'fit'))

    if (!provider.supportedCategories.includes(meta.category)) {
      throw new HttpError(400, 'Try-on previews are only available for tops and bottoms right now.', 'unsupported_category')
    }
    if (provider.external && meta.confirmExternal !== 'true') {
      throw new HttpError(400, `Please confirm that your photo may be sent to ${provider.name}.`, 'confirmation_required')
    }
    const consent = q.consent.get(req.user.id)
    if (!consent || consent.version !== CONSENT_VERSION) throw new HttpError(403, 'Please give photo consent first.', 'consent_required')
    const photo = q.photo.get(req.user.id, meta.angle)
    if (!photo) throw new HttpError(409, `Add your ${meta.angle} photo first.`, 'photo_required')
    if (q.active.get(req.user.id)) throw new HttpError(409, 'A preview is already being created. Wait for it to finish or cancel it.', 'job_in_progress')

    // Product image: an uploaded file, or a link fetched through the SSRF-safe downloader.
    let garmentRaw = req.file?.buffer
    const imageUrl = typeof req.body.productImageUrl === 'string' ? req.body.productImageUrl.trim() : ''
    if (!garmentRaw && imageUrl) {
      try {
        garmentRaw = await fetchImage(imageUrl)
      } catch (err) {
        if (err instanceof AnalyzeError) throw new HttpError(STATUS_FOR_CODE[err.code] ?? 422, `Could not use the product image: ${err.message}`, err.code)
        throw err
      }
    }
    if (!garmentRaw) throw new HttpError(400, 'A product image is required.', 'product_image_required')

    // Only raster pictures are accepted. SVG is refused because it can reference other files.
    let garment
    try {
      const info = await sharp(garmentRaw, { limitInputPixels: 40_000_000 }).metadata()
      if (!['jpeg', 'png', 'webp'].includes(info.format)) throw new Error('format')
      garment = await sharp(garmentRaw, { limitInputPixels: 40_000_000 }).rotate().resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true }).png().toBuffer()
    } catch {
      throw new HttpError(422, 'The product image must be a JPG, PNG or WEBP picture.', 'product_image_invalid')
    }
    const person = await storage.get(photo.storage_key)
    if (!person) throw new HttpError(409, `Add your ${meta.angle} photo first.`, 'photo_required')

    const id = crypto.randomUUID()
    q.insert.run({ id, user_id: req.user.id, provider: provider.id, category: meta.category, size: meta.size, angle: meta.angle, product: JSON.stringify(product), fit: fit ? JSON.stringify(fit) : null, now: now() })
    runJob({ id, person, garment, category: meta.category, size: meta.size, productName: product.name })
    res.status(202).json({ job: toPublic(q.get.get(id, req.user.id)) })
  })

  router.get('/', (req, res) => {
    const rows = req.query.saved === 'true' ? q.listSaved.all(req.user.id) : q.list.all(req.user.id)
    res.json({ results: rows.map(toPublic) })
  })

  router.get('/:id', (req, res) => {
    const row = q.get.get(req.params.id, req.user.id)
    if (!row) throw new HttpError(404, 'That preview was not found.')
    res.json({ job: toPublic(row) })
  })

  router.get('/:id/image', async (req, res) => {
    const row = q.get.get(req.params.id, req.user.id)
    const bytes = row?.result_key && (await storage.get(row.result_key))
    if (!bytes) throw new HttpError(404, 'That preview was not found.')
    res.set({ 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, no-store' })
    res.send(bytes)
  })

  router.post('/:id/save', (req, res) => {
    const { saved } = z.object({ saved: z.boolean() }).parse(req.body)
    if (!q.setSaved.run(saved ? 1 : 0, now(), req.params.id, req.user.id).changes) throw new HttpError(404, 'That preview was not found.')
    res.json({ job: toPublic(q.get.get(req.params.id, req.user.id)) })
  })

  router.post('/:id/cancel', (req, res) => {
    q.cancel.run(now(), req.params.id, req.user.id)
    const row = q.get.get(req.params.id, req.user.id)
    if (!row) throw new HttpError(404, 'That preview was not found.')
    res.json({ job: toPublic(row) })
  })

  router.delete('/:id', async (req, res) => {
    const row = q.get.get(req.params.id, req.user.id)
    if (!row) throw new HttpError(404, 'That preview was not found.')
    if (['queued', 'processing'].includes(row.status)) q.cancel.run(now(), row.id, req.user.id)
    else {
      if (row.result_key) await storage.remove(row.result_key)
      q.del.run(row.id, req.user.id)
    }
    res.json({ ok: true })
  })

  router.delete('/', async (req, res) => {
    for (const { result_key } of q.keys.all(req.user.id)) await storage.remove(result_key)
    q.delAll.run(req.user.id)
    res.json({ ok: true })
  })

  return router
}

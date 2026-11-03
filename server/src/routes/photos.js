import { Router } from 'express'
import multer from 'multer'
import crypto from 'node:crypto'
import rateLimit from 'express-rate-limit'
import { angleSchema, consentSchema } from '../schemas.js'
import { requireAuth } from '../middleware/auth.js'
import { HttpError } from '../utils/errors.js'
import { processPhoto } from '../services/imageProcessing.js'

// Bump this when the consent wording or data use changes: everyone is asked again.
export const CONSENT_VERSION = '2026-10-v1'

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many uploads. Please try again later.' },
})

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 } })

export function photosRouter(db, storage) {
  const router = Router()
  router.use(requireAuth(db))

  const getConsent = db.prepare('SELECT version, granted_at FROM photo_consents WHERE user_id = ?')
  const setConsent = db.prepare(`
    INSERT INTO photo_consents (user_id, version, granted_at) VALUES (?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET version = excluded.version, granted_at = excluded.granted_at`)
  const clearConsent = db.prepare('DELETE FROM photo_consents WHERE user_id = ?')
  const listPhotos = db.prepare('SELECT angle, width, height, updated_at FROM photos WHERE user_id = ?')
  const getPhoto = db.prepare('SELECT * FROM photos WHERE user_id = ? AND angle = ?')
  const upsertPhoto = db.prepare(`
    INSERT INTO photos (id, user_id, angle, storage_key, width, height, bytes, updated_at)
    VALUES (@id, @user_id, @angle, @storage_key, @width, @height, @bytes, @updated_at)
    ON CONFLICT(user_id, angle) DO UPDATE SET id = excluded.id, storage_key = excluded.storage_key,
      width = excluded.width, height = excluded.height, bytes = excluded.bytes, updated_at = excluded.updated_at`)
  const deletePhotoRow = db.prepare('DELETE FROM photos WHERE user_id = ? AND angle = ?')
  const deleteAllRows = db.prepare('DELETE FROM photos WHERE user_id = ?')
  const allPhotoRows = db.prepare('SELECT storage_key FROM photos WHERE user_id = ?')

  const consentFor = (userId) => {
    const row = getConsent.get(userId)
    // Consent given under an older version no longer counts.
    const granted = Boolean(row && row.version === CONSENT_VERSION)
    return { granted, grantedAt: granted ? row.granted_at : null, version: CONSENT_VERSION }
  }
  const publicPhoto = (r) => ({ angle: r.angle, width: r.width, height: r.height, updatedAt: r.updated_at })

  // Files first, then rows: if a file delete fails the rows remain, so the user can retry.
  const deleteAllPhotos = async (userId) => {
    for (const { storage_key } of allPhotoRows.all(userId)) await storage.remove(storage_key)
    deleteAllRows.run(userId)
  }

  router.get('/', (req, res) => {
    res.json({ consent: consentFor(req.user.id), photos: listPhotos.all(req.user.id).map(publicPhoto) })
  })

  router.post('/consent', async (req, res) => {
    const { granted } = consentSchema.parse(req.body)
    if (granted) {
      setConsent.run(req.user.id, CONSENT_VERSION, new Date().toISOString())
    } else {
      // Withdrawing consent permanently deletes every stored photo.
      await deleteAllPhotos(req.user.id)
      clearConsent.run(req.user.id)
    }
    res.json({ consent: consentFor(req.user.id) })
  })

  router.delete('/', async (req, res) => {
    await deleteAllPhotos(req.user.id)
    res.json({ ok: true })
  })

  router.put('/:angle', uploadLimiter, upload.single('photo'), async (req, res) => {
    const angle = angleSchema.parse(req.params.angle)
    if (!consentFor(req.user.id).granted) {
      throw new HttpError(403, 'Please give consent before uploading photos.')
    }
    if (!req.file) throw new HttpError(400, 'No photo received.')

    const processed = await processPhoto(req.file.buffer)
    const id = crypto.randomUUID()
    const storageKey = `${req.user.id}/${id}.jpg`
    await storage.put(storageKey, processed.data)

    const previous = getPhoto.get(req.user.id, angle)
    const row = {
      id, user_id: req.user.id, angle, storage_key: storageKey,
      width: processed.width, height: processed.height, bytes: processed.data.length,
      updated_at: new Date().toISOString(),
    }
    upsertPhoto.run(row)
    if (previous) await storage.remove(previous.storage_key).catch(() => {})

    res.json({ photo: publicPhoto(row), warnings: processed.warnings })
  })

  router.get('/:angle/image', async (req, res) => {
    const angle = angleSchema.parse(req.params.angle)
    const row = getPhoto.get(req.user.id, angle)
    const bytes = row && (await storage.get(row.storage_key))
    if (!bytes) throw new HttpError(404, 'Photo not found.')
    res.set({ 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, no-store' })
    res.send(bytes)
  })

  router.delete('/:angle', async (req, res) => {
    const angle = angleSchema.parse(req.params.angle)
    const row = getPhoto.get(req.user.id, angle)
    if (row) {
      await storage.remove(row.storage_key)
      deletePhotoRow.run(req.user.id, angle)
    }
    res.json({ ok: true })
  })

  return router
}


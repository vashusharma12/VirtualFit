import { Router } from 'express'
import bcrypt from 'bcryptjs'
import rateLimit from 'express-rate-limit'
import { deleteAccountSchema } from '../schemas.js'
import { clearSession, requireAuth } from '../middleware/auth.js'
import { HttpError } from '../utils/errors.js'

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false,
  keyGenerator: (req) => req.user.id,
  message: { code: 'rate_limited', message: 'Too many attempts. Please wait a few minutes.' },
})

export function accountRouter(db, storage, { verifyGoogle = null } = {}) {
  const router = Router()
  router.use(requireAuth(db))

  router.get('/export', (req, res) => {
    const id = req.user.id
    const account = db.prepare('SELECT name, email, created_at FROM users WHERE id = ?').get(id)
    const data = db.prepare('SELECT data, updated_at FROM user_data WHERE user_id = ?').get(id)
    const consent = db.prepare('SELECT version, granted_at FROM photo_consents WHERE user_id = ?').get(id)
    const photos = db.prepare('SELECT angle, width, height, updated_at FROM photos WHERE user_id = ?').all(id)
    const results = db.prepare("SELECT id, category, size, product, saved, created_at FROM tryon_jobs WHERE user_id = ? AND status = 'succeeded'").all(id)
    res.set({ 'Content-Disposition': 'attachment; filename="virtualfit-my-data.json"', 'Cache-Control': 'no-store' })
    res.json({
      exportedAt: new Date().toISOString(),
      note: 'Your text data. Photos and generated images are not included in this file; you can download or delete them in the app.',
      account: { name: account.name, email: account.email, createdAt: account.created_at },
      profileAndMeasurements: data ? JSON.parse(data.data) : null,
      photoConsent: consent ? { grantedAt: consent.granted_at, version: consent.version } : null,
      photos: photos.map((p) => ({ angle: p.angle, width: p.width, height: p.height, updatedAt: p.updated_at })),
      tryOnResults: results.map((r) => ({ id: r.id, category: r.category, size: r.size, product: JSON.parse(r.product), saved: Boolean(r.saved), createdAt: r.created_at })),
    })
  })

  // Permanently deletes the account, every stored file, and all rows. Needs your password, or (for an account
  // that signs in with Google) a fresh Google credential proving it is still you.
  router.delete('/', limiter, async (req, res) => {
    const { password, credential } = deleteAccountSchema.parse(req.body)
    const row = db.prepare('SELECT password_hash, google_sub FROM users WHERE id = ?').get(req.user.id)
    if (credential) {
      let g = null
      try {
        g = verifyGoogle ? await verifyGoogle(credential) : null
      } catch {
        g = null
      }
      if (!g || !row.google_sub || g.sub !== row.google_sub) throw new HttpError(403, 'Google could not confirm that this is your account.', 'wrong_credential')
    } else if (!(await bcrypt.compare(password, row.password_hash))) {
      throw new HttpError(403, 'That password is not correct.', 'wrong_password')
    }

    const keys = [
      ...db.prepare('SELECT storage_key AS k FROM photos WHERE user_id = ?').all(req.user.id),
      ...db.prepare('SELECT result_key AS k FROM tryon_jobs WHERE user_id = ? AND result_key IS NOT NULL').all(req.user.id),
    ]
    // Files first: if one cannot be removed the account stays, so nothing is orphaned and the user can retry.
    for (const { k } of keys) await storage.remove(k)
    db.prepare('DELETE FROM users WHERE id = ?').run(req.user.id) // cascades to every table
    clearSession(res)
    res.json({ ok: true })
  })

  return router
}

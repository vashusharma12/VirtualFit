import { Router } from 'express'
import { userDataSchema } from '../schemas.js'
import { requireAuth } from '../middleware/auth.js'

export function profileRouter(db) {
  const router = Router()
  router.use(requireAuth(db))

  const get = db.prepare('SELECT data, updated_at FROM user_data WHERE user_id = ?')
  const upsert = db.prepare(`
    INSERT INTO user_data (user_id, data, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
  `)

  router.get('/', (req, res) => {
    const row = get.get(req.user.id)
    res.json({ data: row ? JSON.parse(row.data) : null, updatedAt: row?.updated_at ?? null })
  })

  router.put('/', (req, res) => {
    const data = userDataSchema.parse(req.body)
    upsert.run(req.user.id, JSON.stringify(data))
    res.json({ ok: true })
  })

  return router
}

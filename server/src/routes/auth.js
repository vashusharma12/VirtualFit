import { Router } from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import rateLimit from 'express-rate-limit'
import { googleSchema, loginSchema, signupSchema } from '../schemas.js'
import { HttpError } from '../utils/errors.js'
import { NO_PASSWORD, clearSession, issueSession, requireAuth } from '../middleware/auth.js'

const BCRYPT_COST = 12
// Compared against when the email is unknown, so login takes the same time either way.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_COST)

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please wait a few minutes and try again.' },
})

export function authRouter(db, { googleClientId = '', verifyGoogle = null } = {}) {
  const router = Router()
  const byEmail = db.prepare('SELECT * FROM users WHERE email = ?')
  const insert = db.prepare('INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)')
  const bySub = db.prepare('SELECT * FROM users WHERE google_sub = ?')
  const insertGoogle = db.prepare('INSERT INTO users (id, name, email, password_hash, google_sub) VALUES (?, ?, ?, ?, ?)')
  const link = db.prepare('UPDATE users SET google_sub = ?, password_hash = ? WHERE id = ?')
  const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, hasPassword: (u.password_hash ?? 'x') !== NO_PASSWORD, google: Boolean(u.google_sub) })
  const displayName = (name, email) => {
    const n = String(name ?? '').trim().slice(0, 60)
    return n.length >= 2 ? n : email.split('@')[0].slice(0, 60).padEnd(2, '_')
  }

  // Tells the web app whether to show the "Continue with Google" button (only the public client id).
  router.get('/config', (_req, res) => {
    res.json({ googleClientId: verifyGoogle && googleClientId ? googleClientId : null })
  })

  router.post('/google', authLimiter, async (req, res) => {
    if (!verifyGoogle) throw new HttpError(503, 'Google sign-in is not set up on this server.', 'google_not_configured')
    const { credential } = googleSchema.parse(req.body)
    let g
    try {
      g = await verifyGoogle(credential)
    } catch {
      throw new HttpError(401, 'Google sign-in could not be verified. Please try again.', 'google_invalid')
    }
    if (g?.email) g = { ...g, email: String(g.email).trim().toLowerCase() } // never trust the casing we were handed
    if (!g?.sub || !g.email || !g.emailVerified) {
      throw new HttpError(401, 'Your Google email address is not verified.', 'google_email_unverified')
    }

    let user = bySub.get(g.sub)
    let isNew = false
    let linked = false
    if (!user) {
      const existing = byEmail.get(g.email)
      if (existing) {
        if (existing.google_sub) throw new HttpError(409, 'That email is already connected to a different Google account.', 'google_conflict')
        // Google has proved this person owns the email. A password account made with that email was never
        // verified, so its password is removed: otherwise whoever registered it first could still get in.
        link.run(g.sub, NO_PASSWORD, existing.id)
        user = { ...existing, google_sub: g.sub, password_hash: NO_PASSWORD }
        linked = true
      } else {
        const id = crypto.randomUUID()
        const name = displayName(g.name, g.email)
        insertGoogle.run(id, name, g.email, NO_PASSWORD, g.sub)
        user = { id, name, email: g.email, password_hash: NO_PASSWORD, google_sub: g.sub }
        isNew = true
      }
    }
    issueSession(res, user.id)
    res.status(isNew ? 201 : 200).json({ user: publicUser(user), isNew, linked })
  })

  router.post('/signup', authLimiter, async (req, res) => {
    const { name, email, password } = signupSchema.parse(req.body)
    if (byEmail.get(email)) throw new HttpError(409, 'An account with this email already exists. Try logging in.')
    const user = { id: crypto.randomUUID(), name, email, password_hash: await bcrypt.hash(password, BCRYPT_COST) }
    try {
      insert.run(user.id, user.name, user.email, user.password_hash)
    } catch (err) {
      if (String(err.code).startsWith('SQLITE_CONSTRAINT')) {
        throw new HttpError(409, 'An account with this email already exists. Try logging in.')
      }
      throw err
    }
    issueSession(res, user.id)
    res.status(201).json({ user: publicUser(user) })
  })

  router.post('/login', authLimiter, async (req, res) => {
    const { email, password } = loginSchema.parse(req.body)
    const user = byEmail.get(email)
    const ok = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH)
    if (!user || !ok) throw new HttpError(401, 'Incorrect email or password.')
    issueSession(res, user.id)
    res.json({ user: publicUser(user) })
  })

  router.post('/logout', (_req, res) => {
    clearSession(res)
    res.json({ ok: true })
  })

  router.get('/me', requireAuth(db), (req, res) => {
    res.json({ user: req.user })
  })

  return router
}

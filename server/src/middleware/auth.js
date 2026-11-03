import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { HttpError } from '../utils/errors.js'

// Stored instead of a password hash for accounts that only use Google. It can never match a password.
export const NO_PASSWORD = '!'

export function issueSession(res, userId) {
  const token = jwt.sign({ sub: userId }, config.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: `${config.sessionDays}d`,
  })
  res.cookie(config.cookieName, token, {
    httpOnly: true, // JavaScript cannot read the session token
    sameSite: 'lax',
    secure: config.isProd,
    maxAge: config.sessionDays * 24 * 60 * 60 * 1000,
    path: '/',
  })
}

export function clearSession(res) {
  res.clearCookie(config.cookieName, { httpOnly: true, sameSite: 'lax', secure: config.isProd, path: '/' })
}

export function requireAuth(db) {
  const findUser = db.prepare('SELECT id, name, email, password_hash, google_sub FROM users WHERE id = ?')
  return (req, _res, next) => {
    const token = req.cookies?.[config.cookieName]
    if (!token) throw new HttpError(401, 'Please log in to continue.')
    let payload
    try {
      payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] })
    } catch {
      throw new HttpError(401, 'Your session has expired. Please log in again.')
    }
    const user = findUser.get(payload.sub)
    if (!user) throw new HttpError(401, 'Your session has expired. Please log in again.')
    req.user = { id: user.id, name: user.name, email: user.email, hasPassword: user.password_hash !== NO_PASSWORD, google: Boolean(user.google_sub) }
    next()
  }
}

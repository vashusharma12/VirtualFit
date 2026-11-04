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
    httpOnly: true,
    sameSite: config.isProd ? 'none' : 'lax',
    secure: config.isProd,
    maxAge: config.sessionDays * 24 * 60 * 60 * 1000,
    path: '/',
  })
}

export function clearSession(res) {
  res.clearCookie(config.cookieName, {
    httpOnly: true,
    sameSite: config.isProd ? 'none' : 'lax',
    secure: config.isProd,
    path: '/',
  })
}


import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import Database from 'better-sqlite3'
import { openDb } from '../src/db.js'
import { createApp } from '../src/app.js'
import { createLocalStorage } from '../src/storage/localDisk.js'

// A stand-in for Google: the real verifier checks Google's signature, which needs a real client id.
const TOKENS = {
  'token-new-user-0000000000': { sub: 'g-1', email: 'Ria@Example.com', emailVerified: true, name: 'Ria Sharma' },
  'token-unverified-000000000': { sub: 'g-2', email: 'u@example.com', emailVerified: false, name: 'U' },
  'token-noname-000000000000': { sub: 'g-3', email: 'quiet@example.com', emailVerified: true, name: '' },
  'token-oneletter-000000000': { sub: 'g-4', email: 'x@example.com', emailVerified: true, name: 'X' },
  'token-link-me-00000000000': { sub: 'g-5', email: 'pw@example.com', emailVerified: true, name: 'Pat Word' },
  'token-other-google-000000': { sub: 'g-6', email: 'pw@example.com', emailVerified: true, name: 'Someone Else' },
  'token-stranger-0000000000': { sub: 'g-9', email: 'stranger@example.com', emailVerified: true, name: 'Stranger' },
}
const verifyGoogle = async (credential) => {
  if (!TOKENS[credential]) throw new Error('bad signature')
  return TOKENS[credential]
}
const stub = { provider: { id: 'x', name: 'x', external: false, supportedCategories: [] }, fetchImage: async () => null }
const servers = []
let on, off, dbOn

const listen = (app) => new Promise((resolve) => { const s = http.createServer(app); s.listen(0, '127.0.0.1', () => { servers.push(s); resolve(`http://127.0.0.1:${s.address().port}`) }) })
const call = async (base, method, url, body, cookie) => {
  const res = await fetch(`${base}/api${url}`, { method, headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined })
  return { status: res.status, data: await res.json().catch(() => null), cookie: res.headers.get('set-cookie')?.split(';')[0], raw: res.headers.get('set-cookie') }
}
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'vf-g-'))

before(async () => {
  dbOn = openDb(':memory:')
  on = await listen(createApp(dbOn, createLocalStorage(tmp()), async () => null, stub, undefined, { googleClientId: 'client-123.apps.googleusercontent.com', verifyGoogle }))
  off = await listen(createApp(openDb(':memory:'), createLocalStorage(tmp()), async () => null, stub, undefined, {}))
})
after(() => servers.forEach((s) => s.close()))

test('config: the public client id is offered only when Google sign-in is set up', async () => {
  assert.equal((await call(on, 'GET', '/auth/config')).data.googleClientId, 'client-123.apps.googleusercontent.com')
  assert.equal((await call(off, 'GET', '/auth/config')).data.googleClientId, null)
})

test('not configured: Google sign-in refuses cleanly', async () => {
  const r = await call(off, 'POST', '/auth/google', { credential: 'token-new-user-0000000000' })
  assert.equal(r.status, 503)
  assert.equal(r.data.code, 'google_not_configured')
})

test('a new Google user gets an account and a session; their email is lower-cased', async () => {
  const r = await call(on, 'POST', '/auth/google', { credential: 'token-new-user-0000000000' })
  assert.equal(r.status, 201)
  assert.equal(r.data.isNew, true)
  assert.equal(r.data.user.email, 'ria@example.com')
  assert.equal(r.data.user.name, 'Ria Sharma')
  assert.equal(r.data.user.google, true)
  assert.equal(r.data.user.hasPassword, false)
  assert.match(r.raw, /HttpOnly/, 'the session cookie is httpOnly like every other login')
  const me = await call(on, 'GET', '/auth/me', null, r.cookie)
  assert.equal(me.data.user.email, 'ria@example.com')
  assert.equal(me.data.user.hasPassword, false)
  assert.equal((await call(on, 'GET', '/profile', null, r.cookie)).status, 200, 'the session works everywhere')
})

test('signing in again with the same Google account is a login, not a duplicate', async () => {
  const a = await call(on, 'POST', '/auth/google', { credential: 'token-new-user-0000000000' })
  assert.equal(a.status, 200)
  assert.equal(a.data.isNew, false)
  const n = dbOn.prepare("SELECT COUNT(*) c FROM users WHERE email = 'ria@example.com'").get().c
  assert.equal(n, 1)
})

test('rejects: unverified email, an invalid token, a missing credential', async () => {
  const unverified = await call(on, 'POST', '/auth/google', { credential: 'token-unverified-000000000' })
  assert.equal(unverified.status, 401)
  assert.equal(unverified.data.code, 'google_email_unverified')
  const bad = await call(on, 'POST', '/auth/google', { credential: 'this-is-not-a-real-google-token' })
  assert.equal(bad.status, 401)
  assert.equal(bad.data.code, 'google_invalid')
  assert.equal((await call(on, 'POST', '/auth/google', {})).status, 400)
  assert.equal(dbOn.prepare("SELECT COUNT(*) c FROM users WHERE email = 'u@example.com'").get().c, 0, 'no account is created for a rejected token')
})

test('names: a missing or one-letter Google name falls back to something valid', async () => {
  assert.equal((await call(on, 'POST', '/auth/google', { credential: 'token-noname-000000000000' })).data.user.name, 'quiet')
  assert.ok((await call(on, 'POST', '/auth/google', { credential: 'token-oneletter-000000000' })).data.user.name.length >= 2)
})

test('an existing password account with the same email is linked, keeps its data, and its password stops working', async () => {
  const signup = await call(on, 'POST', '/auth/signup', { name: 'Pat Word', email: 'pw@example.com', password: 'secret123' })
  assert.equal(signup.status, 201)
  const profile = { profile: { name: 'Pat', genderPreference: 'men', bodyShape: null, savedProductIds: [], preferences: {} },
    measurements: { height: 170, weight: 70, chest: 96, waist: 82, hips: 98, shoulder: null, inseam: null, footLength: null, headCircumference: null, displayUnits: { length: 'cm', weight: 'kg' } }, sizeHistory: [], tryOnHistory: [] }
  assert.equal((await call(on, 'PUT', '/profile', profile, signup.cookie)).status, 200)

  const g = await call(on, 'POST', '/auth/google', { credential: 'token-link-me-00000000000' })
  assert.equal(g.status, 200)
  assert.equal(g.data.linked, true)
  assert.equal(g.data.user.id, signup.data.user.id, 'same account, so nothing is lost')
  const kept = await call(on, 'GET', '/profile', null, g.cookie)
  assert.equal(kept.data.data.measurements.chest, 96, 'measurements were kept')

  const pw = await call(on, 'POST', '/auth/login', { email: 'pw@example.com', password: 'secret123' })
  assert.equal(pw.status, 401, 'the old password no longer works: an unverified signup must not keep access to a Google-verified account')
  const again = await call(on, 'POST', '/auth/google', { credential: 'token-link-me-00000000000' })
  assert.equal(again.data.linked, false)
})

test('a DIFFERENT Google account with an already-linked email is refused', async () => {
  const r = await call(on, 'POST', '/auth/google', { credential: 'token-other-google-000000' })
  assert.equal(r.status, 409)
  assert.equal(r.data.code, 'google_conflict')
})

test('a Google-only account cannot be entered with a password, and the error reveals nothing', async () => {
  const r = await call(on, 'POST', '/auth/login', { email: 'ria@example.com', password: 'anything123' })
  assert.equal(r.status, 401)
  assert.equal(r.data.message, 'Incorrect email or password.')
  assert.equal((await call(on, 'POST', '/auth/signup', { name: 'Ria Again', email: 'ria@example.com', password: 'secret123' })).status, 409)
})

test('deleting a Google-only account needs a fresh Google credential for THAT account', async () => {
  const s = await call(on, 'POST', '/auth/google', { credential: 'token-stranger-0000000000' })
  assert.equal((await call(on, 'DELETE', '/account', {}, s.cookie)).status, 400, 'nothing to confirm with')
  const noPw = await call(on, 'DELETE', '/account', { password: 'whatever123' }, s.cookie)
  assert.equal(noPw.status, 403, 'a password cannot confirm an account that has none')
  const wrong = await call(on, 'DELETE', '/account', { credential: 'token-new-user-0000000000' }, s.cookie)
  assert.equal(wrong.status, 403)
  assert.equal(wrong.data.code, 'wrong_credential', "someone else's Google credential cannot delete this account")
  assert.equal((await call(on, 'GET', '/auth/me', null, s.cookie)).status, 200, 'still there after the failed attempts')
  const ok = await call(on, 'DELETE', '/account', { credential: 'token-stranger-0000000000' }, s.cookie)
  assert.equal(ok.status, 200)
  assert.equal(dbOn.prepare("SELECT COUNT(*) c FROM users WHERE email = 'stranger@example.com'").get().c, 0)
  assert.equal((await call(on, 'POST', '/auth/google', { credential: 'token-stranger-0000000000' })).data.isNew, true, 'the same Google account can start fresh afterwards')
})

test('password accounts still delete with their password', async () => {
  const s = await call(on, 'POST', '/auth/signup', { name: 'Dee Lete', email: 'dee@example.com', password: 'secret123' })
  assert.equal((await call(on, 'DELETE', '/account', { password: 'nope-nope-1' }, s.cookie)).status, 403)
  assert.equal((await call(on, 'DELETE', '/account', { password: 'secret123' }, s.cookie)).status, 200)
})

test('database upgrade: an old database without google_sub is migrated and keeps its users', () => {
  const file = path.join(tmp(), 'old.db')
  const old = new Database(file)
  old.exec("CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')))")
  old.prepare("INSERT INTO users (id, name, email, password_hash) VALUES ('u1', 'Old User', 'old@example.com', 'hash')").run()
  old.close()
  const db = openDb(file)
  assert.ok(db.prepare('PRAGMA table_info(users)').all().some((c) => c.name === 'google_sub'))
  assert.equal(db.prepare("SELECT name FROM users WHERE id = 'u1'").get().name, 'Old User')
  db.close()
  assert.doesNotThrow(() => openDb(file).close(), 'opening an already-upgraded database is fine')
})

test('two accounts can never share a Google identity (database guarantee)', () => {
  const db = openDb(':memory:')
  const add = db.prepare("INSERT INTO users (id, name, email, password_hash, google_sub) VALUES (?, 'A B', ?, '!', ?)")
  add.run('a', 'a@example.com', 'same-sub')
  assert.throws(() => add.run('b', 'b@example.com', 'same-sub'))
  add.run('c', 'c@example.com', null)
  add.run('d', 'd@example.com', null) // many password-only accounts are fine
})

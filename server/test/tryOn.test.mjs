import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { openDb } from '../src/db.js'
import { createApp } from '../src/app.js'
import { createLocalStorage } from '../src/storage/localDisk.js'
import { createSimulatedProvider } from '../src/tryon/providers/simulated.js'
import { createReplicateProvider } from '../src/tryon/providers/replicate.js'
import { createImageFetcher } from '../src/analyzer/fetchPage.js'
import { cleanupExpired, failInterrupted } from '../src/routes/tryOn.js'

const servers = []
after(() => servers.forEach((s) => s.close()))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const listen = (server) => new Promise((r) => server.listen(0, '127.0.0.1', () => r(server.address().port)))

const svg = (w, h, color) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="${color}"/><circle cx="${w / 2}" cy="${h * 0.2}" r="${w * 0.1}" fill="#b98b6b"/><rect x="${w * 0.35}" y="${h * 0.3}" width="${w * 0.3}" height="${h * 0.4}" fill="#2f4b7c"/></svg>`)
const personJpg = await sharp(svg(900, 1400, '#d9d6d0')).jpeg().toBuffer()
const garmentPng = await sharp(svg(600, 750, '#ffffff')).png().toBuffer()

async function makeApp({ provider = createSimulatedProvider({ delayMs: 0 }), allowPrivate = true } = {}) {
  const db = openDb(':memory:')
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vf-tryon-'))
  const storage = createLocalStorage(dir)
  const fetchImage = createImageFetcher({ allowPrivate, userAgent: 'test' })
  const server = http.createServer(createApp(db, storage, async () => { throw new Error('unused') }, { provider, fetchImage }))
  const base = `http://127.0.0.1:${await listen(server)}`
  servers.push(server)
  return { base, db, storage, dir }
}

async function signup(base, email) {
  const res = await fetch(`${base}/api/auth/signup`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Test User', email, password: 'password1' }) })
  return res.headers.get('set-cookie').split(';')[0]
}
const api = (base, cookie) => async (method, url, body) => {
  const init = { method, headers: { cookie } }
  if (body instanceof FormData) init.body = body
  else if (body !== undefined) { init.headers['content-type'] = 'application/json'; init.body = JSON.stringify(body) }
  const res = await fetch(`${base}/api${url}`, init)
  const ct = res.headers.get('content-type') ?? ''
  return { status: res.status, data: ct.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer()), headers: res.headers }
}
async function withPhoto(call, angle = 'front') {
  await call('POST', '/photos/consent', { granted: true })
  const f = new FormData(); f.append('photo', new Blob([personJpg], { type: 'image/jpeg' }), 'p.jpg')
  const r = await call('PUT', `/photos/${angle}`, f)
  assert.equal(r.status, 200)
}
const form = (over = {}, { image = garmentPng, omitImage = false } = {}) => {
  const f = new FormData()
  f.append('size', over.size ?? 'M'); f.append('category', over.category ?? 'topwear')
  f.append('product', JSON.stringify({ id: 'p-004', name: 'Heavyweight Hoodie', brand: 'Indigo Lane', sourceSite: 'demo' }))
  f.append('fit', JSON.stringify({ recommendedSize: 'M', confidence: 92, confidenceLabel: 'High', explanation: 'Your chest fits.', status: 'ok', measurementsUsed: { chest: 96 }, reasons: [] }))
  if (over.confirmExternal) f.append('confirmExternal', over.confirmExternal)
  if (over.productImageUrl) f.append('productImageUrl', over.productImageUrl)
  if (over.angle) f.append('angle', over.angle)
  if (!omitImage && !over.productImageUrl) f.append('productImage', new Blob([image], { type: 'image/png' }), 'g.png')
  return f
}
async function waitStatus(call, id, want, ms = 5000) {
  const end = Date.now() + ms
  for (;;) {
    const r = await call('GET', `/try-on/${id}`)
    if (want.includes(r.data.job.status) || Date.now() > end) return r.data.job
    await sleep(20)
  }
}

test('config reports the provider honestly; login required', async () => {
  const { base } = await makeApp()
  assert.equal((await fetch(`${base}/api/try-on/config`)).status, 401)
  const call = api(base, await signup(base, 'a@x.com'))
  const r = await call('GET', '/try-on/config')
  assert.deepEqual(r.data.provider, { id: 'simulated', name: 'Simulated preview', external: false, simulated: true })
  assert.deepEqual(r.data.supportedCategories, ['topwear', 'bottomwear'])
})

test('preconditions: consent, photo, supported category, product image', async () => {
  const { base } = await makeApp()
  const call = api(base, await signup(base, 'a@x.com'))
  let r = await call('POST', '/try-on', form())
  assert.equal(r.data.code, 'consent_required')
  await call('POST', '/photos/consent', { granted: true })
  r = await call('POST', '/try-on', form())
  assert.equal(r.data.code, 'photo_required')
  await withPhoto(call)
  r = await call('POST', '/try-on', form({ category: 'shoes' }))
  assert.equal(r.status, 400); assert.equal(r.data.code, 'unsupported_category')
  r = await call('POST', '/try-on', form({}, { omitImage: true }))
  assert.equal(r.data.code, 'product_image_required')
  r = await call('POST', '/try-on', form({ angle: 'back' }))
  assert.equal(r.data.code, 'photo_required', 'the requested angle must exist')
})

test('happy path: queued -> processing -> succeeded, image is a real 1200x1250 JPEG', async () => {
  const { base } = await makeApp()
  const call = api(base, await signup(base, 'a@x.com'))
  await withPhoto(call)
  const created = await call('POST', '/try-on', form())
  assert.equal(created.status, 202)
  const job = await waitStatus(call, created.data.job.id, ['succeeded', 'failed'])
  assert.equal(job.status, 'succeeded')
  assert.equal(job.progress, 100)
  assert.equal(job.size, 'M')
  assert.equal(job.product.name, 'Heavyweight Hoodie')
  assert.equal(job.fit.confidence, 92)
  assert.equal(job.provider.simulated, true)
  assert.equal(job.imageUrl, `/api/try-on/${job.id}/image`)
  const img = await call('GET', `/try-on/${job.id}/image`)
  assert.equal(img.headers.get('content-type'), 'image/jpeg')
  assert.equal(img.headers.get('cache-control'), 'private, no-store')
  const meta = await sharp(img.data).metadata()
  assert.equal(meta.format, 'jpeg'); assert.equal(meta.width, 1200); assert.equal(meta.height, 1250)
  fs.writeFileSync('/tmp/tryon-sample.jpg', img.data)
})

test('progress is reported while processing', async () => {
  const { base } = await makeApp({ provider: createSimulatedProvider({ delayMs: 120 }) })
  const call = api(base, await signup(base, 'a@x.com'))
  await withPhoto(call)
  const created = await call('POST', '/try-on', form())
  const seen = new Set()
  for (let i = 0; i < 60; i++) {
    const j = (await call('GET', `/try-on/${created.data.job.id}`)).data.job
    if (j.status === 'processing') seen.add(j.stage)
    if (j.status === 'succeeded') break
    await sleep(25)
  }
  assert.ok(seen.size >= 2, `saw stages: ${[...seen].join(', ')}`)
})

test('only one active job per user; cancelling frees the slot and discards the result', async () => {
  const { base, dir } = await makeApp({ provider: createSimulatedProvider({ delayMs: 150 }) })
  const call = api(base, await signup(base, 'a@x.com'))
  await withPhoto(call)
  const first = await call('POST', '/try-on', form())
  const second = await call('POST', '/try-on', form())
  assert.equal(second.status, 409); assert.equal(second.data.code, 'job_in_progress')
  const cancelled = await call('POST', `/try-on/${first.data.job.id}/cancel`)
  assert.equal(cancelled.data.job.status, 'cancelled')
  await sleep(900)
  assert.equal((await call('GET', `/try-on/${first.data.job.id}`)).data.job.status, 'cancelled', 'stays cancelled')
  const tryonFiles = fs.existsSync(path.join(dir, 'tryon')) ? fs.readdirSync(path.join(dir, 'tryon'), { recursive: true }).filter((f) => String(f).endsWith('.jpg')) : []
  assert.equal(tryonFiles.length, 0, 'no result file left behind')
  assert.equal((await call('POST', '/try-on', form())).status, 202, 'a new job can start')
})

test('an EXTERNAL provider needs explicit confirmation every time', async () => {
  const external = { id: 'fake-ai', name: 'Fake AI', external: true, supportedCategories: ['topwear', 'bottomwear'], generate: async ({ person }) => person }
  const { base } = await makeApp({ provider: external })
  const call = api(base, await signup(base, 'a@x.com'))
  await withPhoto(call)
  assert.equal((await call('GET', '/try-on/config')).data.provider.external, true)
  let r = await call('POST', '/try-on', form())
  assert.equal(r.status, 400); assert.equal(r.data.code, 'confirmation_required'); assert.match(r.data.message, /Fake AI/)
  r = await call('POST', '/try-on', form({ confirmExternal: 'false' }))
  assert.equal(r.data.code, 'confirmation_required')
  r = await call('POST', '/try-on', form({ confirmExternal: 'true' }))
  assert.equal(r.status, 202)
})

test('provider failure shows a generic message and never leaks internals', async () => {
  const broken = { id: 'broken', name: 'Broken', external: false, supportedCategories: ['topwear'], generate: async () => { throw new Error('SECRET api key sk-123 exploded at 10.0.0.5') } }
  const { base } = await makeApp({ provider: broken })
  const call = api(base, await signup(base, 'a@x.com'))
  await withPhoto(call)
  const created = await call('POST', '/try-on', form())
  const job = await waitStatus(call, created.data.job.id, ['failed', 'succeeded'])
  assert.equal(job.status, 'failed')
  assert.equal(job.error.code, 'provider_error')
  assert.doesNotMatch(JSON.stringify(job), /SECRET|sk-123|10\.0\.0\.5/)
  assert.equal(job.imageUrl, null)
})

test('users cannot see or change each other\'s results', async () => {
  const { base } = await makeApp()
  const a = api(base, await signup(base, 'a@x.com'))
  const b = api(base, await signup(base, 'b@x.com'))
  await withPhoto(a)
  const created = await a('POST', '/try-on', form())
  const id = created.data.job.id
  await waitStatus(a, id, ['succeeded'])
  for (const [method, url, body] of [['GET', `/try-on/${id}`], ['GET', `/try-on/${id}/image`], ['POST', `/try-on/${id}/save`, { saved: true }], ['POST', `/try-on/${id}/cancel`], ['DELETE', `/try-on/${id}`]]) {
    assert.equal((await b(method, url, body)).status, 404, `${method} ${url}`)
  }
  assert.deepEqual((await b('GET', '/try-on')).data.results, [])
  assert.equal((await a('GET', `/try-on/${id}`)).status, 200, 'still intact for the owner')
})

test('save, list, saved filter, delete one, delete all', async () => {
  const { base, dir } = await makeApp()
  const call = api(base, await signup(base, 'a@x.com'))
  await withPhoto(call)
  const ids = []
  for (let i = 0; i < 2; i++) {
    const c = await call('POST', '/try-on', form({ size: i ? 'L' : 'M' }))
    ids.push(c.data.job.id)
    await waitStatus(call, c.data.job.id, ['succeeded'])
  }
  assert.equal((await call('GET', '/try-on')).data.results.length, 2)
  assert.equal((await call('POST', `/try-on/${ids[0]}/save`, { saved: true })).data.job.saved, true)
  assert.deepEqual((await call('GET', '/try-on?saved=true')).data.results.map((r) => r.id), [ids[0]])
  assert.equal((await call('DELETE', `/try-on/${ids[1]}`)).status, 200)
  assert.equal((await call('GET', `/try-on/${ids[1]}/image`)).status, 404)
  await call('DELETE', '/try-on')
  assert.equal((await call('GET', '/try-on')).data.results.length, 0)
  const left = fs.readdirSync(path.join(dir, 'tryon'), { recursive: true }).filter((f) => String(f).endsWith('.jpg'))
  assert.equal(left.length, 0, 'files are deleted with the records')
})

test('unsaved results expire; saved ones stay', async () => {
  const { base, db, storage } = await makeApp()
  const call = api(base, await signup(base, 'a@x.com'))
  await withPhoto(call)
  const keep = (await call('POST', '/try-on', form())).data.job.id
  await waitStatus(call, keep, ['succeeded'])
  await call('POST', `/try-on/${keep}/save`, { saved: true })
  const drop = (await call('POST', '/try-on', form())).data.job.id
  await waitStatus(call, drop, ['succeeded'])
  const old = new Date(Date.now() - 30 * 3600 * 1000).toISOString()
  db.prepare('UPDATE tryon_jobs SET created_at = ?').run(old)
  const removed = await cleanupExpired(db, storage, 24)
  assert.equal(removed, 1)
  assert.equal((await call('GET', `/try-on/${drop}`)).status, 404)
  assert.equal((await call('GET', `/try-on/${keep}`)).status, 200)
})

test('jobs interrupted by a restart are marked failed, not stuck', async () => {
  const { base, db } = await makeApp({ provider: createSimulatedProvider({ delayMs: 400 }) })
  const call = api(base, await signup(base, 'a@x.com'))
  await withPhoto(call)
  const id = (await call('POST', '/try-on', form())).data.job.id
  failInterrupted(db)
  const job = (await call('GET', `/try-on/${id}`)).data.job
  assert.equal(job.status, 'failed'); assert.equal(job.error.code, 'interrupted')
})

test('product image: from a URL (safe fetch), rejects bad formats, strict mode blocks private hosts', async () => {
  const shop = http.createServer((req, res) => {
    if (req.url === '/g.png') { res.writeHead(200, { 'content-type': 'image/png' }); return res.end(garmentPng) }
    if (req.url === '/page') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end('<html></html>') }
    res.writeHead(404); res.end()
  })
  const shopBase = `http://127.0.0.1:${await listen(shop)}`
  servers.push(shop)
  const { base } = await makeApp()
  const call = api(base, await signup(base, 'a@x.com'))
  await withPhoto(call)
  let r = await call('POST', '/try-on', form({ productImageUrl: `${shopBase}/g.png` }))
  assert.equal(r.status, 202, 'URL image accepted')
  await waitStatus(call, r.data.job.id, ['succeeded'])
  assert.equal((await call('POST', '/try-on', form({ productImageUrl: `${shopBase}/page` }))).status, 422, 'HTML is not an image')
  const bad = await call('POST', '/try-on', form({}, { image: Buffer.from('not an image at all') }))
  assert.equal(bad.data.code, 'product_image_invalid')
  const svgImg = await call('POST', '/try-on', form({}, { image: svg(100, 100, '#fff') }))
  assert.equal(svgImg.data.code, 'product_image_invalid', 'SVG is refused (it can reference files)')

  const strict = await makeApp({ allowPrivate: false })
  const sc = api(strict.base, await signup(strict.base, 'a@x.com'))
  await withPhoto(sc)
  for (const url of [`${shopBase}/g.png`, 'http://169.254.169.254/latest', 'http://localhost/x.png']) {
    const s = await sc('POST', '/try-on', form({ productImageUrl: url }))
    assert.equal(s.status, 400, url); assert.equal(s.data.code, 'blocked_host', url)
  }
})

test('bad metadata is rejected cleanly', async () => {
  const { base } = await makeApp()
  const call = api(base, await signup(base, 'a@x.com'))
  await withPhoto(call)
  const f = form(); f.set('size', ''); assert.equal((await call('POST', '/try-on', f)).status, 400)
  const g = form(); g.set('category', 'spaceships'); assert.equal((await call('POST', '/try-on', g)).status, 400)
  const h = form(); h.set('product', '{nope'); assert.equal((await call('POST', '/try-on', h)).status, 400)
  const i = form(); i.set('fit', JSON.stringify({ confidence: 500 })); assert.equal((await call('POST', '/try-on', i)).status, 400)
})

// ---- Replicate adapter: control flow against a fake network ----
const fakeReplicate = (script) => {
  const calls = []
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method ?? 'GET', body: init.body })
    return script(String(url), init, calls)
  }
  fetchImpl.calls = calls
  return fetchImpl
}
const json = (data, status = 200) => ({ ok: status < 400, status, json: async () => data })
const outputImage = await sharp(svg(400, 500, '#ccc')).png().toBuffer()
const args = (over = {}) => ({ person: personJpg, garment: garmentPng, category: 'topwear', size: 'M', report: async () => {}, shouldStop: () => false, ...over })

test('replicate: refuses to start without a token and model version', () => {
  assert.throws(() => createReplicateProvider({ token: '', version: 'v' }), /REPLICATE_API_TOKEN/)
  assert.throws(() => createReplicateProvider({ token: 't', version: '' }), /REPLICATE_MODEL_VERSION/)
})

test('replicate: starting -> processing -> succeeded, sends the token, downloads from replicate.delivery', async () => {
  let polls = 0
  const f = fakeReplicate((url) => {
    if (url.endsWith('/predictions')) return json({ id: 'pred1', status: 'starting' })
    if (url.endsWith('/predictions/pred1')) return json({ id: 'pred1', status: ++polls < 2 ? 'processing' : 'succeeded', output: ['https://replicate.delivery/out.png'] })
    if (url === 'https://replicate.delivery/out.png') return { ok: true, arrayBuffer: async () => outputImage }
    throw new Error('unexpected ' + url)
  })
  const p = createReplicateProvider({ token: 'tok_secret', version: 'ver1', fetchImpl: f, pollMs: 1 })
  assert.equal(p.external, true)
  const stages = []
  const out = await p.generate(args({ report: async (s) => stages.push(s) }))
  assert.equal((await sharp(out).metadata()).format, 'jpeg')
  const create = f.calls[0]
  assert.equal(create.method, 'POST')
  const sent = JSON.parse(create.body)
  assert.equal(sent.version, 'ver1'); assert.equal(sent.input.category, 'upper_body'); assert.match(sent.input.human_img, /^data:image\/jpeg;base64,/)
  assert.ok(stages.length >= 2)
})

test('replicate: bottomwear maps to lower_body; failures and odd results are errors', async () => {
  const ok = (output, status = 'succeeded') => fakeReplicate((url) => url.endsWith('/predictions') ? json({ id: 'p', status }) : json({ id: 'p', status, output }))
  let f = ok(['https://replicate.delivery/x.png']); f = fakeReplicate((u, i) => (u.endsWith('/predictions') ? (JSON.parse(i.body).input.category === 'lower_body' ? json({ id: 'p', status: 'failed' }) : json({ id: 'p', status: 'succeeded', output: 'x' })) : json({})))
  await assert.rejects(createReplicateProvider({ token: 't', version: 'v', fetchImpl: f, pollMs: 1 }).generate(args({ category: 'bottomwear' })), (e) => e.code === 'provider_error')
  await assert.rejects(createReplicateProvider({ token: 't', version: 'v', fetchImpl: ok(['https://evil.example.com/x.png']), pollMs: 1 }).generate(args()), (e) => e.code === 'provider_error', 'foreign host refused')
  await assert.rejects(createReplicateProvider({ token: 't', version: 'v', fetchImpl: ok(['http://replicate.delivery/x.png']), pollMs: 1 }).generate(args()), (e) => e.code === 'provider_error', 'plain http refused')
  const rejected = fakeReplicate(() => json({}, 401))
  await assert.rejects(createReplicateProvider({ token: 't', version: 'v', fetchImpl: rejected }).generate(args()), (e) => e.code === 'provider_error' && !/t/.test('') )
})

test('replicate: cancelling stops polling and cancels upstream; a stuck job times out', async () => {
  let stop = false
  const f = fakeReplicate((url) => (url.endsWith('/predictions') ? json({ id: 'p9', status: 'starting' }) : url.endsWith('/cancel') ? json({}) : json({ id: 'p9', status: 'processing' })))
  const p = createReplicateProvider({ token: 't', version: 'v', fetchImpl: f, pollMs: 5 })
  setTimeout(() => { stop = true }, 30)
  assert.equal(await p.generate(args({ shouldStop: () => stop })), null)
  assert.ok(f.calls.some((c) => c.url.endsWith('/predictions/p9/cancel')))
  const slow = createReplicateProvider({ token: 't', version: 'v', fetchImpl: f, pollMs: 5, maxWaitMs: 40 })
  await assert.rejects(slow.generate(args()), (e) => e.code === 'timeout')
})

// ---- Account export / deletion ----
test('account export contains your data and never a password hash', async () => {
  const { base } = await makeApp()
  const call = api(base, await signup(base, 'a@x.com'))
  await withPhoto(call)
  const id = (await call('POST', '/try-on', form())).data.job.id
  await waitStatus(call, id, ['succeeded'])
  const r = await call('GET', '/account/export')
  assert.equal(r.status, 200)
  assert.match(r.headers.get('content-disposition'), /attachment/)
  assert.equal(r.data.account.email, 'a@x.com')
  assert.equal(r.data.photos.length, 1)
  assert.equal(r.data.tryOnResults.length, 1)
  assert.ok(r.data.photoConsent)
  assert.doesNotMatch(JSON.stringify(r.data), /password|\$2[aby]\$/i)
})

test('account deletion: needs the right password, then removes everything including files', async () => {
  const { base, db, dir } = await makeApp()
  const a = api(base, await signup(base, 'a@x.com'))
  const bCookie = await signup(base, 'b@x.com')
  const b = api(base, bCookie)
  await withPhoto(a); await withPhoto(b)
  const id = (await a('POST', '/try-on', form())).data.job.id
  await waitStatus(a, id, ['succeeded'])
  const countFiles = () => fs.readdirSync(dir, { recursive: true }).filter((f) => String(f).endsWith('.jpg')).length
  assert.equal(countFiles(), 3, 'a: photo + result, b: photo')

  assert.equal((await a('DELETE', '/account', {})).status, 400, 'password required')
  const wrong = await a('DELETE', '/account', { password: 'not-the-password' })
  assert.equal(wrong.status, 403)
  assert.equal(countFiles(), 3, 'nothing deleted yet')

  const ok = await a('DELETE', '/account', { password: 'password1' })
  assert.equal(ok.status, 200)
  assert.match(ok.headers.get('set-cookie') ?? '', /vf_session=;/, 'session cookie cleared')
  assert.equal(countFiles(), 1, "only b's photo remains")
  assert.equal((await a('GET', '/auth/me')).status, 401)
  for (const table of ['users', 'user_data', 'photos', 'photo_consents', 'tryon_jobs']) {
    const where = table === 'users' ? "email = 'a@x.com'" : `user_id IN (SELECT id FROM users WHERE email='a@x.com')`
    assert.equal(db.prepare(`SELECT COUNT(*) c FROM ${table} WHERE ${where}`).get().c, 0, table)
  }
  const login = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'a@x.com', password: 'password1' }) })
  assert.equal(login.status, 401, 'the account no longer exists')
  assert.equal((await b('GET', '/photos')).data.photos.length, 1, "b's data is untouched")
})

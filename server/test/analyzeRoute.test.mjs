import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { openDb } from '../src/db.js'
import { createApp } from '../src/app.js'
import { createLocalStorage } from '../src/storage/localDisk.js'
import { createPageFetcher } from '../src/analyzer/fetchPage.js'
import { createAnalyzer } from '../src/analyzer/analyze.js'

const fx = (n) => fs.readFileSync(new URL(`./fixtures/${n}`, import.meta.url), 'utf8')
let store, api, apiStrict, cookie, strictCookie
const servers = []
const listen = (server) => new Promise((r) => server.listen(0, '127.0.0.1', () => r(server.address().port)))

const call = async (base, url, { auth = true, body } = {}) => {
  const res = await fetch(`${base}/api/analyze-product`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(auth ? { cookie } : {}) },
    body: JSON.stringify(body ?? { url }),
  })
  return { status: res.status, data: await res.json() }
}

before(async () => {
  // A fake "store" with pages that behave in the ways real stores do.
  store = http.createServer((req, res) => {
    const html = (body, status = 200, type = 'text/html; charset=utf-8') => { res.writeHead(status, { 'content-type': type }); res.end(body) }
    if (req.url === '/p/tee') return html(fx('generic-jsonld.html'))
    if (req.url === '/redirect') { res.writeHead(302, { location: '/p/tee' }); return res.end() }
    if (req.url === '/loop') { res.writeHead(302, { location: '/loop' }); return res.end() }
    if (req.url === '/captcha') return html(fx('amazon-captcha.html'))
    if (req.url === '/forbidden') return html('no', 403)
    if (req.url === '/missing') return html('no', 404)
    if (req.url === '/data.json') return html('{"a":1}', 200, 'application/json')
    if (req.url === '/huge') return html('<html>' + 'x'.repeat(4 * 1024 * 1024) + '</html>')
    if (req.url === '/nothing') return html(fx('no-product.html'))
    html('not found', 404)
  })
  const storePort = await listen(store)
  servers.push(store)
  store.base = `http://127.0.0.1:${storePort}`

  const mk = async (allowPrivate) => {
    const db = openDb(':memory:')
    const storage = createLocalStorage(fs.mkdtempSync(path.join(os.tmpdir(), 'vf-')))
    const analyzer = createAnalyzer(createPageFetcher({ allowPrivate, userAgent: 'test' }))
    const stub = { provider: { id: 'x', name: 'x', external: false, simulated: true, supportedCategories: [] }, fetchImage: async () => null }
    const server = http.createServer(createApp(db, storage, analyzer, stub))
    const port = await listen(server)
    servers.push(server)
    return `http://127.0.0.1:${port}`
  }
  api = await mk(true) // may reach the local fake store
  apiStrict = await mk(false) // production behaviour

  const res = await fetch(`${api}/api/auth/signup`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Tess T', email: 't@x.com', password: 'password1' }) })
  cookie = res.headers.get('set-cookie').split(';')[0]
  const res2 = await fetch(`${apiStrict}/api/auth/signup`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Tess T', email: 't@x.com', password: 'password1' }) })
  strictCookie = res2.headers.get('set-cookie').split(';')[0]
})
after(() => servers.forEach((s) => s.close()))

test('requires login', async () => {
  const r = await call(api, `${store.base}/p/tee`, { auth: false })
  assert.equal(r.status, 401)
})

test('end to end: fetches, extracts, returns product + analysis', async () => {
  const r = await call(api, `${store.base}/p/tee`)
  assert.equal(r.status, 200)
  assert.equal(r.data.product.name, 'Everyday Crew Tee')
  assert.equal(r.data.product.price, 799)
  assert.equal(r.data.product.chartSource, 'page')
  assert.equal(r.data.analysis.detectedCategory.category, 'topwear')
})

test('follows redirects', async () => {
  const r = await call(api, `${store.base}/redirect`)
  assert.equal(r.status, 200)
  assert.equal(r.data.product.name, 'Everyday Crew Tee')
})

test('redirect loop is cut off', async () => {
  const r = await call(api, `${store.base}/loop`)
  assert.equal(r.status, 502)
  assert.equal(r.data.code, 'fetch_failed')
})

test('CAPTCHA page -> blocked_by_site', async () => {
  const r = await call(api, `${store.base}/captcha`)
  assert.equal(r.status, 502)
  assert.equal(r.data.code, 'blocked_by_site')
})

test('403 from the store -> blocked_by_site; 404 -> fetch_failed', async () => {
  assert.equal((await call(api, `${store.base}/forbidden`)).data.code, 'blocked_by_site')
  assert.equal((await call(api, `${store.base}/missing`)).data.code, 'fetch_failed')
})

test('non-HTML content -> not_html', async () => {
  const r = await call(api, `${store.base}/data.json`)
  assert.equal(r.status, 422)
  assert.equal(r.data.code, 'not_html')
})

test('oversized page -> too_large', async () => {
  const r = await call(api, `${store.base}/huge`)
  assert.equal(r.data.code, 'too_large')
})

test('page without a product -> no_product_data', async () => {
  const r = await call(api, `${store.base}/nothing`)
  assert.equal(r.status, 422)
  assert.equal(r.data.code, 'no_product_data')
})

test('bad input: empty, garbage, wrong scheme', async () => {
  assert.equal((await call(api, '', { body: { url: '' } })).status, 400)
  assert.equal((await call(api, 'not a url')).data.code, 'invalid_url')
  assert.equal((await call(api, 'file:///etc/passwd')).data.code, 'invalid_url')
  assert.equal((await call(api, '', { body: {} })).status, 400)
})

test('SSRF: production-mode server refuses internal addresses', async () => {
  const strictCall = async (url) => {
    const res = await fetch(`${apiStrict}/api/analyze-product`, { method: 'POST', headers: { 'content-type': 'application/json', cookie: strictCookie }, body: JSON.stringify({ url }) })
    return { status: res.status, data: await res.json() }
  }
  for (const url of [`${store.base}/p/tee`, 'http://localhost/x', 'http://127.0.0.1/', 'http://169.254.169.254/latest/meta-data/', 'http://10.0.0.1/', 'http://[::1]/', 'https://example.com:8443/']) {
    const r = await strictCall(url)
    assert.equal(r.status, 400, url)
    assert.equal(r.data.code, 'blocked_host', url)
  }
})

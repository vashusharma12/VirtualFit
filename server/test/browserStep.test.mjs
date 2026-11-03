import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createBrowserRenderer } from '../src/analyzer/browser.js'

const quiet = { warn() {} }
const lookup = async (host) => ({ 'shop.example.com': [{ address: '93.184.216.34' }], 'sneaky.example.com': [{ address: '10.0.0.7' }] })[host]

// A stand-in for Playwright that records what the real one would be asked to do.
function fakePlaywright({ opened = true, panelText = 'Size\tChest (cm)\nS\t90\nM\t96', launchError = null } = {}) {
  const log = { launches: 0, clicked: 0, route: null, handlers: {}, aborted: [], continued: [] }
  const target = { isVisible: async () => opened, click: async () => { log.clicked++ } }
  const panel = { isVisible: async () => true, innerText: async () => panelText, screenshot: async () => Buffer.from('png-bytes') }
  const page = {
    on: (evt, fn) => { log.handlers[evt] = fn },
    goto: async () => {
      await log.handlers.response?.({ url: () => 'https://shop.example.com/api/sizechart/1', headers: () => ({ 'content-type': 'application/json' }), text: async () => '{"rows":[1]}' })
      await log.handlers.response?.({ url: () => 'https://shop.example.com/api/cart', headers: () => ({ 'content-type': 'application/json' }), text: async () => '{"cart":1}' })
      await log.handlers.response?.({ url: () => 'https://shop.example.com/size.js', headers: () => ({ 'content-type': 'text/javascript' }), text: async () => 'var x' })
    },
    waitForLoadState: async () => {},
    waitForTimeout: async () => {},
    getByRole: () => ({ first: () => target }),
    getByText: () => ({ first: () => target }),
    content: async () => '<html><body>page</body></html>',
    locator: () => ({ first: () => panel }),
  }
  const context = { route: async (_p, fn) => { log.route = fn }, newPage: async () => page, close: async () => {} }
  const browser = { newContext: async () => context, close: async () => {} }
  return { log, pw: { chromium: { launch: async () => { log.launches++; if (launchError) throw new Error(launchError); return browser } } } }
}
const make = (fake, extra = {}) => createBrowserRenderer({ userAgent: 'test', importPlaywright: async () => fake.pw, lookup, log: quiet, ...extra })

test('start-up check: a browser that cannot start switches the step off with an explanation', async () => {
  const warnings = []
  const r = await createBrowserRenderer({ userAgent: 't', importPlaywright: async () => fakePlaywright({ launchError: "Executable doesn't exist at /x/chromium" }).pw, log: { warn: (m) => warnings.push(m) } })
  assert.equal(r, null)
  assert.match(warnings[0], /OFF/)
  assert.match(warnings[0], /npx playwright install chromium/)
})

test('start-up check: a working browser is started once and reused', async () => {
  const fake = fakePlaywright()
  const r = await make(fake)
  await r.render('https://shop.example.com/p/1')
  await r.render('https://shop.example.com/p/2')
  assert.equal(fake.log.launches, 1)
})

test('render: opens the Size chart button and returns the page, the panel text, a screenshot and chart data', async () => {
  const fake = fakePlaywright()
  const out = await (await make(fake)).render('https://shop.example.com/p/1')
  assert.equal(fake.log.clicked, 1)
  assert.equal(out.opened, true)
  assert.match(out.html, /page/)
  assert.equal(out.panelText, 'Size\tChest (cm)\nS\t90\nM\t96')
  assert.equal(out.modalScreenshot.toString(), 'png-bytes')
  assert.deepEqual(out.json, [{ rows: [1] }], 'only size-related JSON responses are kept, not carts or scripts')
})

test('render: a page with no Size chart button still returns the page, without panel data', async () => {
  const out = await (await make(fakePlaywright({ opened: false }))).render('https://shop.example.com/p/1')
  assert.equal(out.opened, false)
  assert.equal(out.panelText, null)
  assert.equal(out.modalScreenshot, null)
})

test('safety: every request the PAGE makes is checked, not just the first', async () => {
  const fake = fakePlaywright()
  await (await make(fake)).render('https://shop.example.com/p/1')
  const route = (url, resourceType = 'xhr') => ({ request: () => ({ url: () => url, resourceType: () => resourceType }), abort: async (r) => fake.log.aborted.push([url, r ?? 'aborted']), continue: async () => fake.log.continued.push(url) })
  for (const url of ['http://127.0.0.1:8080/admin', 'http://localhost/x', 'http://169.254.169.254/latest/meta-data/', 'http://sneaky.example.com/x', 'file:///etc/passwd', 'ftp://shop.example.com/x']) await fake.log.route(route(url))
  assert.equal(fake.log.aborted.length, 6, 'internal, private-DNS and non-web addresses are all blocked')
  assert.ok(fake.log.aborted.every(([, why]) => why === 'blockedbyclient'))
  await fake.log.route(route('https://shop.example.com/api/sizechart/1'))
  await fake.log.route(route('data:image/png;base64,AAAA', 'image'))
  assert.deepEqual(fake.log.continued, ['https://shop.example.com/api/sizechart/1', 'data:image/png;base64,AAAA'])
  await fake.log.route(route('https://shop.example.com/font.woff2', 'font'))
  assert.equal(fake.log.aborted.length, 7, 'fonts and media are skipped to keep it fast')
})

// ---------- the installer that runs after `npm install` ----------
const script = fileURLToPath(new URL('../scripts/install-browser.mjs', import.meta.url))
const install = (env) => new Promise((resolve) => execFile(process.execPath, [script], { env: { ...process.env, ...env } }, (err, stdout) => resolve({ code: err?.code ?? 0, out: stdout })))

test('installer: opting out skips the download and succeeds', async () => {
  const r = await install({ PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1' })
  assert.equal(r.code, 0)
  assert.match(r.out, /Skipping the browser download/)
})

test('installer: a FAILED download never fails `npm install`, and explains what to do', async () => {
  const r = await install({ VF_BROWSER_INSTALL_CMD: 'node -e "process.exit(1)"' })
  assert.equal(r.code, 0)
  assert.match(r.out, /Could not download the browser/)
  assert.match(r.out, /npx playwright install chromium/)
})

test('installer: a successful download says so', async () => {
  const r = await install({ VF_BROWSER_INSTALL_CMD: 'node -e "process.exit(0)"' })
  assert.equal(r.code, 0)
  assert.match(r.out, /Browser ready/)
})

test('the browser step is ON by default and can be switched off', async () => {
  const read = (env) => new Promise((resolve) => execFile(process.execPath, ['--input-type=module', '-e', "import('./src/config.js').then((m) => console.log(m.config.analyzerUseBrowser))"], { cwd: fileURLToPath(new URL('..', import.meta.url)), env: { ...process.env, ...env } }, (e, out) => resolve(out.trim().split('\n').pop())))
  assert.equal(await read({ ANALYZER_USE_BROWSER: '' }), 'true')
  assert.equal(await read({ ANALYZER_USE_BROWSER: 'false' }), 'false')
})

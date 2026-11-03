import { test } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { diagnose, advise } from '../src/analyzer/diagnose.js'

const LD = '<script type="application/ld+json">{"@type":"Product","name":"Slim Fit Jeans","offers":{"price":1999}}</script>'
const URL_ = 'https://www.example-store.com/p/1'

test('diagnose: a page whose chart loads on click is recognised, with advice to use the browser step', () => {
  const html = `<html><head><title>Jeans</title>${LD}</head><body><button>Size Chart</button><script>window.__S__={"pdp":{"sizeChartId":"abc","sizes":[{"label":"30"}]}}</script></body></html>`
  const d = diagnose(html, URL_)
  assert.equal(d.sizeChartButtons, 1)
  assert.equal(d.jsonLdProduct, true)
  assert.equal(d.tables.readableSizeChart, false)
  assert.ok(d.sizeKeyPaths.some((p) => /sizeChartId/.test(p)))
  assert.match(advise(d, { browserOn: false, aiOn: false, chartFound: false }), /ANALYZER_USE_BROWSER/)
  assert.doesNotMatch(advise(d, { browserOn: true, aiOn: false, chartFound: false }), /button/)
})

test('diagnose: an empty script shell, a bot-protection page and a picture chart each get the right advice', () => {
  const shell = `<html><head><title></title></head><body><div id="root"></div>${'<script>1</script>'.repeat(5)}</body></html>`
  assert.equal(diagnose(shell, URL_).looksLikeEmptyShell, true)
  assert.match(advise(diagnose(shell, URL_), { browserOn: false, aiOn: false, chartFound: false }), /built by scripts/)
  const blocked = '<html><head><title>Robot Check</title></head><body><form action="/errors/validateCaptcha"></form></body></html>'
  assert.equal(diagnose(blocked, URL_).blocked, true)
  assert.match(advise(diagnose(blocked, URL_), { browserOn: true, aiOn: true, chartFound: false }), /does not bypass/)
  const pic = `<html><body><img src="/img/size-chart.png" alt="Size chart"></body></html>`
  assert.equal(diagnose(pic, URL_).chartImages.length, 1)
  assert.match(advise(diagnose(pic, URL_), { browserOn: true, aiOn: false, chartFound: false }), /ANTHROPIC_API_KEY/)
})

test('the analyze command runs end to end and tells the truth about a page', async () => {
  const html = `<html><head><title>Jeans</title>${LD}</head><body><table><tr><th>Size</th><th>Waist (in)</th><th>Hips (in)</th></tr><tr><td>30</td><td>30</td><td>38</td></tr><tr><td>32</td><td>32</td><td>40</td></tr></table></body></html>`
  const server = http.createServer((_q, res) => { res.writeHead(200, { 'content-type': 'text/html' }); res.end(html) })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const url = `http://127.0.0.1:${server.address().port}/jeans`
  const script = fileURLToPath(new URL('../scripts/analyze.mjs', import.meta.url))
  const out = await new Promise((resolve) => execFile(process.execPath, [script, url], { env: { ...process.env, ANALYZER_ALLOW_PRIVATE_HOSTS: 'true' } }, (err, stdout) => resolve(stdout)))
  server.close()
  assert.match(out, /WHAT THE SERVER RECEIVED/)
  assert.match(out, /name\s+: Slim Fit Jeans/)
  assert.match(out, /SIZE CHART FOUND: 2 sizes/)
  assert.match(out, /read with: .*html-size-table/)
  assert.match(out, /WHAT TO DO/)
})

test('the analyze command explains a failure instead of crashing', async () => {
  const script = fileURLToPath(new URL('../scripts/analyze.mjs', import.meta.url))
  const run = (args) => new Promise((resolve) => execFile(process.execPath, [script, ...args], { env: process.env }, (err, stdout) => resolve({ code: err?.code ?? 0, stdout })))
  const none = await run([])
  assert.match(none.stdout, /Usage/)
  const refused = await run(['http://127.0.0.1:1/x'])
  assert.match(refused.stdout, /FETCH FAILED/)
  assert.match(refused.stdout, /blocked_host/, 'the safety check applies to the command too')
})

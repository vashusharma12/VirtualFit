import { test } from 'node:test'
import assert from 'node:assert/strict'
import { analyzeHtml, createAnalyzer } from '../src/analyzer/analyze.js'
import { assertRequestAllowed, createBrowserRenderer } from '../src/analyzer/browser.js'

const LD = '<script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"Slim Fit Jeans","offers":{"price":1999,"priceCurrency":"INR"}}</script>'
const page = (body, head = '') => `<!doctype html><html><head><title>Jeans</title>${LD}${head}</head><body>${body}</body></html>`
const URL_ = 'https://www.example-store.com/men-jeans/slim-fit/p/123'
const run = (html) => analyzeHtml({ html, url: URL_ })
const rowsOf = (n) => Array.from({ length: n }, (_, i) => i)

// ---------- charts hidden in the page's own data ----------
test('chart under an unexpected key is found by its SHAPE; unlabeled inches are detected and converted', () => {
  const state = { product: { id: 1, variants: [{ size: 'S', price: 999 }, { size: 'M', price: 999 }], details: [
    { Size: '28', Waist: '28', Hips: '36' }, { Size: '30', Waist: '30', Hips: '38' }, { Size: '32', Waist: '32', Hips: '40' } ] } }
  const { product } = run(page(`<script>window.__INITIAL_STATE__ = ${JSON.stringify(state)};</script>`))
  assert.ok(product.sizeChart, 'chart found')
  assert.deepEqual(product.sizeChart.measurements, ['waist', 'hips'])
  assert.equal(product.sizeChart.unitGuessed, 'in', 'numbers like 28-40 are inches, and the page did not say so')
  assert.deepEqual(product.sizeChart.rows[0].waist, [71.1, 71.1])
  assert.equal(product.sizeChart.rows.length, 3)
})

test('chart inside window.X = JSON.parse("...") (escaped string) is found', () => {
  const state = { pdp: { sizeChart: { headers: ['Size', 'Chest (cm)', 'Waist (cm)'], rows: [['S', '88-94', '74-80'], ['M', '94-102', '80-88'], ['L', '102-110', '88-96']] } } }
  const literal = JSON.stringify(JSON.stringify(state))
  const { product, analysis } = run(page(`<script>window.__APP_DATA__ = JSON.parse(${literal});</script>`))
  assert.deepEqual(product.sizeChart.rows[1].chest, [94, 102])
  assert.equal(product.sizeChart.unitGuessed, undefined, 'the page said cm, nothing was guessed')
  assert.ok(analysis.extractionMethods.includes('embedded-chart'))
})

test('<script type="application/json"> blobs are searched too', () => {
  const data = { page: { sizing: [{ size: 'M', chest: { min: 92, max: 98 }, waist: { min: 80, max: 86 } }, { size: 'L', chest: { min: 98, max: 104 }, waist: { min: 86, max: 92 } }] } }
  const { product } = run(page(`<script type="application/json" id="state">${JSON.stringify(data)}</script>`))
  assert.deepEqual(product.sizeChart.rows[0].chest, [92, 98])
})

test('product VARIANTS (size + price/stock, no measurements) are not mistaken for a size chart', () => {
  const state = { variants: [{ size: 'S', price: 999, stock: 4 }, { size: 'M', price: 999, stock: 2 }, { size: 'L', price: 999, stock: 0 }], other: [{ size: 'S', length: '27' }, { size: 'M', length: '28' }] }
  const { product } = run(page(`<script>window.__INITIAL_STATE__ = ${JSON.stringify(state)};</script>`))
  assert.equal(product.sizeChart, null)
})

test('a lone measurement column under a non-size-chart key is NOT accepted (too easy to be wrong)', () => {
  const state = { stuff: [{ size: 'S', chest: '90' }, { size: 'M', chest: '96' }] }
  assert.equal(run(page(`<script>window.__X__ = ${JSON.stringify(state)};</script>`)).product.sizeChart, null)
})

test('unlabeled table: inches guessed from the numbers, cm left alone', () => {
  const t = (rows) => `<table><tr><th>Size</th><th>Chest</th><th>Waist</th></tr>${rows.map(([s, c, w]) => `<tr><td>${s}</td><td>${c}</td><td>${w}</td></tr>`).join('')}</table>`
  const inches = run(page(t([['S', '36', '30'], ['M', '38', '32'], ['L', '40', '34']]))).product.sizeChart
  assert.equal(inches.unitGuessed, 'in')
  assert.deepEqual(inches.rows[1].chest, [96.5, 96.5])
  const cm = run(page(t([['S', '92', '76'], ['M', '98', '82'], ['L', '104', '88']]))).product.sizeChart
  assert.equal(cm.unitGuessed, 'cm')
  assert.deepEqual(cm.rows[1].chest, [98, 98])
})

test('a table that SAYS its unit is trusted over the guess', () => {
  const t = '<table><caption>Size chart (inches)</caption><tr><th>Size</th><th>Chest</th></tr><tr><td>S</td><td>36</td></tr><tr><td>M</td><td>38</td></tr><tr><td>L</td><td>40</td></tr></table>'
  const c = run(page(t)).product.sizeChart
  assert.equal(c.unitGuessed, undefined)
  assert.deepEqual(c.rows[0].chest, [91.4, 91.4])
})

// ---------- links to the chart ----------
const linkPage = page('<a href="/sizechart/123">Size Chart</a>')
const goodJson = JSON.stringify({ data: { rows: [{ size: 'S', chest: '88-94', waist: '74-80' }, { size: 'M', chest: '94-102', waist: '80-88' }] } })
const fetchPage = (html) => async (url) => ({ html, finalUrl: url })

test('a "Size chart" link is followed and its JSON data is read', async () => {
  const seen = []
  const fetchResource = async (u) => { seen.push(u); return { buffer: Buffer.from(goodJson), type: 'application/json', finalUrl: u } }
  const r = await createAnalyzer(fetchPage(linkPage), { fetchResource })(URL_)
  assert.deepEqual(seen, ['https://www.example-store.com/sizechart/123'])
  assert.equal(r.product.sizeChart.rows.length, 2)
  assert.ok(r.analysis.extractionMethods.includes('chart-link'))
  assert.ok(!r.analysis.warnings.some((w) => /No size chart/.test(w)), 'the "no chart" warning is removed once one is found')
})

test('a linked HTML page with a size table is read', async () => {
  const html = '<table><tr><th>Size</th><th>Chest (cm)</th></tr><tr><td>S</td><td>90</td></tr><tr><td>M</td><td>96</td></tr><tr><td>L</td><td>102</td></tr></table>'
  const r = await createAnalyzer(fetchPage(linkPage), { fetchResource: async (u) => ({ buffer: Buffer.from(html), type: 'text/html', finalUrl: u }) })(URL_)
  assert.equal(r.product.sizeChart.rows.length, 3)
})

test('a chart link that fails (blocked, 404, garbage) never fails the analysis', async () => {
  for (const fetchResource of [async () => { throw new Error('boom') }, async () => ({ buffer: Buffer.from('not json{'), type: 'application/json' }), async () => ({ buffer: Buffer.from('<p>nothing</p>'), type: 'text/html' })]) {
    const r = await createAnalyzer(fetchPage(linkPage), { fetchResource })(URL_)
    assert.equal(r.product.name, 'Slim Fit Jeans')
    assert.equal(r.product.sizeChart, null)
  }
})

test('a "sizeChartUrl" pointing at a picture becomes a chart-image hint, and the AI reader can use it', async () => {
  const state = { pdp: { sizeChartUrl: 'https://cdn.example-store.com/charts/jeans-123.png' } }
  const html = page(`<script>window.__myx = ${JSON.stringify(state)};</script>`)
  assert.deepEqual(analyzeHtml({ html, url: URL_ }).hints.chartImages, ['https://cdn.example-store.com/charts/jeans-123.png'])
  const chart = { id: 'ai', rows: [{ size: 'S' }, { size: 'M' }], measurements: ['waist'], basis: 'body', source: 'ai' }
  const chartReader = { enabled: true, fromImage: async () => chart, fromText: async () => null }
  const r = await createAnalyzer(fetchPage(html), { chartReader, fetchImage: async () => Buffer.from('img') })(URL_)
  assert.equal(r.analysis.suggestedChart, chart)
  assert.equal(r.product.sizeChart, null, 'an AI-read chart is only SUGGESTED, never silently used')
  assert.ok(r.analysis.warnings.some((w) => /check the numbers/i.test(w)))
})

// ---------- the browser step (stand-in browser) ----------
const closedPage = page('<button>Size Chart</button>')
const renderedTable = page('<div role="dialog"><table><tr><th>Size</th><th>Chest (in)</th><th>Waist (in)</th></tr><tr><td>S</td><td>36</td><td>30</td></tr><tr><td>M</td><td>38</td><td>32</td></tr><tr><td>L</td><td>40</td><td>34</td></tr></table></div>')

test('browser step: the panel opened by a click reveals the chart table', async () => {
  const calls = []
  const browser = { render: async (u) => { calls.push(u); return { html: renderedTable, json: [], modalScreenshot: null, opened: true } } }
  const r = await createAnalyzer(fetchPage(closedPage), { browser })(URL_)
  assert.equal(calls.length, 1)
  assert.equal(r.product.sizeChart.rows.length, 3)
  assert.deepEqual(r.product.sizeChart.rows[0].chest, [91.4, 91.4])
  assert.ok(r.analysis.extractionMethods.includes('browser'))
})

test('browser step: chart data the page fetched while opening the panel is read', async () => {
  const blob = { sizeGuide: { rows: [{ size: 'M', chest: '94-102', waist: '80-88' }, { size: 'L', chest: '102-110', waist: '88-96' }] } }
  const r = await createAnalyzer(fetchPage(closedPage), { browser: { render: async () => ({ html: closedPage, json: [blob], modalScreenshot: null }) } })(URL_)
  assert.deepEqual(r.product.sizeChart.rows[1].chest, [102, 110])
})

test('browser step is not used when the chart was already found', async () => {
  let called = false
  const html = page('<table><tr><th>Size</th><th>Chest (cm)</th></tr><tr><td>S</td><td>90</td></tr><tr><td>M</td><td>96</td></tr></table>')
  await createAnalyzer(fetchPage(html), { browser: { render: async () => { called = true; return null } } })(URL_)
  assert.equal(called, false)
})

test('an empty page SHELL (content needs scripts) is rendered by the browser to get the product', async () => {
  const shell = '<!doctype html><html><head><title></title></head><body><div id="root"></div></body></html>'
  const noProduct = '<!doctype html><html><head><title></title></head><body><table><tr><th>Size</th><th>Chest (cm)</th></tr><tr><td>S</td><td>90</td></tr><tr><td>M</td><td>96</td></tr></table></body></html>'
  const r = await createAnalyzer(fetchPage(shell), { browser: { render: async () => ({ html: noProduct, json: [] }) } })(URL_).catch((e) => e)
  // the rendered page has no product either, so it must still fail cleanly rather than invent one
  assert.equal(r.code, 'no_product_data')
  const full = page('<div id="root"></div>')
  const ok = await createAnalyzer(fetchPage(shell), { browser: { render: async () => ({ html: full + renderedTable, json: [] }) } })(URL_)
  assert.equal(ok.product.name, 'Slim Fit Jeans')
  assert.ok(ok.analysis.extractionMethods.includes('browser'))
})

test('POLICY: a bot-protection page is reported and the browser is NOT used to get around it', async () => {
  let called = false
  const captcha = '<html><head><title>Robot Check</title></head><body><form action="/errors/validateCaptcha"></form></body></html>'
  await assert.rejects(createAnalyzer(fetchPage(captcha), { browser: { render: async () => { called = true; return null } } })(URL_), (e) => e.code === 'blocked_by_site')
  assert.equal(called, false)
})

test('browser step that fails or times out degrades gracefully', async () => {
  const r = await createAnalyzer(fetchPage(closedPage), { browser: { render: async () => { throw new Error('browser crashed') } } })(URL_)
  assert.equal(r.product.name, 'Slim Fit Jeans')
  assert.equal(r.product.sizeChart, null)
})

test('browser step: a screenshot of the opened panel goes to the AI reader, as a suggestion', async () => {
  const chart = { id: 'ai', rows: [{ size: 'M' }, { size: 'L' }], measurements: ['chest'], basis: 'body', source: 'ai' }
  const got = []
  const chartReader = { enabled: true, fromImage: async (b) => { got.push(b); return chart }, fromText: async () => null }
  const shot = Buffer.from('png-bytes')
  const r = await createAnalyzer(fetchPage(closedPage), { chartReader, fetchImage: async () => null, browser: { render: async () => ({ html: closedPage, json: [], modalScreenshot: shot }) } })(URL_)
  assert.equal(got[0], shot)
  assert.equal(r.analysis.suggestedChart, chart)
  assert.equal(r.product.sizeChart, null)
})

// ---------- safety of everything the browser loads ----------
test('browser safety: every request is checked (localhost, private IPs, private DNS, odd schemes)', async () => {
  const lookup = async (host) => ({ 'public.example.com': [{ address: '93.184.216.34' }], 'sneaky.example.com': [{ address: '10.0.0.7' }], 'mixed.example.com': [{ address: '93.184.216.34' }, { address: '169.254.169.254' }] })[host]
  const blocked = ['http://localhost/x', 'http://127.0.0.1/', 'http://169.254.169.254/latest/meta-data/', 'http://10.1.2.3/', 'http://[::1]/', 'http://sneaky.example.com/', 'http://mixed.example.com/', 'file:///etc/passwd', 'ftp://public.example.com/', 'https://public.example.com:8443/']
  for (const url of blocked) await assert.rejects(assertRequestAllowed(url, { lookup }), (e) => e.code === 'blocked_host' || e.code === 'invalid_url', url)
  for (const url of ['https://public.example.com/a.js', 'http://public.example.com/', 'data:image/png;base64,AAAA', 'blob:https://public.example.com/uuid']) await assertRequestAllowed(url, { lookup })
  await assertRequestAllowed('http://127.0.0.1:3000/', { allowPrivate: true, lookup })
})

test('browser step is simply unavailable (not an error) when playwright is not installed', async () => {
  assert.equal(await createBrowserRenderer({ userAgent: 'x', importPlaywright: async () => { throw new Error('Cannot find package playwright') } }), null)
})

test('browser renderer limits concurrency and always releases its slot', async () => {
  let open = 0
  let peak = 0
  const fakePw = { chromium: { launch: async () => ({
    newContext: async () => ({ route: async () => {}, close: async () => { open-- }, newPage: async () => { open++; peak = Math.max(peak, open); await new Promise((r) => setTimeout(r, 30)); throw new Error('page failed') } }),
    close: async () => {},
  }) } }
  const r = await createBrowserRenderer({ userAgent: 'x', importPlaywright: async () => fakePw })
  const results = await Promise.allSettled([r.render('https://a.example.com/'), r.render('https://b.example.com/'), r.render('https://c.example.com/')])
  assert.ok(results.every((x) => x.status === 'rejected'))
  assert.ok(peak <= 2, `at most 2 at once (saw ${peak})`)
  await assert.rejects(r.render('https://d.example.com/'), (e) => e.code === 'fetch_failed')
})

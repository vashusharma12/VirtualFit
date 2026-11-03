import { test } from 'node:test'
import assert from 'node:assert/strict'
import { analyzeHtml, createAnalyzer } from '../src/analyzer/analyze.js'
import { STATUS_FOR_CODE } from '../src/analyzer/errors.js'

const ld = (o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`
const productLd = (name, extra = {}) => ({ '@context': 'https://schema.org', '@type': 'Product', name, offers: { price: 1999, priceCurrency: 'INR' }, ...extra })
const doc = (head, body = '') => `<!doctype html><html><head><title>t</title>${head}</head><body>${body}</body></html>`
const run = (html, url = 'https://www.example-store.com/p/123') => analyzeHtml({ html, url })
const code = (fn) => { try { fn(); return null } catch (e) { return e } }
const fetcher = (html, counter = { n: 0 }) => Object.assign(async (u) => { counter.n++; return { html, finalUrl: u } }, { counter })

// ---------- links that are clearly not products are refused before downloading anything ----------
test('home pages, search pages, carts and category pages are refused WITHOUT being downloaded', async () => {
  const bad = ['https://www.myntra.com/', 'https://www.flipkart.com', 'https://www.amazon.in/s?k=jeans', 'https://www.flipkart.com/search?q=shirts', 'https://www.ajio.com/cart', 'https://shop.com/collections/summer-sale', 'https://shop.com/login']
  for (const url of bad) {
    const counter = { n: 0 }
    const e = await createAnalyzer(fetcher(doc(ld(productLd('x'))), counter))(url).catch((x) => x)
    assert.equal(e.code, 'not_a_product_page', url)
    assert.match(e.message, /not the page of one product/, url)
    assert.equal(counter.n, 0, `${url} was downloaded`)
  }
})

test('real product links are NOT refused by the address check', async () => {
  const good = ['https://www.myntra.com/tshirts/roadster/navy-t-shirt/1234567/buy', 'https://www.amazon.in/dp/B0ABC123?keywords=jeans&qid=1', 'https://www.flipkart.com/puma-shirt/p/itm123?pid=SHTX&q=shirt', 'https://www.ajio.com/levis-jeans/p/469999']
  for (const url of good) {
    const e = await createAnalyzer(fetcher(doc(ld(productLd('Slim Fit Jeans')))))(url).catch((x) => x)
    assert.equal(e.code, undefined, `${url} -> ${e.message}`)
  }
})

test('an unsafe address is still reported as unsafe (not as "a home page")', async () => {
  const f = Object.assign(async () => ({ html: '', finalUrl: '' }), { validate: (u) => { if (/127\.0\.0\.1/.test(u)) { const e = new Error('no'); e.code = 'blocked_host'; throw e } } })
  const e = await createAnalyzer(f)('http://127.0.0.1/').catch((x) => x)
  assert.equal(e.code, 'blocked_host')
})

// ---------- pages that look like products but are not ----------
test('a store HOME page (a title and a picture, no product details) is refused', () => {
  const e = code(() => run(doc('<meta property="og:title" content="Online Shopping for Women, Men, Kids Fashion"><meta property="og:image" content="https://x.example/banner.jpg"><meta property="og:type" content="website">')))
  assert.equal(e.code, 'not_a_product_page')
  assert.equal(e.retryable, true, 'an empty script shell could still be filled in by a browser')
  assert.match(e.message, /does not look like the page of a single product/)
})

test('a category/search LIST of products is refused, not mistaken for one of its products', () => {
  const items = Array.from({ length: 24 }, (_, i) => ({ '@type': 'ListItem', position: i + 1, url: `https://x.example/p/${i}` }))
  const list = code(() => run(doc(ld({ '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: items }) + '<meta property="og:title" content="Men Jeans">')))
  assert.equal(list.code, 'not_a_product_page')
  assert.match(list.message, /list of products/)
  const many = code(() => run(doc(ld([productLd('A'), productLd('B'), productLd('C'), productLd('D')]))))
  assert.equal(many.code, 'not_a_product_page')
  assert.equal(code(() => run(doc(ld(productLd('Slim Fit Jeans')) + ld({ '@type': 'ItemList', itemListElement: items })))), null, 'one product plus a "related items" list is a normal product page')
})

// ---------- products that are not clothing ----------
test('electronics, furniture and beauty products are refused with the reason', () => {
  for (const [name, word] of [['Apple iPhone 15 Pro 256GB', 'iphone'], ['Sony WH-1000XM5 Wireless Headphones', 'headphones'], ['3 Seater Fabric Sofa', 'sofa'], ['Himalaya Moisturizer 200ml', 'moisturizer']]) {
    const e = code(() => run(doc(ld(productLd(name)))))
    assert.equal(e.code, 'not_clothing', name)
    assert.ok(e.message.includes(word), e.message)
    assert.match(e.message, /VirtualFit only works out sizes for/)
    assert.equal(e.retryable, false, 'an iPhone does not become clothing in a browser')
  }
})

test('clothing is never refused for containing a non-clothing word', () => {
  assert.equal(code(() => run(doc(ld(productLd("Men's Cotton T-Shirt with Phone Pocket"))))), null)
  assert.equal(run(doc(ld(productLd('Bluetooth Speaker Print Hoodie')))).product.category, 'topwear')
})

test('unrecognised clothing words are accepted when the page has sizes (the app then asks which category)', () => {
  const r = run(doc(ld(productLd('Banarasi Silk Dupatta', { size: ['S', 'M', 'L'] }))))
  assert.equal(r.product.category, null)
  assert.deepEqual(r.product.allSizes, ['S', 'M', 'L'])
})

test('an unrecognisable item with no sizes and no chart is refused as "could not tell" (retryable)', () => {
  const e = code(() => run(doc(ld(productLd('Premium Quality Item')))))
  assert.equal(e.code, 'not_clothing')
  assert.equal(e.retryable, true)
  assert.match(e.message, /could not tell that this is a clothing/)
})

test('dresses, innerwear and accessories still get the existing "cannot be sized yet" explanation', () => {
  assert.equal(run(doc(ld(productLd('Floral Maxi Dress')))).analysis.detectedCategory.category, 'unsupported')
})

test('the new refusals map to HTTP 422 for the website', () => {
  assert.equal(STATUS_FOR_CODE.not_a_product_page, 422)
  assert.equal(STATUS_FOR_CODE.not_clothing, 422)
})

// ---------- the browser gets a second chance only where it could help ----------
const realPage = doc(ld(productLd('Slim Fit Jeans', { size: ['30', '32'] })), '<table><tr><th>Size</th><th>Waist (cm)</th></tr><tr><td>30</td><td>76</td></tr><tr><td>32</td><td>81</td></tr></table>')
const shell = doc('<meta property="og:title" content="Loading..."><meta property="og:type" content="website">', '<div id="root"></div>')

test('an empty script shell is filled in by the browser and then accepted', async () => {
  let called = 0
  const browser = { render: async () => { called++; return { html: realPage, json: [] } } }
  const r = await createAnalyzer(fetcher(shell), { browser })('https://www.example-store.com/p/9')
  assert.equal(called, 1)
  assert.equal(r.product.name, 'Slim Fit Jeans')
  assert.ok(r.analysis.extractionMethods.includes('browser'))
})

test('pages that can never be products are refused WITHOUT starting a browser', async () => {
  let called = 0
  const browser = { render: async () => { called++; return null } }
  const items = [{ '@type': 'ListItem', position: 1 }, { '@type': 'ListItem', position: 2 }]
  for (const html of [doc(ld({ '@type': 'ItemList', itemListElement: items })), doc(ld(productLd('Apple iPhone 15')))]) {
    await assert.rejects(createAnalyzer(fetcher(html), { browser })('https://www.example-store.com/p/9'), (e) => ['not_a_product_page', 'not_clothing'].includes(e.code))
  }
  assert.equal(called, 0)
})

test('if the browser still finds no product, the shopper gets the honest refusal', async () => {
  const browser = { render: async () => ({ html: shell, json: [] }) }
  await assert.rejects(createAnalyzer(fetcher(shell), { browser })('https://www.example-store.com/p/9'), (e) => ['no_product_data', 'not_a_product_page'].includes(e.code))
})

// ---------- charts made of ordinary page elements ----------
const grid = (rows, head = ['Size', 'Chest (in)', 'Waist (in)'], note = '') => `<div class="chart">${note}<div class="row">${head.map((h) => `<span>${h}</span>`).join('')}</div>${rows.map((r) => `<div class="row">${r.map((c) => `<span>${c}</span>`).join('')}</div>`).join('')}</div>`

test('a chart built from <div>/<span> cells is read, converted from inches, and its basis found', () => {
  const body = grid([['S', '36', '30'], ['M', '38', '32'], ['L', '40', '34']], ['Size', 'Chest (in)', 'Waist (in)'], '<h4>Body Measurements</h4>')
  const result = run(doc(ld(productLd('Roadster Men T-shirt')), body))
  assert.ok(result.analysis.extractionMethods.includes('text-grid'))
  assert.deepEqual(result.product.sizeChart.rows.map((r) => r.size), ['S', 'M', 'L'])
  assert.deepEqual(result.product.sizeChart.rows[1].chest, [96.5, 96.5])
  assert.equal(result.product.sizeChart.basis, 'body')
})

test('grid with an extra unrecognised column (Length) keeps its columns aligned', () => {
  const body = grid([['S', '36', '27', '30'], ['M', '38', '28', '32'], ['L', '40', '29', '34']], ['Size', 'Chest', 'Length', 'Waist'])
  const c = run(doc(ld(productLd('Men Shirt')), body)).product.sizeChart
  assert.deepEqual(c.measurements, ['chest', 'waist'])
  assert.deepEqual(c.rows[2].waist, [86.4, 86.4], 'waist is read from the right column, not from Length')
})

test('unlabelled units in a grid are guessed from the numbers and flagged', () => {
  const c = run(doc(ld(productLd('Men Shirt')), grid([['S', '36', '30'], ['M', '38', '32']], ['Size', 'Chest', 'Waist']))).product.sizeChart
  assert.equal(c.unitGuessed, 'in')
})

test('the grid reader does not invent charts from ordinary text', () => {
  assert.equal(run(doc(ld(productLd('Men Shirt')), '<p>Find your Size</p><p>Chest</p><p>Waist</p><p>Hello there</p>')).product.sizeChart, null)
  assert.equal(run(doc(ld(productLd('Men Shirt')), grid([['S', '36', '30']]))).product.sizeChart, null, 'a single row is not a chart')
  assert.equal(run(doc(ld(productLd('Men Shirt')), '<p>Pick your size. The chest of the shirt is wide. Waist is elastic.</p>')).product.sizeChart, null)
})

test('a size table that is a <table> still wins over the grid reader', () => {
  const { analysis } = run(realPage)
  assert.ok(analysis.extractionMethods.includes('html-size-table'))
  assert.ok(!analysis.extractionMethods.includes('text-grid'))
})

test('the text of a panel opened by a browser is read even when the page markup is awkward', async () => {
  const closed = doc(ld(productLd('Slim Fit Jeans', { size: ['30', '32'] })), '<button>Size Chart</button>')
  const browser = { render: async () => ({ html: closed, json: [], panelText: 'Size Chart\nBody Measurements\nSize\tWaist (cm)\tHips (cm)\n30\t76-80\t94-98\n32\t81-85\t99-103\n34\t86-90\t104-108' }) }
  const r = await createAnalyzer(fetcher(closed), { browser })('https://www.example-store.com/p/9')
  assert.equal(r.product.sizeChart.rows.length, 3)
  assert.deepEqual(r.product.sizeChart.rows[1].hips, [99, 103])
  assert.ok(r.analysis.extractionMethods.includes('browser'))
})

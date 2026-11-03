import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { analyzeHtml } from '../src/analyzer/analyze.js'

const fx = (name) => fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')
const run = (name, url) => analyzeHtml({ html: fx(name), url })
const fails = (name, url, code) => assert.throws(() => run(name, url), (e) => e.code === code)

test('generic JSON-LD: name, brand, price, images, rating, breadcrumbs', () => {
  const { product, analysis } = run('generic-jsonld.html', 'https://shop.example.com/men/tees/everyday-crew-tee')
  assert.equal(product.name, 'Everyday Crew Tee')
  assert.equal(product.brand, 'Northwind')
  assert.equal(product.price, 799)
  assert.equal(product.currency, 'INR')
  assert.equal(product.color, 'Navy')
  assert.equal(product.material, '100% cotton')
  assert.equal(product.rating, 4.4)
  assert.equal(product.images.length, 3)
  assert.equal(product.image, 'https://shop.example.com/img/tee-1.jpg', 'relative image URL made absolute')
  assert.equal(product.category, 'topwear')
  assert.equal(product.gender, 'men')
  assert.ok(analysis.extractionMethods.includes('json-ld'))
})

test('generic page: HTML size table is parsed into a chart (cm, body basis)', () => {
  const { product } = run('generic-jsonld.html', 'https://shop.example.com/p/1')
  assert.equal(product.chartSource, 'page')
  assert.equal(product.sizeChart.basis, 'body')
  assert.deepEqual(product.sizeChart.measurements, ['chest', 'waist', 'shoulder'])
  assert.deepEqual(product.sizeChart.rows.map((r) => r.size), ['S', 'M', 'L'])
  assert.deepEqual(product.sizeChart.rows[1].chest, [94, 102])
  assert.deepEqual(product.sizeChart.rows[0].shoulder, [42, 44])
})

test('size table in inches is converted to cm and marked garment basis; "Length" column ignored', () => {
  const { product } = run('size-table-inches.html', 'https://x.example/graphic-tee')
  assert.equal(product.sizeChart.basis, 'garment')
  assert.deepEqual(product.sizeChart.rows[0].chest, [101.6, 101.6])
  assert.deepEqual(product.sizeChart.measurements, ['chest'])
})

test('Open Graph only: still yields a usable product, with honest warnings', () => {
  const { product, analysis } = run('og-only.html', 'https://store.example.com/court-classic-low-sneakers')
  assert.equal(product.name, 'Court Classic Low Sneakers')
  assert.equal(product.price, 3499)
  assert.equal(product.category, 'shoes')
  assert.equal(product.chartSource, 'none')
  assert.ok(analysis.warnings.some((w) => /size chart/i.test(w)))
  assert.ok(analysis.warnings.some((w) => /No sizes/i.test(w)))
})

test('Amazon India reader: title, brand, price, sizes, stock, breadcrumbs, material', () => {
  const { product, analysis } = run('amazon-like.html', 'https://www.amazon.in/dp/B0TEST1234')
  assert.equal(analysis.store, 'amazon')
  assert.equal(product.name, "Kasa & Co Men's Slim Fit Chinos")
  assert.equal(product.brand, 'Kasa & Co')
  assert.equal(product.price, 1799)
  assert.deepEqual(product.allSizes, ['30', '32', '34', '36'])
  assert.deepEqual(product.availableSizes, ['30', '32', '34'], '36 is marked unavailable')
  assert.equal(product.material, '97% Cotton, 3% Elastane')
  assert.equal(product.fit, 'Slim Fit')
  assert.ok(product.images.length >= 2)
  assert.equal(product.category, 'bottomwear')
  assert.equal(product.sourceSite, 'amazon')
})

test('Amazon CAPTCHA page is reported as blocked, never parsed', () => {
  fails('amazon-captcha.html', 'https://www.amazon.in/dp/B0X', 'blocked_by_site')
})
test('Cloudflare challenge is reported as blocked', () => {
  fails('cloudflare.html', 'https://www.example.com/p/1', 'blocked_by_site')
})

test('Myntra reader: state JSON, availability, image placeholders, taxonomy, braces inside strings', () => {
  const { product, analysis } = run('myntra-like.html', 'https://www.myntra.com/jeans/indigo-lane/slim-jeans/1234/buy')
  assert.equal(analysis.store, 'myntra')
  assert.equal(product.name, 'Indigo Lane Men Slim Fit Stretchable Jeans')
  assert.equal(product.brand, 'Indigo Lane')
  assert.equal(product.price, 2299)
  assert.deepEqual(product.allSizes, ['30', '32', '34', '36'])
  assert.deepEqual(product.availableSizes, ['30', '32', '36'])
  assert.equal(product.images[0].src, 'https://assets.example.com/h_720,q_90,w_540/jeans-1.jpg')
  assert.equal(product.category, 'bottomwear')
  assert.equal(product.gender, 'men')
  assert.equal(product.rating, 4.3)
})

test('Ajio reader: deep-found variants and stock levels', () => {
  const { product, analysis } = run('ajio-like.html', 'https://www.ajio.com/atelier-mori-pleated-trousers/p/469999')
  assert.equal(analysis.store, 'ajio')
  assert.deepEqual(product.allSizes, ['S', 'M', 'L'])
  assert.deepEqual(product.availableSizes, ['S', 'M'])
  assert.equal(product.category, 'bottomwear')
  assert.equal(product.gender, 'women')
})

test('Flipkart: JSON-LD plus size swatches', () => {
  const { product, analysis } = run('flipkart-like.html', 'https://www.flipkart.com/stridewell-cloud-runner/p/itm123')
  assert.equal(analysis.store, 'flipkart')
  assert.equal(product.name, 'Stridewell Cloud Runner Running Shoes For Men')
  assert.equal(product.price, 4999)
  assert.deepEqual(product.allSizes, ['UK 7', 'UK 8', 'UK 9'])
  assert.deepEqual(product.availableSizes, ['UK 7', 'UK 8'])
  assert.equal(product.category, 'shoes')
})

test('a broken store-specific state must not break the analysis (falls back to Open Graph)', () => {
  const { product, analysis } = run('broken-state.html', 'https://www.myntra.com/jeans/x/1/buy')
  assert.equal(product.name, 'Men Regular Jeans')
  assert.equal(product.category, 'bottomwear')
  assert.ok(!analysis.extractionMethods.includes('myntra-adapter'))
})

test('page with no product data -> no_product_data', () => {
  fails('no-product.html', 'https://example.com/', 'no_product_data')
})

test('result shape is what the frontend expects', () => {
  const { product } = run('generic-jsonld.html', 'https://shop.example.com/a')
  for (const k of ['id', 'source', 'sourceSite', 'productUrl', 'name', 'brand', 'category', 'price', 'image', 'images', 'allSizes', 'availableSizes', 'sizeChart', 'chartSource']) {
    assert.ok(k in product, `missing ${k}`)
  }
  assert.match(product.id, /^ext-[0-9a-f]{12}$/)
  assert.equal(product.source, 'external')
})

test('hostile page content cannot inject markup into text fields (kept as plain text)', () => {
  const html = '<html><head><meta property="og:type" content="product"><meta property="og:title" content="Tee &lt;script&gt;alert(1)&lt;/script&gt;"><meta property="og:image" content="javascript:alert(1)"></head></html>'
  const { product } = analyzeHtml({ html, url: 'https://x.example/tee' })
  assert.ok(!product.images.some((i) => i.src.startsWith('javascript:')), 'non-http image URL must not survive')
})

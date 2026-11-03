import { detectCategory, detectGender } from '../../shared/categoryDetection.js'
import { PRODUCTS } from '../data/products'
import { genericChartFor } from '../data/sizeCharts'
import { looksNonClothing, quickRejectUrl } from '../../shared/pageClassification.js'
import { USE_MOCK, apiClient, delay } from './apiClient'

const fail = (code, message) => Object.assign(new Error(message), { code })

// REAL: the backend fetches the page and reads it. Browsers cannot do this themselves (CORS), and
// the server enforces SSRF protection. Resolves to { product, analysis }.
const remote = {
  async analyze({ url }) {
    const { data } = await apiClient.post('/analyze-product', { url }, { timeout: 90000 }) // a browser step can take a while
    return data
  },
  // What this server can do, so the screen only offers features that will work.
  async getCapabilities() {
    const { data } = await apiClient.get('/analyze-product/config')
    return { chartReader: Boolean(data.chartReader) }
  },
  // A screenshot of ANY store's size chart, read with AI on the server. Resolves to a chart (in cm).
  async readChartImage(file, category) {
    const form = new FormData()
    form.append('image', file, file.name || 'chart.png')
    if (category) form.append('category', category)
    const { data } = await apiClient.post('/analyze-product/chart-image', form, { timeout: 90000 })
    return data.chart
  },
}

// DEMO (VITE_USE_MOCK=true): reads NOTHING from the page. It guesses the category from words in the
// link and returns a sample product. Try links containing "jeans", "shirt", "shoes" or "cap";
// a link containing "blocked" simulates a store that refuses access.
const mock = {
  async getCapabilities() {
    return { chartReader: true }
  },
  // Demo: returns a sample chart for the category, NOT read from the picture.
  async readChartImage(file, category) {
    await delay(1100)
    const sample = genericChartFor(category, 'men')
    if (!sample) throw fail('chart_unreadable', 'That product type has no size chart to read.')
    return { ...sample, id: 'ai-chart', name: 'Size chart read by AI', basis: 'body', source: 'ai', notes: 'Demo mode: this is a sample chart, not read from your picture.' }
  },
  async analyze({ url }) {
    await delay(900)
    const href = /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`
    const parsed = new URL(href)
    const quick = quickRejectUrl(href)
    if (quick) throw fail(quick.code, quick.message)
    if (/blocked/i.test(href)) throw fail('blocked_by_site', 'This store blocked automated access to the page.')
    const detected = detectCategory({ title: '', urlPath: decodeURIComponent(parsed.pathname) })
    const word = !detected.category && looksNonClothing(decodeURIComponent(parsed.pathname))
    if (word) throw fail('not_clothing', `This looks like a "${word}" product, not clothing, footwear, or a cap or hat. VirtualFit only works out sizes for those.`)
    const sample = PRODUCTS.find((p) => p.category === detected.category)
    if (!sample) {
      throw fail('no_product_data', 'Demo mode can only recognise links that contain words like jeans, shirt, hoodie, shoes or cap.')
    }
    return {
      product: {
        ...sample,
        id: `ext-demo-${sample.id}`,
        source: 'external',
        sourceSite: parsed.hostname.replace(/^www\./, ''),
        productUrl: href,
        gender: detectGender(decodeURIComponent(parsed.pathname)) ?? sample.gender,
        allSizes: sample.sizeChart.rows.map((r) => r.size),
        chartSource: 'page',
      },
      analysis: {
        detectedCategory: { category: detected.category, confidence: detected.confidence, reason: null, signals: detected.signals.slice(0, 4) },
        extractionMethods: ['demo-mode'],
        fieldsFound: ['name', 'brand', 'price', 'image', 'allSizes', 'sizeChart'],
        warnings: ['Demo mode: this is sample data, not read from the page you pasted.'],
        store: 'demo',
        analyzedAt: new Date().toISOString(),
      },
    }
  },
}

export const productAnalysisService = USE_MOCK ? mock : remote

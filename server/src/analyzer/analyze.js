import * as cheerio from 'cheerio'
import crypto from 'node:crypto'
import { detectCategory, detectGender } from '../../../shared/categoryDetection.js'
import { AnalyzeError } from './errors.js'
import { fromJsonLd, fromOpenGraph, jsonLdSummary } from './extractors.js'
import { looksNonClothing, quickRejectUrl } from '../../../shared/pageClassification.js'
import { extractSizeChart } from './sizeTables.js'
import { findEmbeddedChart, findChartInJson, findChartText, findChartImages, findChartLinks, textTokens, splitPanelText, findChartInTokens } from './chartFinder.js'
import { adapterFor } from './sites/index.js'
import { looksBlocked } from './blockDetection.js'
import { clean, uniqueSizes, parsePrice } from './util.js'

const first = (...values) => values.find((v) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length))

function absolutize(src, base) {
  try {
    const u = new URL(src, base)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null
  } catch {
    return null
  }
}

// Pure function: HTML in, structured product out. No network access, so it is easy to test.
export function analyzeHtml({ html, url }) {
  if (looksBlocked(html)) throw new AnalyzeError('blocked_by_site', 'This store blocked automated access to the page.')

  const $ = cheerio.load(html)
  const page = new URL(url)
  const adapter = adapterFor(page.hostname)

  const ld = fromJsonLd($)
  const og = fromOpenGraph($)
  let site = null
  try {
    site = adapter?.read($) ?? null
  } catch {
    site = null // a broken adapter must never break the whole analysis
  }
  const tableChart = extractSizeChart($)
  const embeddedChart = tableChart ? null : findEmbeddedChart($)
  const gridChart = tableChart || embeddedChart ? null : findChartInTokens(textTokens($))
  const chart = tableChart ?? embeddedChart ?? gridChart
  // Hints for a size chart we could not read: loose text, or a picture. Used by the AI reader, if enabled.
  const links = chart ? { pages: [], images: [] } : findChartLinks($, url)
  const hints = chart
    ? { chartText: null, chartImages: [], chartLinks: links }
    : { chartText: findChartText(cheerio.load(html)), chartImages: [...new Set([...findChartImages($, url), ...links.images])].slice(0, 3), chartLinks: links }

  // Precedence: store-specific reader, then JSON-LD, then Open Graph.
  const sources = [site, ld, og].filter(Boolean)
  const get = (key) => first(...sources.map((s) => s[key]))
  const methods = [site && `${adapter.id}-adapter`, ld?.name && 'json-ld', og && 'open-graph', tableChart && 'html-size-table', embeddedChart && 'embedded-chart', gridChart && 'text-grid'].filter(Boolean)

  // A category, search or collection page lists many products. Never pick one of them by accident.
  const kind = jsonLdSummary($)
  const listingType = ['itemlist', 'collectionpage', 'searchresultspage', 'offercatalog', 'productcollection'].some((t) => kind.types.has(t))
  if ((listingType && kind.productCount !== 1) || kind.productCount >= 3) {
    throw new AnalyzeError('not_a_product_page', 'This looks like a list of products (a category or search page), not one product. Click a single product, then paste its link.')
  }

  const name = clean(get('name'))
  if (!name || !(ld?.name || site?.name || get('price') || get('images'))) {
    throw new AnalyzeError('no_product_data', 'We could not find product details on that page. Make sure it is a single product page.')
  }

  const images = [...new Set((get('images') ?? []).map((s) => absolutize(s, url)).filter(Boolean))].slice(0, 8)
  const allSizes = uniqueSizes([...(site?.allSizes ?? []), ...(site?.sizes ?? []), ...(ld?.sizes ?? [])])
  const availableSizes = site?.sizes?.length ? uniqueSizes(site.sizes) : allSizes

  // A store home page also has a title and a picture. A product page has product details.
  const evidence = Boolean(ld?.name || site?.name || /product/i.test(og?.type ?? '') || og?.price || (allSizes.length >= 2 && get('price')))
  if (!evidence) {
    throw new AnalyzeError('not_a_product_page', 'This does not look like the page of a single product: no price, sizes or product details were found. Open one product, then paste its link.', { retryable: true })
  }

  const categoryText = [site?.categoryText, ld?.categoryText].filter(Boolean).join(' > ')
  const detected = detectCategory({ title: name, categoryText, urlPath: page.pathname })
  if (!detected.category) {
    const word = looksNonClothing(name, categoryText, page.pathname)
    if (word) {
      throw new AnalyzeError('not_clothing', `This looks like a "${word}" product, not clothing, footwear, or a cap or hat. VirtualFit only works out sizes for those.`)
    }
    if (!allSizes.length && !chart) {
      throw new AnalyzeError('not_clothing', 'We could not tell that this is a clothing, footwear or cap page: no clothing words, sizes or size chart were found. Make sure you pasted the link of a clothing product.', { retryable: true })
    }
  }
  const gender = site?.gender ?? detectGender(name, categoryText, page.pathname)

  const product = {
    id: `ext-${crypto.createHash('sha1').update(url).digest('hex').slice(0, 12)}`,
    source: 'external',
    sourceSite: adapter?.id ?? page.hostname.replace(/^www\./, ''),
    productUrl: url,
    name,
    brand: clean(get('brand')),
    category: detected.category,
    gender,
    price: parsePrice(get('price')),
    currency: get('currency') ?? 'INR',
    image: images[0] ?? null,
    images: images.map((src, i) => ({ view: `image-${i + 1}`, src, alt: `${name}, image ${i + 1}` })),
    rating: get('rating') ?? null,
    reviewCount: get('reviewCount') ?? null,
    description: clean(get('description')).slice(0, 600),
    color: clean(get('color')),
    colors: get('color') ? [{ name: clean(get('color')), hex: '#cfd4dc' }] : [],
    material: clean(get('material')),
    fit: clean(site?.fit ?? ''),
    allSizes,
    availableSizes,
    sizeChart: chart,
    chartSource: chart ? 'page' : 'none',
  }

  const found = ['name', 'brand', 'price', 'image', 'allSizes', 'sizeChart', 'description']
    .filter((k) => (k === 'image' ? product.image : k === 'allSizes' ? product.allSizes.length : product[k]))
  const warnings = []
  if (!product.allSizes.length) warnings.push('No sizes were found on the page.')
  if (!chart) warnings.push('No size chart could be read from this page. Many stores only load their chart when you click "Size chart", or show it as a picture.')
  if (!product.price) warnings.push('The price could not be read.')

  return {
    hints,
    product,
    analysis: {
      detectedCategory: { category: detected.category, confidence: detected.confidence, reason: detected.reason ?? null, signals: detected.signals.slice(0, 6) },
      extractionMethods: methods,
      fieldsFound: found,
      warnings,
      store: adapter?.id ?? 'other',
      analyzedAt: new Date().toISOString(),
    },
  }
}

const CATEGORIES = ['topwear', 'bottomwear', 'shoes', 'headwear']

// Orchestrates the layers, cheapest first: the page as downloaded, then linked chart pages or data, then
// (if enabled) a real browser that opens the "Size chart" panel, then (if enabled) AI reading a picture.
export function createAnalyzer(fetchPage, { chartReader, fetchImage, fetchResource, browser } = {}) {
  const adopt = (parsed, chart, method) => {
    const { product, analysis } = parsed
    product.sizeChart = chart
    product.chartSource = 'page'
    analysis.extractionMethods.push(method)
    if (!analysis.fieldsFound.includes('sizeChart')) analysis.fieldsFound.push('sizeChart')
    analysis.warnings = analysis.warnings.filter((w) => !w.startsWith('No size chart'))
  }

  async function chartFromLinks(links) {
    for (const url of links.pages.slice(0, 3)) {
      try {
        const { buffer, type } = await fetchResource(url)
        const text = buffer.toString('utf8')
        if (/json/i.test(type)) {
          const chart = findChartInJson(JSON.parse(text))
          if (chart) return chart
        } else if (/html/i.test(type)) {
          const $ = cheerio.load(text)
          const chart = extractSizeChart($) ?? findEmbeddedChart($)
          if (chart) return chart
        }
      } catch { /* a link that fails must never fail the analysis */ }
    }
    return null
  }

  const tryAnalyze = (html, url) => {
    try { return analyzeHtml({ html, url }) } catch { return null }
  }

  return async function analyzeUrl(rawUrl) {
    fetchPage.validate?.(rawUrl) // unsafe addresses are refused first, whatever else is wrong with them
    // Obvious non-product links (a home page, a search, a cart) are refused before anything is downloaded.
    const quick = quickRejectUrl(rawUrl)
    if (quick) throw new AnalyzeError(quick.code, quick.message)
    const page = await fetchPage(rawUrl)
    let rendered = null
    let parsed
    try {
      parsed = analyzeHtml({ html: page.html, url: page.finalUrl })
    } catch (err) {
      // An empty page shell means the content needs scripts. A browser can help; a block page is never retried.
      if (!(err.code === 'no_product_data' || err.retryable) || !browser) throw err
      rendered = await browser.render(page.finalUrl).catch(() => null)
      if (!rendered) throw err
      parsed = analyzeHtml({ html: rendered.html, url: page.finalUrl })
      parsed.analysis.extractionMethods.push('browser')
    }
    const { product, analysis } = parsed
    let { hints } = parsed

    if (!product.sizeChart && fetchResource && hints.chartLinks.pages.length) {
      const chart = await chartFromLinks(hints.chartLinks)
      if (chart) adopt(parsed, chart, 'chart-link')
    }

    if (!product.sizeChart && browser) {
      rendered ??= await browser.render(page.finalUrl).catch(() => null)
      if (rendered) {
        const again = tryAnalyze(rendered.html, page.finalUrl)
        let chart = again?.product.sizeChart ?? null
        if (!chart && rendered.panelText) chart = findChartInTokens(splitPanelText(rendered.panelText))
        for (const blob of chart ? [] : rendered.json ?? []) {
          chart = findChartInJson(blob)
          if (chart) break
        }
        if (chart) adopt(parsed, chart, 'browser')
        else if (again) hints = { ...again.hints, modalScreenshot: rendered.modalScreenshot }
        else hints = { ...hints, modalScreenshot: rendered.modalScreenshot }
      }
    }

    if (!product.sizeChart && (hints.chartText || hints.chartImages.length || hints.modalScreenshot)) {
      const category = CATEGORIES.includes(product.category) ? product.category : undefined
      if (chartReader?.enabled) {
        let chart = null
        if (hints.modalScreenshot) chart = await chartReader.fromImage(hints.modalScreenshot, category).catch(() => null)
        if (!chart && hints.chartText) chart = await chartReader.fromText(hints.chartText, category).catch(() => null)
        for (const url of chart ? [] : hints.chartImages.slice(0, 2)) {
          try {
            chart = await chartReader.fromImage(await fetchImage(url), category)
            break
          } catch { /* try the next picture */ }
        }
        if (chart) {
          analysis.suggestedChart = chart
          analysis.extractionMethods.push('ai-chart')
          analysis.warnings.push('This page has a size chart that we read with AI. Please check the numbers before using it.')
        } else {
          analysis.warnings.push('This page has a size chart, but we could not read it. Upload a screenshot of it, or enter it by hand.')
        }
      } else {
        analysis.warnings.push('This page seems to show its size chart as a picture or script. Upload a screenshot of it, or enter it by hand.')
      }
    }
    return { product, analysis }
  }
}

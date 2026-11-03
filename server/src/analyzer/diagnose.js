import * as cheerio from 'cheerio'
import { clean } from './util.js'
import { looksBlocked } from './blockDetection.js'
import { collectEmbedded, findChartImages, findChartLinks } from './chartFinder.js'
import { extractSizeChart } from './sizeTables.js'

// Describes what a page actually contains, in terms of size-chart evidence. Used by the `analyze` command
// to answer "why was no chart found on this store?" without guessing.
function sizeKeyPaths(root, out = [], path = '$', depth = 0) {
  if (!root || typeof root !== 'object' || depth > 9 || out.length >= 15) return out
  for (const [key, value] of Object.entries(root)) {
    const here = Array.isArray(root) ? `${path}[${key}]` : `${path}.${key}`
    if (/size|measure/i.test(key) && !Array.isArray(root)) {
      const shape = Array.isArray(value) ? `array(${value.length})` : value && typeof value === 'object' ? `object{${Object.keys(value).slice(0, 5).join(',')}}` : `"${String(value).slice(0, 60)}"`
      out.push(`${here} = ${shape}`)
    }
    sizeKeyPaths(value, out, here, depth + 1)
    if (out.length >= 15) break
  }
  return out
}

export function diagnose(html, url) {
  const $ = cheerio.load(html)
  const text = $('body').text()
  const embedded = collectEmbedded($)
  const tables = $('table').toArray()
  const buttons = $('button, a, [role="button"]').toArray().filter((el) => /size\s*(chart|guide)/i.test(clean($(el).text()) + ' ' + ($(el).attr('aria-label') ?? '')))
  const ld = $('script[type="application/ld+json"]').toArray().map((el) => $(el).contents().text())
  const links = findChartLinks($, url)
  return {
    bytes: Buffer.byteLength(html),
    title: clean($('title').first().text()).slice(0, 120),
    blocked: looksBlocked(html),
    looksLikeEmptyShell: clean(text).length < 400 && $('script').length > 3,
    jsonLdProduct: ld.some((t) => /"@type"\s*:\s*"?Product/i.test(t)),
    embeddedJsonBlobs: embedded.length,
    sizeKeyPaths: embedded.flatMap((blob) => sizeKeyPaths(blob)).slice(0, 15),
    tables: { total: tables.length, readableSizeChart: Boolean(extractSizeChart($)) },
    sizeChartButtons: buttons.length,
    mentionsSizeChart: /size\s*(chart|guide)/i.test(html),
    chartLinks: links,
    chartImages: findChartImages($, url),
  }
}

// Plain-language next step, from the evidence.
export function advise(d, { browserOn, aiOn, chartFound }) {
  if (d.blocked) return 'The store blocked the request (bot protection). VirtualFit does not bypass that. Use "Upload a screenshot of the size chart" in the app, or enter the chart by hand.'
  if (chartFound) return 'A size chart was read. If the numbers look wrong, tell the developer which store and link.'
  const tips = []
  if (d.looksLikeEmptyShell) tips.push('The page arrived almost empty: its content is built by scripts. Turn on the browser step (ANALYZER_USE_BROWSER=true).')
  if (d.sizeChartButtons && !browserOn) tips.push('The page has a "Size chart" button, so the chart probably loads on click. Turn on the browser step (ANALYZER_USE_BROWSER=true).')
  if (d.chartImages.length && !aiOn) tips.push('The chart looks like a picture. Set ANTHROPIC_API_KEY to read pictures, or use "Upload a screenshot" / enter it by hand.')
  if (!tips.length) tips.push('No chart evidence was found in the page as downloaded. Try the browser step, or upload a screenshot of the chart.')
  return tips.join(' ')
}

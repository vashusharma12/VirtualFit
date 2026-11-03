import { clean, uniqueSizes } from '../util.js'

// Flipkart. UNVERIFIED against live pages. Flipkart ships JSON-LD with the main product data (handled
// by the generic reader) but uses generated class names, so this adapter only reads size swatches
// by their stable-looking id pattern and the breadcrumb links.
export const id = 'flipkart'
export const matches = (host) => /(^|\.)flipkart\.com$/.test(host)

export function read($) {
  const swatches = $('[id^="swatch-"][id$="-size"]').toArray()
  const labels = uniqueSizes(swatches.map((el) => $(el).text()))
  const disabled = uniqueSizes(swatches.filter((el) => /disabled|unavailable/i.test(`${$(el).attr('class') ?? ''} ${$(el).find('a').attr('class') ?? ''}`)).map((el) => $(el).text()))
  const breadcrumbs = $('a[href^="/"]').toArray().filter((a) => $(a).closest('[class*="readcrumb"]').length).map((a) => clean($(a).text())).filter(Boolean)

  if (!labels.length && !breadcrumbs.length) return null
  return {
    allSizes: labels,
    sizes: labels.filter((s) => !disabled.includes(s)),
    categoryText: breadcrumbs.join(' > '),
    breadcrumbs,
    currency: 'INR',
  }
}

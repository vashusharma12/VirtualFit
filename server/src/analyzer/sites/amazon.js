import { clean, parsePrice, uniqueSizes } from '../util.js'

// Amazon India. UNVERIFIED against live pages (they cannot be reached from the development
// sandbox); selectors follow Amazon's long-standing element ids, which change rarely but can.
// Amazon often serves a CAPTCHA to automated requests: that is detected upstream as blocked_by_site.
export const id = 'amazon'
export const matches = (host) => /(^|\.)amazon\.in$|(^|\.)amzn\.in$/.test(host)

export function read($) {
  const name = clean($('#productTitle').first().text())
  if (!name) return null

  const byline = clean($('#bylineInfo').first().text())
  const brand = byline.replace(/^(Visit the|Brand:)\s*/i, '').replace(/\s*Store$/i, '').trim()

  const price = parsePrice($('.priceToPay .a-offscreen, #corePrice_feature_div .a-offscreen, .a-price .a-offscreen').first().text())

  let images = []
  const hires = $('#landingImage').attr('data-old-hires')
  if (hires) images.push(hires)
  try {
    images.push(...Object.keys(JSON.parse($('#landingImage').attr('data-a-dynamic-image') ?? '{}')))
  } catch {
    /* ignore */
  }
  images = [...new Set(images)]

  const sizeOptions = $('#native_dropdown_selected_size_name option')
    .toArray()
    .filter((o) => $(o).attr('value') && $(o).attr('value') !== '-1')
    .map((o) => $(o).text())
  const sizeTiles = $('#variation_size_name li, #inline-twister-expander-content-size_name li')
    .toArray()
    .map((li) => $(li).text())
  const unavailable = $('#variation_size_name li.swatchUnavailable, #variation_size_name li[class*="unavailable"]')
    .toArray()
    .map((li) => $(li).text())
  const allSizes = uniqueSizes([...sizeOptions, ...sizeTiles])
  const outOfStock = new Set(uniqueSizes(unavailable))

  const breadcrumbs = $('#wayfinding-breadcrumbs_feature_div li a')
    .toArray()
    .map((a) => clean($(a).text()))
    .filter(Boolean)

  const details = {}
  $('#productOverview_feature_div tr, #detailBullets_feature_div li').each((_, el) => {
    const label = clean($(el).find('td:first-child, .a-text-bold').first().text()).replace(/[:\u200e\u200f]/g, '').trim()
    const value = clean($(el).find('td:last-child, span:not(.a-text-bold)').last().text())
    if (label && value) details[label.toLowerCase()] = value
  })

  return {
    name, brand, price, currency: 'INR', images,
    allSizes, sizes: allSizes.filter((s) => !outOfStock.has(s)),
    categoryText: breadcrumbs.join(' > '), breadcrumbs,
    material: details.material ?? details['material composition'] ?? '',
    color: details.colour ?? details.color ?? '',
    fit: details['fit type'] ?? '',
    description: clean($('#feature-bullets li').toArray().map((li) => $(li).text()).join(' ')),
  }
}

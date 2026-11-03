import { extractAssignedJson, clean, parsePrice, uniqueSizes } from '../util.js'

// Myntra. UNVERIFIED against live pages. Myntra pages embed product data as `window.__myx = {...}`
// (pdpData); field names below are the ones commonly seen there, read defensively so a renamed
// field degrades to "not found" instead of breaking the analysis.
export const id = 'myntra'
export const matches = (host) => /(^|\.)myntra\.com$/.test(host)

const sized = (url) => String(url ?? '').replace(/\(\$height\)/g, '720').replace(/\(\$width\)/g, '540').replace(/\(\$qualityPercentage\)/g, '90')

export function read($) {
  const state = extractAssignedJson($, /window\.__myx\s*=\s*\{/)
  const pdp = state?.pdpData
  if (!pdp?.name) return null

  const sizes = Array.isArray(pdp.sizes) ? pdp.sizes : []
  const labels = uniqueSizes(sizes.map((s) => s?.label))
  const available = uniqueSizes(sizes.filter((s) => s?.available !== false && s?.inventory !== 0).map((s) => s?.label))
  const a = pdp.analytics ?? {}

  return {
    name: clean([pdp.brand?.name, pdp.name].filter(Boolean).join(' ')),
    brand: clean(pdp.brand?.name ?? a.brand),
    price: parsePrice(pdp.price?.discounted ?? pdp.price?.mrp ?? pdp.mrp),
    currency: 'INR',
    images: (pdp.media?.albums?.[0]?.images ?? []).map((i) => sized(i?.imageURL ?? i?.secureSrc)).filter(Boolean),
    allSizes: labels,
    sizes: available,
    // Myntra's own taxonomy (articleType, subCategory such as "Topwear") is a strong category signal.
    categoryText: [a.masterCategory, a.subCategory, a.articleType].filter(Boolean).join(' > '),
    gender: a.gender ? String(a.gender).toLowerCase() : null,
    color: clean(pdp.baseColour ?? a.colour ?? ''),
    rating: parsePrice(pdp.ratings?.averageRating),
    reviewCount: parsePrice(pdp.ratings?.totalCount),
    description: clean(pdp.productDetails?.[0]?.description ?? ''),
  }
}

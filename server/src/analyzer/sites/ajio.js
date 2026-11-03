import { extractAssignedJson, deepFind, clean, parsePrice, uniqueSizes } from '../util.js'

// Ajio. UNVERIFIED against live pages. Ajio is a client-rendered app; structured data is usually in
// JSON-LD (handled by the generic reader). This adapter additionally looks for embedded app state
// and size variants, using deep key search because the exact nesting is not stable.
export const id = 'ajio'
export const matches = (host) => /(^|\.)ajio\.com$/.test(host)

export function read($) {
  const state = extractAssignedJson($, /window\.__PRELOADED_STATE__\s*=\s*\{/)
  if (!state) return null

  const variants = deepFind(state, ['variantOptions'])
  const list = Array.isArray(variants) ? variants : []
  const labels = uniqueSizes(list.map((v) => v?.scDisplaySize ?? v?.size ?? v?.sizeName ?? v?.name))
  const inStock = uniqueSizes(
    list.filter((v) => !/out ?of ?stock/i.test(String(v?.stock?.stockLevelStatus ?? v?.stockLevelStatus ?? ''))).map((v) => v?.scDisplaySize ?? v?.size ?? v?.sizeName ?? v?.name),
  )
  const categoryText = clean([deepFind(state, ['verticalNameText']), deepFind(state, ['segmentNameText']), deepFind(state, ['brickNameText']), deepFind(state, ['categoryName'])].filter((v) => typeof v === 'string').join(' > '))

  if (!labels.length && !categoryText) return null
  return {
    brand: clean(deepFind(state, ['brandName', 'fnlColorVariantData'])?.brandName ?? ''),
    price: parsePrice(deepFind(state, ['offerPrice', 'discountedPrice'])?.value ?? deepFind(state, ['price'])?.value),
    currency: 'INR',
    allSizes: labels,
    sizes: inStock,
    categoryText,
  }
}

import { asArray, clean, parsePrice } from './util.js'

const typeIs = (node, type) => asArray(node?.['@type']).some((t) => String(t).toLowerCase() === type)

// Collects every JSON-LD object on the page, flattening arrays and @graph.
function jsonLdNodes($) {
  const nodes = []
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).contents().text())
      const walk = (n) => {
        if (Array.isArray(n)) return n.forEach(walk)
        if (!n || typeof n !== 'object') return
        nodes.push(n)
        if (n['@graph']) walk(n['@graph'])
      }
      walk(data)
    } catch {
      /* ignore malformed blocks */
    }
  })
  return nodes
}

const imageUrl = (img) => (typeof img === 'string' ? img : img?.url ?? img?.contentUrl ?? null)

function offerInfo(offers) {
  const list = asArray(offers).flatMap((o) => (o?.offers ? asArray(o.offers) : [o]))
  const prices = list.map((o) => parsePrice(o?.price ?? o?.lowPrice)).filter(Boolean)
  return {
    price: prices.length ? Math.min(...prices) : null,
    currency: list.find((o) => o?.priceCurrency)?.priceCurrency ?? null,
    sizes: list.map((o) => o?.size ?? o?.itemOffered?.size).filter(Boolean),
  }
}

// What the page's own structured data says it is: product, list of products, search results, ...
export function jsonLdSummary($) {
  const nodes = jsonLdNodes($)
  return {
    types: new Set(nodes.flatMap((n) => asArray(n['@type']).map((t) => String(t).toLowerCase()))),
    productCount: nodes.filter((n) => typeIs(n, 'product')).length,
  }
}

export function fromJsonLd($) {
  const nodes = jsonLdNodes($)
  const product = nodes.find((n) => typeIs(n, 'product'))
  const crumbs = nodes.find((n) => typeIs(n, 'breadcrumblist'))
  const breadcrumbs = asArray(crumbs?.itemListElement)
    .map((i) => clean(i?.name ?? i?.item?.name))
    .filter(Boolean)
  if (!product) return breadcrumbs.length ? { breadcrumbs } : null
  const offer = offerInfo(product.offers)
  return {
    name: clean(product.name),
    brand: clean(typeof product.brand === 'string' ? product.brand : product.brand?.name),
    description: clean(product.description),
    images: asArray(product.image).map(imageUrl).filter(Boolean),
    price: offer.price,
    currency: offer.currency,
    sizes: asArray(product.size).concat(offer.sizes),
    color: clean(asArray(product.color)[0]),
    material: clean(asArray(product.material)[0]),
    categoryText: [clean(asArray(product.category)[0]), ...breadcrumbs].filter(Boolean).join(' > '),
    breadcrumbs,
    rating: parsePrice(product.aggregateRating?.ratingValue),
    reviewCount: parsePrice(product.aggregateRating?.reviewCount ?? product.aggregateRating?.ratingCount),
  }
}

export function fromOpenGraph($) {
  const meta = (name) => clean($(`meta[property="${name}"], meta[name="${name}"]`).first().attr('content'))
  const name = meta('og:title') || meta('twitter:title') || clean($('title').first().text())
  if (!name) return null
  return {
    name,
    type: meta('og:type'),
    brand: meta('product:brand') || meta('og:brand'),
    description: meta('og:description') || meta('description'),
    images: [meta('og:image'), meta('twitter:image')].filter(Boolean),
    price: parsePrice(meta('product:price:amount') || meta('og:price:amount')),
    currency: meta('product:price:currency') || meta('og:price:currency') || null,
  }
}

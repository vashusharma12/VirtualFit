import { SIZE_CHARTS } from './sizeCharts'
import { VIEWS, makeProductArt } from '../utils/productArt'

// DEMO CATALOG. Brands and products are fictional. Images are generated illustrations.
// Phase 7 produces products in this same shape from real product links.
const C = {
  white: { name: 'White', hex: '#f1f1ee' }, black: { name: 'Black', hex: '#23262d' }, navy: { name: 'Navy', hex: '#2f4b7c' },
  olive: { name: 'Olive', hex: '#6b7a4f' }, sand: { name: 'Sand', hex: '#d2bd96' }, grey: { name: 'Grey', hex: '#8c929c' },
  rust: { name: 'Rust', hex: '#b5593b' }, sky: { name: 'Sky Blue', hex: '#8fb4d9' }, indigo: { name: 'Indigo', hex: '#34476b' },
  stone: { name: 'Stone', hex: '#bdb5a6' }, forest: { name: 'Forest', hex: '#34594a' }, blush: { name: 'Blush', hex: '#e2b8b0' },
  cream: { name: 'Cream', hex: '#efe6d2' }, charcoal: { name: 'Charcoal', hex: '#3d4048' }, tan: { name: 'Tan', hex: '#a9795a' },
}

// [id, name, brand, category, subtype, price, rating, reviews, chartId, fit, gender, colors, material, description, unavailableSizes]
const RAW = [
  ['p-001', 'Everyday Crew Tee', 'Northwind', 'topwear', 'tshirt', 799, 4.4, 1284, 'tops-men', 'Regular', 'men', ['white', 'black', 'navy'], '100% combed cotton, 180 GSM', 'A soft, mid-weight crew neck tee made for daily wear. Holds its shape wash after wash.', ['XXL']],
  ['p-002', 'Oxford Button-Down Shirt', 'Kasa & Co', 'topwear', 'shirt', 1899, 4.3, 642, 'tops-men', 'Regular', 'men', ['sky', 'white', 'navy'], '100% cotton oxford weave', 'A classic button-down with a structured collar and a chest pocket. Smart enough for work, easy enough for weekends.', []],
  ['p-003', 'Relaxed Linen Shirt', 'Atelier Mori', 'topwear', 'shirt', 2799, 4.5, 318, 'tops-women', 'Relaxed', 'women', ['cream', 'olive', 'blush'], '100% European linen', 'A breathable linen shirt with a relaxed drape and dropped shoulders. Gets softer with every wash.', ['XL']],
  ['p-004', 'Heavyweight Hoodie', 'Indigo Lane', 'topwear', 'hoodie', 2499, 4.6, 905, 'tops-men', 'Oversized', 'unisex', ['charcoal', 'sand', 'forest'], '80% cotton, 20% recycled polyester fleece, 400 GSM', 'A thick brushed-fleece hoodie with a double-lined hood and a roomy kangaroo pocket. Cut oversized, so many people size down.', []],
  ['p-005', 'Ribbed Fitted Tee', 'Tidal', 'topwear', 'tshirt', 899, 4.2, 731, 'tops-women', 'Slim', 'women', ['white', 'black', 'rust'], '95% cotton, 5% elastane rib knit', 'A close-fitting rib knit tee with stretch for easy movement. Sits neatly at the waist.', ['XS']],
  ['p-006', 'Performance Training Tee', 'Northwind', 'topwear', 'tshirt', 1199, 4.1, 459, 'tops-men', 'Athletic', 'men', ['black', 'grey', 'indigo'], '100% recycled polyester, moisture-wicking', 'A light, quick-dry tee with flatlock seams that will not chafe. Built for gym and run days.', []],
  ['p-007', 'Boxy Graphic Tee', 'Kasa & Co', 'topwear', 'tshirt', 1299, 4.0, 276, 'tops-men', 'Boxy', 'unisex', ['stone', 'rust', 'black'], '100% cotton, 220 GSM', 'A boxy, slightly cropped tee in heavy cotton with a small chest print. Roomy through the body.', ['S']],
  ['p-008', 'Wool-Blend Overshirt', 'Atelier Mori', 'topwear', 'overshirt', 4499, 4.7, 187, 'tops-men', 'Regular', 'men', ['olive', 'charcoal', 'tan'], '60% wool, 40% polyester, lined collar', 'A heavy overshirt that works as a light jacket. Two chest pockets and a button-through front.', ['S', 'XXL']],

  ['p-009', 'Slim-Fit Stretch Jeans', 'Indigo Lane', 'bottomwear', 'jeans', 2299, 4.4, 1522, 'bottoms-men', 'Slim', 'men', ['indigo', 'black', 'grey'], '98% cotton, 2% elastane denim, 11 oz', 'A slim, tapered jean with a little stretch so it moves with you. Mid-rise with a button fly.', ['38']],
  ['p-010', 'Straight Chinos', 'Kasa & Co', 'bottomwear', 'chinos', 1799, 4.3, 864, 'bottoms-men', 'Straight', 'men', ['sand', 'navy', 'olive'], '97% cotton, 3% elastane twill', 'Clean, straight-leg chinos in a soft twill. Easy to dress up or down.', []],
  ['p-011', 'High-Rise Wide-Leg Jeans', 'Indigo Lane', 'bottomwear', 'jeans', 2699, 4.5, 593, 'bottoms-women', 'Wide leg', 'women', ['sky', 'indigo', 'black'], '100% cotton denim, 12 oz', 'A high-rise jean with a wide, full-length leg. Rigid denim that softens over time.', ['XL']],
  ['p-012', 'Tapered Joggers', 'Northwind', 'bottomwear', 'joggers', 1499, 4.2, 1018, 'bottoms-men', 'Tapered', 'men', ['charcoal', 'navy', 'grey'], '70% cotton, 30% polyester fleece', 'Brushed-fleece joggers with an elastic drawstring waist and ribbed cuffs.', []],
  ['p-013', 'Utility Cargo Pants', 'Northwind', 'bottomwear', 'chinos', 1999, 4.0, 347, 'bottoms-men', 'Relaxed', 'men', ['olive', 'sand', 'black'], '100% cotton ripstop', 'Relaxed cargo pants with roomy thigh pockets and a tapered leg. Tough ripstop cotton that softens with wear.', ['36']],
  ['p-014', 'Linen Drawstring Shorts', 'Tidal', 'bottomwear', 'shorts', 1099, 4.1, 402, 'bottoms-men', 'Relaxed', 'men', ['sand', 'sky', 'olive'], '55% linen, 45% cotton', 'Lightweight shorts for hot days, with a drawstring waist and side pockets.', ['28']],
  ['p-015', 'Pleated Trousers', 'Atelier Mori', 'bottomwear', 'chinos', 3299, 4.6, 233, 'bottoms-women', 'Tailored', 'women', ['cream', 'black', 'charcoal'], '65% viscose, 33% polyester, 2% elastane', 'High-waisted tailored trousers with a front pleat and a tapered ankle.', ['XS']],

  ['p-016', 'Cloud Runner Sneakers', 'Stridewell', 'shoes', 'sneaker', 4999, 4.5, 2310, 'shoes-men', 'True to size', 'men', ['white', 'grey', 'navy'], 'Engineered mesh upper, EVA midsole', 'Cushioned everyday running shoes with a breathable mesh upper and a lightweight sole.', ['UK 11']],
  ['p-017', 'Court Classic Low', 'Stridewell', 'shoes', 'sneaker', 3499, 4.3, 1487, 'shoes-men', 'True to size', 'men', ['white', 'black', 'cream'], 'Full-grain leather, rubber cupsole', 'A clean low-top court sneaker in smooth leather. Goes with nearly everything.', []],
  ['p-018', 'Trail Grip Boots', 'Stridewell', 'shoes', 'boots', 6499, 4.6, 512, 'shoes-men', 'Runs half a size small', 'men', ['tan', 'olive', 'black'], 'Waterproof suede, Vibram-style lug sole', 'Ankle boots with a waterproof upper and a deep-lug outsole for wet, uneven ground.', ['UK 6']],
  ['p-019', 'Everyday Slip-On', 'Tidal', 'shoes', 'sneaker', 2999, 4.2, 876, 'shoes-women', 'True to size', 'women', ['blush', 'white', 'black'], 'Cotton canvas upper, cushioned insole', 'A light slip-on with a stretch collar for quick on-and-off. Machine washable.', []],
  ['p-020', 'Studio Knit Sneakers', 'Atelier Mori', 'shoes', 'sneaker', 3999, 4.4, 344, 'shoes-women', 'True to size', 'women', ['cream', 'sky', 'charcoal'], 'Recycled knit upper, natural rubber sole', 'A sock-like knit sneaker with a flexible sole. Light enough to travel in.', ['UK 7']],
  ['p-021', 'Leather Chelsea Boots', 'Kasa & Co', 'shoes', 'boots', 7999, 4.7, 198, 'shoes-men', 'True to size', 'men', ['tan', 'black'], 'Full-grain leather, leather-lined, Goodyear-welted', 'Resoleable Chelsea boots with elastic side panels and a pull tab.', ['UK 6', 'UK 11']],

  ['p-022', 'Classic Dad Cap', 'Tidal', 'headwear', 'cap', 699, 4.3, 1102, 'caps-adjustable', 'Adjustable', 'unisex', ['sand', 'navy', 'black'], '100% washed cotton twill', 'A soft, unstructured six-panel cap with a curved brim and an adjustable strap.', []],
  ['p-023', 'Ribbed Beanie', 'Northwind', 'headwear', 'beanie', 599, 4.2, 655, 'caps', 'Stretch fit', 'unisex', ['charcoal', 'rust', 'cream'], '100% acrylic rib knit', 'A stretchy ribbed beanie with a folded cuff. Warm and easy to layer.', ['S', 'XL']],
  ['p-024', 'Canvas Bucket Hat', 'Kasa & Co', 'headwear', 'bucket', 899, 4.1, 389, 'caps', 'Relaxed', 'unisex', ['olive', 'stone', 'black'], '100% cotton canvas', 'A packable bucket hat with a wide brim for sun protection.', ['XL']],
  ['p-025', 'Structured Baseball Cap', 'Stridewell', 'headwear', 'cap', 999, 4.4, 821, 'caps', 'Fitted', 'unisex', ['navy', 'white', 'forest'], 'Cotton twill, mesh-lined crown', 'A structured, fitted cap with a flat-curved brim and a breathable lining.', []],
]

export const PRODUCTS = RAW.map(([id, name, brand, category, subtype, price, rating, reviewCount, chartId, fit, gender, colorKeys, material, description, unavailable]) => {
  const colors = colorKeys.map((k) => C[k])
  const chart = SIZE_CHARTS[chartId]
  const gallery = VIEWS[category].map((view) => ({
    view,
    src: makeProductArt({ category, subtype, hex: colors[0].hex, view }),
    alt: `${name} in ${colors[0].name}, ${view} view`,
  }))
  return {
    id, name, brand, category, subtype, price, rating, reviewCount, description, material, fit, gender,
    color: colors[0].name,
    colors,
    image: gallery[0].src,
    images: gallery,
    allSizes: chart.rows.map((r) => r.size),
    availableSizes: chart.rows.map((r) => r.size).filter((s) => !unavailable.includes(s)),
    chartSource: 'demo',
    sizeChart: chart,
    productUrl: `https://example.com/products/${id}`,
    source: 'demo',
  }
})

// Regenerates the gallery for another colour of a demo product. Real products keep their own images.
export function galleryForColor(product, color) {
  if (product.source !== 'demo' || !color) return product.images
  return VIEWS[product.category].map((view) => ({
    view,
    src: makeProductArt({ category: product.category, subtype: product.subtype, hex: color.hex, view }),
    alt: `${product.name} in ${color.name}, ${view} view`,
  }))
}

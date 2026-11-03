// Decides whether a link is even worth analysing. Used on the server (real) and in the demo mode of the website.
// Two kinds of check: the web address alone (before anything is downloaded), and the product's own words.

const PRODUCT_PATH = /(\/dp\/|\/gp\/product\/|\/p\/|\/pd\/|\/product(s)?(\/|-)|\/buy(\/|$)|\/item|\/itm|\/prd\/)/i
const SEARCH_PARAMS = ['q', 'k', 'query', 'search', 'keyword', 'keywords', 'searchtext', 'rawquery', 'text', 'st']
const NON_PRODUCT_PAGES = [
  [/^\/(cart|bag|basket|checkout|payment)(\/|$)/i, 'a shopping cart or checkout page'],
  [/^\/(login|signin|sign-in|register|signup|sign-up|account|my-?account|profile|wishlist|orders?|track(ing)?)(\/|$)/i, 'an account page'],
  [/^\/(help|support|contact|contact-us|about|about-us|faq|returns?|terms|privacy|careers|stores?)(\/|$)/i, 'an information page'],
]
const CATEGORY_PATH = /^\/(category|categories|collections?|catalog|shop-by|brands?|new-arrivals|sale|offers|deals|all)(\/|$)/i

// Returns null when the address might be a product page, or { code, message } when it clearly is not.
export function quickRejectUrl(rawUrl) {
  let u
  try {
    u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(rawUrl) ? rawUrl : `https://${rawUrl}`)
  } catch {
    return null // the URL validator reports malformed links
  }
  const path = u.pathname.replace(/\/+$/, '') || '/'
  const reject = (what, tip) => ({ code: 'not_a_product_page', message: `That link is ${what}, not the page of one product. ${tip}` })

  if (path === '/' && ![...u.searchParams.keys()].some((k) => SEARCH_PARAMS.includes(k.toLowerCase()))) {
    return reject("a store's home page", 'Open the product you are interested in, then copy the link from your browser.')
  }
  for (const [re, what] of NON_PRODUCT_PAGES) if (re.test(path)) return reject(what, 'Open the product you are interested in, then copy its link.')

  const looksLikeProduct = PRODUCT_PATH.test(path)
  const searching = [...u.searchParams.keys()].some((k) => SEARCH_PARAMS.includes(k.toLowerCase()))
  if (!looksLikeProduct && (searching || /^\/(search|s)(\/|$)/i.test(path))) {
    return reject('a search results page', 'Click one product in the results, then copy the link of that product.')
  }
  if (!looksLikeProduct && CATEGORY_PATH.test(path)) {
    return reject('a category or collection page', 'Click one product in it, then copy the link of that product.')
  }
  return null
}

// Words that identify products that are not clothing, footwear or caps. Whole words only.
const NON_CLOTHING = [
  'phone', 'phones', 'smartphone', 'iphone', 'ipad', 'macbook', 'airpods', 'playstation', 'xbox', 'nintendo', 'laptop', 'laptops', 'notebook computer', 'tablet pc', 'television', 'tv', 'smart tv', 'monitor', 'keyboard',
  'headphone', 'headphones', 'earphone', 'earphones', 'earbuds', 'speaker', 'speakers', 'soundbar', 'camera', 'cameras', 'tripod', 'charger',
  'power bank', 'cable', 'router', 'printer', 'smartwatch', 'refrigerator', 'fridge', 'washing machine', 'microwave', 'air conditioner', 'air cooler',
  'mixer grinder', 'blender', 'toaster', 'kettle', 'vacuum cleaner', 'air fryer', 'cookware', 'utensil', 'utensils', 'frying pan', 'sofa', 'mattress',
  'furniture', 'wardrobe', 'bookshelf', 'curtain', 'curtains', 'bedsheet', 'bedsheets', 'pillow', 'pillows', 'towel', 'towels', 'blanket', 'carpet',
  'book', 'books', 'novel', 'paperback', 'hardcover', 'toy', 'toys', 'board game', 'puzzle', 'perfume', 'deodorant', 'shampoo', 'conditioner', 'lipstick',
  'moisturizer', 'serum', 'foundation', 'sunscreen', 'protein powder', 'supplement', 'vitamin', 'tea', 'coffee', 'snacks', 'groceries', 'bicycle',
  'treadmill', 'dumbbell', 'dumbbells', 'yoga mat', 'car', 'helmet', 'tyre', 'drill', 'screwdriver', 'pen', 'notebook', 'backpack', 'luggage', 'suitcase',
]
const NON_CLOTHING_RE = new RegExp(`\\b(${NON_CLOTHING.map((w) => w.replace(/ /g, '\\s+')).sort((a, b) => b.length - a.length).join('|')})\\b`, 'i')

// The first non-clothing word found, or null.
export function looksNonClothing(...texts) {
  const m = NON_CLOTHING_RE.exec(texts.filter(Boolean).join(' ').replace(/[-_/]+/g, ' '))
  return m ? m[1].toLowerCase() : null
}

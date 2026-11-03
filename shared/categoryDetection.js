// Shared by the server (real analysis) and the frontend (demo mode), so both agree.
// Works on text only: product title, breadcrumbs / category fields, and the URL path.
const RULES = {
  topwear: [/\bt-?shirts?\b/, /\btees?\b/, /\bshirts?\b/, /\bpolos?\b/, /\bhoodies?\b/, /\bsweatshirts?\b/, /\bsweaters?\b/, /\bpullovers?\b/, /\bjackets?\b/, /\bblazers?\b/, /\bkurtas?\b/, /\btops?\b/, /\bblouses?\b/, /\btanks?\b/, /\bcardigans?\b/, /\bovershirts?\b/, /\bcoats?\b/, /\bjerseys?\b/, /\btunics?\b/, /\btopwear\b/],
  bottomwear: [/\bjeans\b/, /\btrousers?\b/, /\bpants?\b/, /\bchinos?\b/, /\bshorts\b/, /\bjoggers?\b/, /\bleggings?\b/, /\bjeggings?\b/, /\bskirts?\b/, /\bcargos?\b/, /\bpalazzos?\b/, /\bcapris?\b/, /\bdungarees?\b/, /\bbottoms?\b/, /\bsalwars?\b/, /\bbottomwear\b/],
  shoes: [/\bshoes?\b/, /\bsneakers?\b/, /\bboots?\b/, /\bsandals?\b/, /\bloafers?\b/, /\bflip[- ]?flops?\b/, /\bslippers?\b/, /\bheels?\b/, /\bsliders?\b/, /\bfootwear\b/, /\bmules?\b/, /\bclogs?\b/, /\bpumps\b/, /\bsneaker\b/],
  headwear: [/\bcaps?\b/, /\bhats?\b/, /\bbeanies?\b/, /\bvisors?\b/, /\bberets?\b/, /\bheadwear\b/],
}

// Things VirtualFit cannot size yet. Matching one of these beats a weak category match.
const UNSUPPORTED = [
  [/\bdress(es)?\b|\bgowns?\b|\bjumpsuits?\b|\bsarees?\b|\bsaris?\b|\blehengas?\b|\bplaysuits?\b|\bco-?ord sets?\b/, 'Dresses and full-body outfits'],
  [/\bsocks?\b|\bbras?\b|\blingerie\b|\bbriefs?\b|\bboxers?\b|\bswimsuits?\b|\bbikinis?\b|\binnerwear\b/, 'Innerwear and socks'],
  [/\bwatch(es)?\b|\bbags?\b|\bbackpacks?\b|\bwallets?\b|\bbelts?\b|\bsunglasses\b|\bscarf\b|\bscarves\b|\bgloves?\b|\bjewell?ery\b|\bperfumes?\b/, 'Accessories'],
]

// Words that look like a category but are not (checked and removed first).
const NOISE = /\bcap sleeves?\b|\btop[- ](rated|selling|brands?|sellers?|deals?|picks?|offers?|collections?|trending|styles?)\b|\bbootcut\b|\bshirt collar\b|\bshoe (rack|bag|horn)\b|\bshort sleeves?\b/g

const norm = (s) => ` ${String(s ?? '').toLowerCase().replace(NOISE, ' ').replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ')} `

function scoreText(text, weight, scores, signals, source) {
  const t = norm(text)
  let lastCategory = null
  let lastIndex = -1
  for (const [category, patterns] of Object.entries(RULES)) {
    let hits = 0
    for (const re of patterns) {
      const m = re.exec(t)
      if (m) {
        hits += 1
        if (source === 'title' && m.index > lastIndex) { lastIndex = m.index; lastCategory = category }
        signals.push({ category, source, match: m[0].trim() })
      }
    }
    if (hits) scores[category] += weight * Math.min(hits, 2)
  }
  // In a title the last category word is usually the product itself: "Cargo Shorts", "Slim Fit Shirt".
  if (lastCategory) scores[lastCategory] += 0.5
}

export function detectGender(...texts) {
  const t = norm(texts.join(' '))
  if (/\b(women|womens|woman|ladies|girls?|female)\b/.test(t)) return 'women'
  if (/\b(men|mens|man|boys?|male|gents)\b/.test(t)) return 'men'
  if (/\bunisex\b/.test(t)) return 'unisex'
  return null
}

// input: { title, categoryText (breadcrumbs / article type), urlPath }
// returns: { category: 'topwear' | ... | 'unsupported' | null, confidence: 'high' | 'medium' | 'low', signals, reason? }
export function detectCategory({ title = '', categoryText = '', urlPath = '' }) {
  const scores = { topwear: 0, bottomwear: 0, shoes: 0, headwear: 0 }
  const signals = []
  scoreText(categoryText, 3, scores, signals, 'category')
  scoreText(title, 2, scores, signals, 'title')
  // Product links usually carry the product name, so they count as much as the title.
  scoreText(String(urlPath).replace(/[/_.+-]+/g, ' '), 2, scores, signals, 'url')

  const all = `${categoryText} ${title} ${String(urlPath).replace(/[/_.+-]+/g, ' ')}`.toLowerCase().replace(NOISE, ' ')
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1])
  const [best, bestScore] = ranked[0]
  const second = ranked[1][1]

  for (const [re, reason] of UNSUPPORTED) {
    if (re.test(all) && bestScore < 5) return { category: 'unsupported', confidence: 'medium', signals, reason }
  }
  if (bestScore === 0) return { category: null, confidence: 'low', signals }
  const confidence = bestScore >= 3 && bestScore >= second * 2 ? 'high' : bestScore > second && bestScore >= 2 ? 'medium' : 'low'
  return { category: best, confidence, signals }
}

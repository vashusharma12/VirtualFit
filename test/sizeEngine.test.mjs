import { test } from 'node:test'
import assert from 'node:assert/strict'
import { recommendSize } from '../src/utils/sizeEngine.js'

const chart = (rows, extra = {}) => ({ id: 't', basis: 'body', measurements: Object.keys(rows[0]).filter((k) => k !== 'size'), rows, ...extra })

// The example from the project specification.
const SPEC = chart([{ size: 'S', chest: [88, 92] }, { size: 'M', chest: [92, 98] }, { size: 'L', chest: [98, 104] }])

const TOPS = chart([
  { size: 'S', chest: [88, 94], shoulder: [42, 44], waist: [74, 80] },
  { size: 'M', chest: [94, 102], shoulder: [44, 46], waist: [80, 88] },
  { size: 'L', chest: [102, 110], shoulder: [46, 48], waist: [88, 96] },
  { size: 'XL', chest: [110, 118], shoulder: [48, 50], waist: [96, 104] },
])
const BOTTOMS = chart([
  { size: '30', waist: [76, 80], hips: [94, 98], inseam: [74, 82] },
  { size: '32', waist: [81, 85], hips: [99, 103], inseam: [74, 82] },
  { size: '34', waist: [86, 90], hips: [104, 108], inseam: [74, 82] },
])
const SHOES = chart([
  { size: 'UK 6', footLength: [23.8, 24.5] }, { size: 'UK 7', footLength: [24.5, 25.4] }, { size: 'UK 8', footLength: [25.4, 26.2] },
])

test('SPEC EXAMPLE: chest 96 against S/M/L -> M with 92% confidence', () => {
  const r = recommendSize({ chest: 96 }, SPEC, 'topwear')
  assert.equal(r.recommendedSize, 'M')
  assert.equal(r.confidence, 92)
  assert.equal(r.status, 'ok')
  assert.match(r.explanation, /chest.*96 cm.*within the M range/)
  assert.equal(r.comparison.smaller.size, 'S')
  assert.equal(r.comparison.larger.size, 'L')
})

test('returns the shape the spec asks for', () => {
  const r = recommendSize({ chest: 96 }, SPEC, 'topwear')
  for (const k of ['recommendedSize', 'confidence', 'explanation', 'comparison']) assert.ok(k in r)
  assert.ok(Array.isArray(r.comparison.recommended.rows))
})

test('middle of a range with a clear gap to neighbours -> high confidence', () => {
  const r = recommendSize({ chest: 98, shoulder: 45, waist: 84 }, TOPS, 'topwear')
  assert.equal(r.recommendedSize, 'M')
  assert.ok(r.confidence >= 85, `got ${r.confidence}`)
  assert.equal(r.confidenceLabel, 'High')
  assert.equal(r.meta.between, null)
})

test('on the boundary between two sizes -> flagged as between, lower confidence', () => {
  const r = recommendSize({ chest: 102 }, TOPS, 'topwear')
  assert.ok(['M', 'L'].includes(r.recommendedSize))
  assert.deepEqual(r.meta.between, ['M', 'L'])
  assert.ok(r.confidence < 70, `got ${r.confidence}`)
  assert.ok(r.reasons.some((x) => /between M and L/.test(x.text)))
})

test('boundary tie goes to the larger size by default, smaller for a snug fit', () => {
  assert.equal(recommendSize({ chest: 102 }, TOPS, 'topwear').recommendedSize, 'L')
  assert.equal(recommendSize({ chest: 102 }, TOPS, 'topwear', { fitPreference: 'snug' }).recommendedSize, 'M')
})

test('fit preference shifts a borderline choice', () => {
  const snug = recommendSize({ chest: 104 }, TOPS, 'topwear', { fitPreference: 'snug' })
  const regular = recommendSize({ chest: 104 }, TOPS, 'topwear')
  const relaxed = recommendSize({ chest: 104 }, TOPS, 'topwear', { fitPreference: 'relaxed' })
  assert.equal(regular.recommendedSize, 'L')
  assert.equal(relaxed.recommendedSize, 'L')
  assert.equal(snug.recommendedSize, 'M', 'a snug fit accepts the smaller size even though the chest is 2cm over its range')
  assert.match(snug.reasons.find((x) => x.tone === 'warn').text, /snug/)
  const edge = recommendSize({ chest: 101 }, TOPS, 'topwear', { fitPreference: 'relaxed' })
  assert.equal(edge.recommendedSize, 'L', 'relaxed preference moves a 101 chest up to L')
  assert.equal(recommendSize({ chest: 101 }, TOPS, 'topwear').recommendedSize, 'M')
  assert.ok(edge.reasons.some((x) => /relaxed fit/.test(x.text)))
})

test('larger than the whole chart -> no_good_fit, capped confidence, honest message', () => {
  const r = recommendSize({ chest: 130, shoulder: 52, waist: 110 }, TOPS, 'topwear')
  assert.equal(r.status, 'no_good_fit')
  assert.equal(r.recommendedSize, 'XL', 'closest size still reported')
  assert.ok(r.confidence <= 30)
  assert.ok(r.reasons.some((x) => /No size in this chart fits/.test(x.text)))
})

test('smaller than the whole chart -> no_good_fit', () => {
  const r = recommendSize({ chest: 70, shoulder: 36, waist: 58 }, TOPS, 'topwear')
  assert.equal(r.status, 'no_good_fit')
  assert.equal(r.recommendedSize, 'S')
})

test('no matching measurements -> insufficient, says what is needed', () => {
  const r = recommendSize({ waist: 82 }, SPEC, 'topwear')
  assert.equal(r.status, 'insufficient')
  assert.equal(r.recommendedSize, null)
  assert.deepEqual(r.meta.missing, ['chest'])
  assert.match(r.explanation, /chest/)
})

test('missing a measurement lowers confidence and is disclosed', () => {
  const full = recommendSize({ chest: 98, shoulder: 45, waist: 84 }, TOPS, 'topwear')
  const part = recommendSize({ chest: 98 }, TOPS, 'topwear')
  assert.equal(part.recommendedSize, 'M')
  assert.ok(part.confidence < full.confidence)
  assert.deepEqual(part.meta.missingMeasurements, ['shoulder', 'waist'])
  assert.ok(part.reasons.some((x) => /did not have your shoulder width or waist/.test(x.text)))
})

test('chart that does not suit the category -> clear problem', () => {
  const r = recommendSize({ chest: 96 }, SHOES, 'topwear')
  assert.equal(r.status, 'insufficient')
  assert.equal(r.meta.problem, 'chart_not_applicable')
})

test('unavailable best size: recommends the closest AVAILABLE one and says so', () => {
  const r = recommendSize({ chest: 98, shoulder: 45, waist: 84 }, TOPS, 'topwear', { availableSizes: ['S', 'L', 'XL'] })
  assert.ok(['L', 'S'].includes(r.recommendedSize))
  assert.equal(r.meta.bestUnavailable, 'M')
  assert.ok(r.reasons.some((x) => /M would be your best fit but is out of stock/.test(x.text)))
})

test('garment-basis chart: ease is allowed for (body 96 chest -> garment ~106)', () => {
  const garment = chart([
    { size: 'M', chest: [100, 100] }, { size: 'L', chest: [106, 106] }, { size: 'XL', chest: [112, 112] },
  ], { basis: 'garment' })
  const r = recommendSize({ chest: 96 }, garment, 'topwear')
  assert.equal(r.recommendedSize, 'L', 'a 106cm garment gives ~10cm room on a 96cm chest')
  assert.ok(r.reasons.some((x) => /garment measurements/.test(x.text)))
  const body = recommendSize({ chest: 96 }, chart([{ size: 'M', chest: [100, 100] }, { size: 'L', chest: [106, 106] }, { size: 'XL', chest: [112, 112] }]), 'topwear')
  assert.equal(body.recommendedSize, 'M', 'the same numbers as body measurements point to M')
})

test('slim product + garment chart means less ease, so a smaller garment is enough', () => {
  const garment = chart([{ size: 'M', chest: [100, 100] }, { size: 'L', chest: [106, 106] }], { basis: 'garment' })
  assert.equal(recommendSize({ chest: 94 }, garment, 'topwear').recommendedSize, 'L')
  assert.equal(recommendSize({ chest: 94 }, garment, 'topwear', { productFit: 'Slim' }).recommendedSize, 'M')
})

test('when nothing fits, the CLOSEST size is named (not an arbitrary one)', () => {
  assert.equal(recommendSize({ chest: 60 }, TOPS, 'topwear').recommendedSize, 'S')
  assert.equal(recommendSize({ chest: 150 }, TOPS, 'topwear').recommendedSize, 'XL')
  assert.equal(recommendSize({ footLength: 21 }, SHOES, 'shoes').recommendedSize, 'UK 6')
  assert.equal(recommendSize({ footLength: 31 }, SHOES, 'shoes').recommendedSize, 'UK 8')
})

test('unknown basis and generic source both lower confidence', () => {
  const body = recommendSize({ chest: 98, shoulder: 45, waist: 84 }, TOPS, 'topwear')
  const unknown = recommendSize({ chest: 98, shoulder: 45, waist: 84 }, { ...TOPS, basis: 'unknown' }, 'topwear')
  const generic = recommendSize({ chest: 98, shoulder: 45, waist: 84 }, { ...TOPS, source: 'generic' }, 'topwear')
  assert.ok(unknown.confidence < body.confidence)
  assert.ok(generic.confidence < body.confidence)
  assert.ok(generic.reasons.some((x) => /standard sizing/.test(x.text)))
  assert.ok(unknown.reasons.some((x) => /could not tell/.test(x.text)))
})

test('confidence never claims certainty', () => {
  const r = recommendSize({ chest: 98, shoulder: 45, waist: 84 }, TOPS, 'topwear')
  assert.ok(r.confidence <= 95)
})

test('bottoms: waist and hips pull in different directions -> a pick is made, the conflict is explained', () => {
  const r = recommendSize({ waist: 82, hips: 108, inseam: 78 }, BOTTOMS, 'bottomwear')
  assert.ok(['32', '34'].includes(r.recommendedSize))
  assert.ok(r.reasons.some((x) => x.tone === 'warn' && /may feel/.test(x.text)), 'the measurement that does not fit is called out')
  assert.ok(r.comparison.recommended.rows.some((x) => x.status !== 'within'))
})

test('bottoms: clean fit across all three measurements', () => {
  const r = recommendSize({ waist: 83, hips: 101, inseam: 78 }, BOTTOMS, 'bottomwear')
  assert.equal(r.recommendedSize, '32')
  assert.ok(r.confidence >= 85)
})

test('shoes: foot length decides, with a width caveat', () => {
  const r = recommendSize({ footLength: 25.0 }, SHOES, 'shoes')
  assert.equal(r.recommendedSize, 'UK 7')
  assert.ok(r.reasons.some((x) => /not width/.test(x.text)))
})

test('shoes are strict: 1cm off the chart is not a good fit', () => {
  const r = recommendSize({ footLength: 28 }, SHOES, 'shoes')
  assert.equal(r.status, 'no_good_fit')
})

test('adjustable one-size cap: fits inside range, not outside', () => {
  const cap = chart([{ size: 'One size', headCircumference: [54, 62] }])
  const ok = recommendSize({ headCircumference: 57 }, cap, 'headwear')
  assert.equal(ok.recommendedSize, 'One size')
  assert.equal(ok.comparison.smaller, null)
  assert.equal(ok.comparison.larger, null)
  assert.equal(recommendSize({ headCircumference: 66 }, cap, 'headwear').status, 'no_good_fit')
})

test('chart rows listed largest-first are re-ordered smallest-first', () => {
  const reversed = chart([...TOPS.rows].reverse())
  const r = recommendSize({ chest: 98, shoulder: 45, waist: 84 }, reversed, 'topwear')
  assert.equal(r.recommendedSize, 'M')
  assert.equal(r.comparison.smaller.size, 'S')
  assert.equal(r.comparison.larger.size, 'L')
  assert.deepEqual(r.meta.sizesOrder, ['S', 'M', 'L', 'XL'])
})

test('single-number rows become ranges around each value', () => {
  const points = chart([{ size: 'S', chest: [92, 92] }, { size: 'M', chest: [98, 98] }, { size: 'L', chest: [104, 104] }])
  assert.equal(recommendSize({ chest: 99 }, points, 'topwear').recommendedSize, 'M')
  assert.equal(recommendSize({ chest: 102 }, points, 'topwear').recommendedSize, 'L')
  assert.equal(recommendSize({ chest: 92 }, points, 'topwear').recommendedSize, 'S')
})

test('comparison: smaller/larger sizes say how they would feel', () => {
  const r = recommendSize({ chest: 98, shoulder: 45, waist: 84 }, TOPS, 'topwear')
  const smallChest = r.comparison.smaller.rows.find((x) => x.key === 'chest')
  const largeChest = r.comparison.larger.rows.find((x) => x.key === 'chest')
  assert.equal(smallChest.status, 'above')
  assert.equal(smallChest.diff, 4)
  assert.match(smallChest.feel, /snug|tight/)
  assert.equal(largeChest.status, 'below')
  assert.equal(largeChest.diff, 4)
  assert.match(largeChest.feel, /roomy|loose/)
})

test('explanation uses the user\'s unit', () => {
  const r = recommendSize({ chest: 96 }, SPEC, 'topwear', { unit: 'in' })
  assert.match(r.explanation, /37\.8 in/)
  assert.doesNotMatch(r.explanation, / cm/)
})

test('product fit notes: slim at the top edge suggests the next size; roomy products warn', () => {
  const slim = recommendSize({ chest: 101.5, shoulder: 45, waist: 84 }, TOPS, 'topwear', { productFit: 'Slim' })
  assert.ok(slim.reasons.some((x) => /cut slim/.test(x.text)))
  const roomy = recommendSize({ chest: 98, shoulder: 45, waist: 84 }, TOPS, 'topwear', { productFit: 'Oversized' })
  assert.ok(roomy.reasons.some((x) => /cut roomy/.test(x.text)))
})

test('robust to bad input: nulls, strings, zero, NaN, empty chart, unknown category', () => {
  assert.equal(recommendSize({ chest: null }, SPEC, 'topwear').status, 'insufficient')
  assert.equal(recommendSize({ chest: '96' }, SPEC, 'topwear').status, 'insufficient')
  assert.equal(recommendSize({ chest: 0 }, SPEC, 'topwear').status, 'insufficient')
  assert.equal(recommendSize({ chest: NaN }, SPEC, 'topwear').status, 'insufficient')
  assert.equal(recommendSize({ chest: 96 }, { rows: [] }, 'topwear').status, 'insufficient')
  assert.equal(recommendSize({ chest: 96 }, null, 'topwear').status, 'insufficient')
  assert.equal(recommendSize({ chest: 96 }, SPEC, 'spaceships').status, 'insufficient')
  assert.equal(recommendSize(undefined, SPEC, 'topwear').status, 'insufficient')
})

test('a row missing a measurement does not poison the others', () => {
  const ragged = chart([{ size: 'S', chest: [88, 94], waist: [74, 80] }, { size: 'M', chest: [94, 102] }, { size: 'L', chest: [102, 110], waist: [88, 96] }], { measurements: ['chest', 'waist'] })
  const r = recommendSize({ chest: 98, waist: 84 }, ragged, 'topwear')
  assert.deepEqual(r.meta.measurementsUsed, ['chest'])
  assert.equal(r.recommendedSize, 'M')
})

test('deterministic: same input, same output', () => {
  const a = recommendSize({ chest: 99, shoulder: 45, waist: 85 }, TOPS, 'topwear')
  const b = recommendSize({ chest: 99, shoulder: 45, waist: 85 }, TOPS, 'topwear')
  assert.deepEqual(a, b)
})

test('does not mutate the chart or the measurements', () => {
  const m = { chest: 99 }
  const c = JSON.parse(JSON.stringify(TOPS))
  recommendSize(m, c, 'topwear', { fitPreference: 'relaxed' })
  assert.deepEqual(m, { chest: 99 })
  assert.deepEqual(c, TOPS)
})

test('monotonic: a larger chest never recommends a smaller size', () => {
  const order = ['S', 'M', 'L', 'XL']
  let last = -1
  for (let chest = 86; chest <= 120; chest += 1) {
    const r = recommendSize({ chest, shoulder: 40 + (chest - 86) * 0.3, waist: 72 + (chest - 86) * 0.9 }, TOPS, 'topwear')
    const idx = order.indexOf(r.recommendedSize)
    assert.ok(idx >= last, `chest ${chest} gave ${r.recommendedSize} after ${order[last]}`)
    last = idx
  }
})

test('selectedSize: describes how the size the shopper picked fits, even if it is not the recommendation', () => {
  const r = recommendSize({ chest: 98, shoulder: 45, waist: 84 }, TOPS, 'topwear', { selectedSize: 'L' })
  assert.equal(r.recommendedSize, 'M')
  assert.equal(r.selected.size, 'L')
  assert.equal(r.selected.isRecommended, false)
  const chest = r.selected.rows.find((x) => x.key === 'chest')
  assert.equal(chest.status, 'below')
  assert.match(chest.feel, /roomy|loose/)
  const same = recommendSize({ chest: 98, shoulder: 45, waist: 84 }, TOPS, 'topwear', { selectedSize: 'M' })
  assert.equal(same.selected.isRecommended, true)
  assert.equal(recommendSize({ chest: 98 }, TOPS, 'topwear', { selectedSize: 'XXXL' }).selected, null)
  assert.equal(recommendSize({ chest: 98 }, TOPS, 'topwear').selected, null)
})

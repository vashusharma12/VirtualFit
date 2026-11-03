import { delay } from './apiClient'

// RULE-BASED ESTIMATE from three circumference measurements. It does NOT analyse photos.
// To use a real computer-vision model later, keep this function's signature and return shape.
export const BODY_SHAPES = {
  rectangle: {
    label: 'Rectangle',
    summary: 'Your chest and hips are similar in size, with a waist that is only slightly narrower.',
    fitNotes: 'Most regular and straight cuts follow your proportions. Size is usually decided by chest for tops and waist for bottoms.',
  },
  triangle: {
    label: 'Triangle',
    summary: 'Your hips are noticeably wider than your chest.',
    fitNotes: 'Bottoms are usually the size to get right: choose by hips, then check the waist. Fitted tops may run roomier than the chart suggests.',
  },
  'inverted-triangle': {
    label: 'Inverted triangle',
    summary: 'Your chest is noticeably wider than your hips.',
    fitNotes: 'Tops are usually sized by chest and shoulder. Bottoms often fit loosely at the hip when sized to the chest, so go by waist and hips.',
  },
  oval: {
    label: 'Oval',
    summary: 'Your waist is about as wide as your chest and hips.',
    fitNotes: 'Waist is the measurement to watch. Stretch fabrics, relaxed cuts and elastic or adjustable waists tend to be the most comfortable.',
  },
  hourglass: {
    label: 'Hourglass',
    summary: 'Your chest and hips are similar in size, with a clearly narrower waist.',
    fitNotes: 'Straight sizes can pinch at the waist or gape at the chest or hips. Stretch fabrics and shaped cuts usually fit best.',
  },
}

const NEEDED = ['chest', 'waist', 'hips']
const WITHIN = 0.05 // "similar" means within 5%

// Pure classification (cm). Returns a shape id, checked in this order.
export function classifyShape({ chest, waist, hips }) {
  const widest = Math.max(chest, hips)
  const avg = (chest + hips) / 2
  if (waist / widest >= 0.95) return 'oval'
  if (hips / chest > 1 + WITHIN) return 'triangle'
  if (chest / hips > 1 + WITHIN) return 'inverted-triangle'
  return waist / avg <= 0.75 ? 'hourglass' : 'rectangle'
}

export async function estimateBodyShape(measurements) {
  await delay(500)
  const missing = NEEDED.filter((k) => measurements[k] == null)
  if (missing.length) return { status: 'insufficient', missing }

  const { chest, waist, hips } = measurements
  const shape = classifyShape({ chest, waist, hips })
  return {
    status: 'ok',
    shape,
    ...BODY_SHAPES[shape],
    method: 'measurement-ratios',
    usedPhotos: false,
    basedOn: { chest, waist, hips },
    ratios: {
      hipsToChest: Math.round((hips / chest) * 100) / 100,
      waistToChest: Math.round((waist / chest) * 100) / 100,
      waistToHips: Math.round((waist / hips) * 100) / 100,
    },
  }
}

// DEMO size charts. All values are BODY measurements in cm, as ranges [min, max].
// Real charts will come from the product analyzer (phase 7) in this same shape.
const rows = (labels, spec) =>
  labels.map((size, i) => ({ size, ...Object.fromEntries(Object.entries(spec).map(([k, v]) => [k, v[i]])) }))

export const SIZE_CHARTS = {
  'tops-men': {
    id: 'tops-men', name: "Men's tops", unit: 'cm', basis: 'body', measurements: ['chest', 'shoulder', 'waist'],
    rows: rows(['S', 'M', 'L', 'XL', 'XXL'], {
      chest: [[88, 94], [94, 102], [102, 110], [110, 118], [118, 126]],
      shoulder: [[42, 44], [44, 46], [46, 48], [48, 50], [50, 52]],
      waist: [[74, 80], [80, 88], [88, 96], [96, 104], [104, 112]],
    }),
  },
  'tops-women': {
    id: 'tops-women', name: "Women's tops", unit: 'cm', basis: 'body', measurements: ['chest', 'shoulder', 'waist'],
    rows: rows(['XS', 'S', 'M', 'L', 'XL'], {
      chest: [[78, 82], [82, 86], [86, 92], [92, 98], [98, 104]],
      shoulder: [[35, 36], [36, 37], [37, 38.5], [38.5, 40], [40, 41.5]],
      waist: [[60, 64], [64, 68], [68, 74], [74, 80], [80, 86]],
    }),
  },
  'bottoms-men': {
    id: 'bottoms-men', name: "Men's bottoms (waist size)", unit: 'cm', basis: 'body', measurements: ['waist', 'hips', 'inseam'],
    rows: rows(['28', '30', '32', '34', '36', '38'], {
      waist: [[71, 75], [76, 80], [81, 85], [86, 90], [91, 95], [96, 100]],
      hips: [[89, 93], [94, 98], [99, 103], [104, 108], [109, 113], [114, 118]],
      inseam: [[74, 82], [74, 82], [74, 82], [74, 82], [74, 82], [74, 82]],
    }),
  },
  'bottoms-women': {
    id: 'bottoms-women', name: "Women's bottoms", unit: 'cm', basis: 'body', measurements: ['waist', 'hips', 'inseam'],
    rows: rows(['XS', 'S', 'M', 'L', 'XL'], {
      waist: [[60, 64], [64, 68], [68, 73], [73, 78], [78, 84]],
      hips: [[86, 90], [90, 95], [95, 100], [100, 105], [105, 111]],
      inseam: [[68, 78], [68, 78], [68, 78], [68, 78], [68, 78]],
    }),
  },
  'shoes-men': {
    id: 'shoes-men', name: "Men's shoes (UK)", unit: 'cm', basis: 'body', measurements: ['footLength'],
    rows: rows(['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'], {
      footLength: [[23.8, 24.5], [24.5, 25.4], [25.4, 26.2], [26.2, 27.1], [27.1, 27.9], [27.9, 28.8]],
    }),
  },
  'shoes-women': {
    id: 'shoes-women', name: "Women's shoes (UK)", unit: 'cm', basis: 'body', measurements: ['footLength'],
    rows: rows(['UK 3', 'UK 4', 'UK 5', 'UK 6', 'UK 7'], {
      footLength: [[22.0, 22.8], [22.8, 23.5], [23.5, 24.3], [24.3, 25.1], [25.1, 25.9]],
    }),
  },
  caps: {
    id: 'caps', name: 'Caps and hats', unit: 'cm', basis: 'body', measurements: ['headCircumference'],
    rows: rows(['S', 'M', 'L', 'XL'], {
      headCircumference: [[54, 56], [56, 58], [58, 60], [60, 62]],
    }),
  },
  'caps-adjustable': {
    id: 'caps-adjustable', name: 'Adjustable (one size)', unit: 'cm', basis: 'body', measurements: ['headCircumference'],
    rows: rows(['One size'], { headCircumference: [[54, 62]] }),
  },
}

// A standard (not brand-specific) chart for when a product page has none. Always flagged as generic.
export function genericChartFor(category, gender) {
  const women = gender === 'women'
  const id = { topwear: women ? 'tops-women' : 'tops-men', bottomwear: women ? 'bottoms-women' : 'bottoms-men', shoes: women ? 'shoes-women' : 'shoes-men', headwear: 'caps' }[category]
  return id ? { ...SIZE_CHARTS[id], source: 'generic', name: `Standard sizing: ${SIZE_CHARTS[id].name}` } : null
}

// Which body measurements each category needs. The size guide only ever asks for these.
export const CATEGORIES = [
  { id: 'topwear', label: 'Topwear', singular: 'Top Wear', requiredMeasurements: ['chest', 'shoulder', 'waist', 'height'] },
  { id: 'bottomwear', label: 'Bottomwear', singular: 'Bottom Wear', requiredMeasurements: ['waist', 'hips', 'inseam'] },
  { id: 'shoes', label: 'Shoes', singular: 'Shoes', requiredMeasurements: ['footLength'] },
  { id: 'headwear', label: 'Caps and hats', singular: 'Headwear', requiredMeasurements: ['headCircumference'] },
]

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]))

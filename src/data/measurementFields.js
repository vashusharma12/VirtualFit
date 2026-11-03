// Ranges are canonical (cm / kg) and deliberately wide enough to include most adults.
export const MEASUREMENT_FIELDS = [
  { key: 'height', label: 'Height', kind: 'length', min: 100, max: 230, required: true,
    howTo: 'Stand straight against a wall, without shoes.' },
  { key: 'weight', label: 'Weight', kind: 'weight', min: 25, max: 250, required: true,
    howTo: 'Your current body weight.' },
  { key: 'chest', label: 'Chest', kind: 'length', min: 60, max: 170, required: true,
    howTo: 'Around the fullest part of your chest, tape level under the arms.' },
  { key: 'waist', label: 'Waist', kind: 'length', min: 45, max: 170, required: true,
    howTo: 'Around your natural waist, just above the belly button.' },
  { key: 'hips', label: 'Hips', kind: 'length', min: 60, max: 180, required: true,
    howTo: 'Around the fullest part of your hips and seat.' },
  { key: 'shoulder', label: 'Shoulder width', kind: 'length', min: 30, max: 70, required: false,
    howTo: 'From the edge of one shoulder to the other, across the back.' },
  { key: 'inseam', label: 'Inseam', kind: 'length', min: 50, max: 110, required: false,
    howTo: 'From the crotch down to the ankle bone, along the inside of the leg.' },
  { key: 'footLength', label: 'Foot length', kind: 'length', min: 15, max: 35, required: false,
    howTo: 'Heel to the tip of your longest toe, standing on paper.' },
  { key: 'headCircumference', label: 'Head circumference', kind: 'length', min: 45, max: 70, required: false,
    howTo: 'Around the head, just above the eyebrows and ears.' },
]

export const FIELD_BY_KEY = Object.fromEntries(MEASUREMENT_FIELDS.map((f) => [f.key, f]))

export const MEASUREMENT_STEPS = [
  { id: 'basics', title: 'Basics', description: 'Start with your height and weight.', fields: ['height', 'weight'] },
  { id: 'body', title: 'Body', description: 'Used for most tops and bottoms.', fields: ['chest', 'waist', 'hips'] },
  {
    id: 'extras', title: 'Optional',
    description: 'Only needed for specific products. You can skip these now and add them later.',
    fields: ['shoulder', 'inseam', 'footLength', 'headCircumference'],
  },
  { id: 'review', title: 'Review', description: 'Check everything before saving.', fields: [] },
]

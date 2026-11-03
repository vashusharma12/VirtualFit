export const PHOTO_ANGLES = [
  { id: 'front', label: 'Front', instruction: 'Face the camera, arms slightly away from your body, feet shoulder-width apart.' },
  { id: 'left', label: 'Left side', instruction: 'Turn so your left side faces the camera. Stand straight with arms relaxed.' },
  { id: 'right', label: 'Right side', instruction: 'Turn so your right side faces the camera. Stand straight with arms relaxed.' },
  { id: 'back', label: 'Back', instruction: 'Turn your back to the camera, arms slightly away from your body.' },
]
export const ANGLE_IDS = PHOTO_ANGLES.map((a) => a.id)

// Client-side image preparation. The server re-checks and re-encodes everything, so this is for fast
// feedback and smaller uploads, and it produces the cleaned image a future AI service will receive.
export const ACCEPT_ATTR = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp'
export const MAX_FILE_BYTES = 10 * 1024 * 1024

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_EDGE = 1600
const HARD_MIN_EDGE = 300
const SOFT_MIN_EDGE = 600
const MIN_PORTRAIT_RATIO = 1.25

export const WARNING_MESSAGES = {
  low_resolution: 'This photo is low resolution. A larger photo gives better results.',
  not_portrait: 'This photo is not tall enough to show your full body. Hold the camera upright.',
}

// Returns an error message, or '' when the file is acceptable.
export function validateImageFile(file) {
  if (!file) return 'No file selected.'
  const ext = file.name?.split('.').pop()?.toLowerCase() ?? ''
  const typeOk = file.type === '' || ALLOWED_TYPES.includes(file.type)
  if (!ALLOWED_EXTENSIONS.includes(ext) || !typeOk) return 'Use a JPG, PNG or WEBP photo.'
  if (file.size === 0) return 'That file is empty.'
  if (file.size > MAX_FILE_BYTES) return 'That photo is larger than 10 MB.'
  return ''
}

async function decode(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      /* fall through to the <img> path */
    }
  }
  const url = URL.createObjectURL(file)
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('That file could not be read as an image.'))
      img.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

// Validates, orients, resizes (longest edge 1600px) and re-encodes as JPEG. Re-encoding removes
// metadata such as GPS location. Returns { blob, width, height, warnings }.
export async function prepareImage(file) {
  const problem = validateImageFile(file)
  if (problem) throw new Error(problem)

  const source = await decode(file)
  const srcW = source.width
  const srcH = source.height
  if (Math.min(srcW, srcH) < HARD_MIN_EDGE) {
    throw new Error('That photo is too small. Use one at least 300 pixels wide.')
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(srcW, srcH))
  const width = Math.round(srcW * scale)
  const height = Math.round(srcH * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d').drawImage(source, 0, 0, width, height)
  source.close?.()

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
  if (!blob) throw new Error('That photo could not be processed. Try a different one.')

  const warnings = []
  if (Math.min(width, height) < SOFT_MIN_EDGE) warnings.push({ code: 'low_resolution', message: WARNING_MESSAGES.low_resolution })
  if (height / width < MIN_PORTRAIT_RATIO) warnings.push({ code: 'not_portrait', message: WARNING_MESSAGES.not_portrait })
  return { blob, width, height, warnings }
}

// Draws an image from a data URI (such as the generated demo product art) onto a canvas and returns
// a PNG. The server only accepts real raster images, never SVG.
export async function dataUriToPngBlob(uri, maxEdge = 900) {
  const img = await new Promise((resolve, reject) => {
    const i = new Image()
    i.onload = () => resolve(i)
    i.onerror = () => reject(new Error('The product image could not be prepared.'))
    i.src = uri
  })
  const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth || 600, img.naturalHeight || 750))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round((img.naturalWidth || 600) * scale)
  canvas.height = Math.round((img.naturalHeight || 750) * scale)
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('The product image could not be prepared.')
  return blob
}

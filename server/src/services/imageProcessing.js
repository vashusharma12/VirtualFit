import sharp from 'sharp'
import { HttpError } from '../utils/errors.js'

const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp'])
const MAX_EDGE = 1600
const HARD_MIN_EDGE = 300 // below this the photo is unusable
const SOFT_MIN_EDGE = 600 // below this we warn
const MIN_PORTRAIT_RATIO = 1.25
// Variance of the Laplacian of a downsized greyscale copy. Low values mean few sharp edges.
const BLUR_VARIANCE_THRESHOLD = 12
const LIMIT_PIXELS = 40_000_000 // guards against decompression bombs

export const WARNINGS = {
  low_resolution: 'This photo is low resolution. A larger photo gives better results.',
  not_portrait: 'This photo is not tall enough to show your full body. Hold the camera upright.',
  possibly_blurry: 'This photo may be blurry. Hold still, or retake it in better light.',
}
const warn = (code) => ({ code, message: WARNINGS[code] })

export async function measureSharpness(buffer) {
  // offset 128 keeps negative filter responses (sharp clips at 0); variance is computed on raw pixels.
  const { data } = await sharp(buffer)
    .resize({ width: 512, height: 512, fit: 'inside' })
    .greyscale()
    .convolve({ width: 3, height: 3, kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0], scale: 1, offset: 128 })
    .raw()
    .toBuffer({ resolveWithObject: true })
  let sum = 0
  let sumSq = 0
  for (let i = 0; i < data.length; i++) {
    sum += data[i]
    sumSq += data[i] * data[i]
  }
  const mean = sum / data.length
  return sumSq / data.length - mean * mean
}

// Validates by decoding the actual bytes (not the file name or the claimed type), applies EXIF
// orientation, resizes, and re-encodes as JPEG. Re-encoding drops all metadata, including GPS.
export async function processPhoto(input) {
  let meta
  try {
    meta = await sharp(input, { limitInputPixels: LIMIT_PIXELS }).metadata()
  } catch {
    throw new HttpError(400, 'That file is not a valid image.')
  }
  if (!ALLOWED_FORMATS.has(meta.format)) throw new HttpError(400, 'Use a JPG, PNG or WEBP photo.')

  let out
  try {
    out = await sharp(input, { limitInputPixels: LIMIT_PIXELS })
      .rotate()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 88 })
      .toBuffer({ resolveWithObject: true })
  } catch {
    throw new HttpError(400, 'That image could not be read. Try a different photo.')
  }
  const { data, info } = out

  const shortEdge = Math.min(info.width, info.height)
  if (shortEdge < HARD_MIN_EDGE) throw new HttpError(400, 'That photo is too small. Use one at least 300 pixels wide.')

  const warnings = []
  if (shortEdge < SOFT_MIN_EDGE) warnings.push(warn('low_resolution'))
  if (info.height / info.width < MIN_PORTRAIT_RATIO) warnings.push(warn('not_portrait'))
  if ((await measureSharpness(data)) < BLUR_VARIANCE_THRESHOLD) warnings.push(warn('possibly_blurry'))

  return { data, width: info.width, height: info.height, warnings }
}

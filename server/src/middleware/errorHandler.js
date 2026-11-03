import { ZodError } from 'zod'
import { AnalyzeError, STATUS_FOR_CODE } from '../analyzer/errors.js'
import { HttpError } from '../utils/errors.js'

export function notFound(_req, res) {
  res.status(404).json({ message: 'Not found.' })
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    const first = err.issues[0]
    return res.status(400).json({
      message: first?.message || 'Invalid request.',
      fieldErrors: Object.fromEntries(err.issues.map((i) => [i.path.join('.'), i.message])),
    })
  }
  // Deliberate errors raised by our own code carry messages that are safe to show, whatever their status.
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message, ...(err.code ? { code: err.code } : {}) })
  }
  if (err instanceof AnalyzeError) {
    return res.status(STATUS_FOR_CODE[err.code] ?? 422).json({ code: err.code, message: err.message })
  }
  if (err.name === 'MulterError') {
    return err.code === 'LIMIT_FILE_SIZE'
      ? res.status(413).json({ message: 'That photo is larger than 10 MB.' })
      : res.status(400).json({ message: 'Upload failed. Send a single image in the "photo" field.' })
  }
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Request body is not valid JSON.' })
  if (err.type === 'entity.too.large') return res.status(413).json({ message: 'Request is too large.' })
  if (err.status && err.status < 500) return res.status(err.status).json({ message: err.message, ...(err.code ? { code: err.code } : {}) })
  console.error('[server error]', err)
  res.status(500).json({ message: 'Something went wrong on our side. Please try again.' })
}

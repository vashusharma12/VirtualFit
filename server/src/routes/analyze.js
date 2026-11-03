import { Router } from 'express'
import multer from 'multer'
import sharp from 'sharp'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import { AnalyzeError } from '../analyzer/errors.js'

const bodySchema = z.object({
  url: z.string({ required_error: 'Paste a product link.' }).trim().min(1, 'Paste a product link.').max(2048, 'That link is too long.'),
})

const perUser = (limit, message) => rateLimit({
  windowMs: 60 * 60 * 1000,
  limit,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => req.user.id, // per account, after login
  message: { code: 'rate_limited', message },
})
const linkLimiter = perUser(30, 'You have analyzed a lot of links. Please try again in a little while.')
const chartLimiter = perUser(20, 'You have uploaded a lot of charts. Please try again in a little while.')
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } })

export function analyzeRouter(db, analyzeUrl, chartReader = { enabled: false }) {
  const router = Router()
  router.use(requireAuth(db))

  // What this server can do, so the app only offers features that will work.
  router.get('/config', (_req, res) => res.json({ chartReader: Boolean(chartReader.enabled) }))

  router.post('/', linkLimiter, async (req, res) => {
    const { url } = bodySchema.parse(req.body)
    res.json(await analyzeUrl(url))
  })

  // A screenshot or photo of ANY store's size chart, read with AI. Works regardless of the website.
  router.post('/chart-image', chartLimiter, upload.single('image'), async (req, res) => {
    if (!chartReader.enabled) throw new AnalyzeError('chart_reader_unavailable', 'Reading size charts with AI is not turned on for this server.')
    if (!req.file) throw new AnalyzeError('invalid_url', 'Choose a picture of the size chart.')
    const category = z.enum(['topwear', 'bottomwear', 'shoes', 'headwear']).optional().parse(req.body.category || undefined)
    try {
      const info = await sharp(req.file.buffer, { limitInputPixels: 40_000_000 }).metadata()
      if (!['jpeg', 'png', 'webp'].includes(info.format)) throw new Error('format')
    } catch {
      throw new AnalyzeError('chart_unreadable', 'Use a JPG, PNG or WEBP picture of the size chart.')
    }
    res.json({ chart: await chartReader.fromImage(req.file.buffer, category) })
  })

  return router
}

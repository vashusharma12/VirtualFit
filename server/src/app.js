import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { config } from './config.js'
import { authRouter } from './routes/auth.js'
import { profileRouter } from './routes/profile.js'
import { photosRouter } from './routes/photos.js'
import { analyzeRouter } from './routes/analyze.js'
import { tryOnRouter } from './routes/tryOn.js'
import { accountRouter } from './routes/account.js'
import { errorHandler, notFound } from './middleware/errorHandler.js'

export function createApp(db, storage, analyzeUrl, tryOn, chartReader, auth = {}) {
  const app = express()
  if (config.isProd) app.set('trust proxy', 1)

  app.use(helmet())
  app.use(cors({ origin: config.clientOrigin, credentials: true }))
  app.use(express.json({ limit: '1mb' }))
  app.use(cookieParser())

  app.get('/api/health', (_req, res) => res.json({ ok: true }))
  app.use('/api/auth', authRouter(db, auth))
  app.use('/api/profile', profileRouter(db))
  app.use('/api/photos', photosRouter(db, storage))
  app.use('/api/analyze-product', analyzeRouter(db, analyzeUrl, chartReader))
  app.use('/api/try-on', tryOnRouter(db, storage, tryOn))
  app.use('/api/account', accountRouter(db, storage, auth))

  app.use(notFound)
  app.use(errorHandler)
  return app
}

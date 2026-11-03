import 'dotenv/config'
import crypto from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const isProd = process.env.NODE_ENV === 'production'

let jwtSecret = process.env.JWT_SECRET
if (!jwtSecret) {
  if (isProd) throw new Error('JWT_SECRET must be set when NODE_ENV=production.')
  jwtSecret = crypto.randomBytes(32).toString('hex')
  console.warn('[config] JWT_SECRET not set: using a temporary secret. Sessions reset when the server restarts.')
} else if (isProd && jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters in production.')
}

if (isProd && process.env.ANALYZER_ALLOW_PRIVATE_HOSTS === 'true') {
  throw new Error('ANALYZER_ALLOW_PRIVATE_HOSTS must not be enabled in production.')
}

export const config = {
  isProd,
  port: Number(process.env.PORT) || 4000,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  jwtSecret,
  dbPath: process.env.DB_PATH || path.join(here, '..', 'data', 'virtualfit.db'),
  storageDir: process.env.STORAGE_DIR || path.join(here, '..', 'storage'),
  // Test-only escape hatch so the analyzer can fetch from localhost. Never enabled in production.
  analyzerAllowPrivate: process.env.ANALYZER_ALLOW_PRIVATE_HOSTS === 'true',
  analyzerUserAgent: process.env.ANALYZER_USER_AGENT ||
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  tryonProvider: process.env.TRYON_PROVIDER || 'simulated', // 'simulated' | 'replicate'
  tryonSimDelayMs: Number(process.env.TRYON_SIM_DELAY_MS ?? 1200),
  tryonRetentionHours: Number(process.env.TRYON_RETENTION_HOURS || 24),
  replicateToken: process.env.REPLICATE_API_TOKEN || '',
  replicateModelVersion: process.env.REPLICATE_MODEL_VERSION || '',
  // Optional. Lets the analyzer read size charts from pictures or loose text. Server-side only.
  analyzerUseBrowser: process.env.ANALYZER_USE_BROWSER !== 'false', // on unless switched off
  analyzerBrowserNoSandbox: process.env.ANALYZER_BROWSER_NO_SANDBOX === 'true',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  cookieName: 'vf_session',
  sessionDays: 7,
}

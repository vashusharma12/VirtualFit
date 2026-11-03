import { config } from './config.js'
import { openDb } from './db.js'
import { createApp } from './app.js'
import { createGoogleVerifier } from './auth/google.js'
import { createLocalStorage } from './storage/localDisk.js'
import { createPageFetcher, createImageFetcher, createResourceFetcher } from './analyzer/fetchPage.js'
import { createBrowserRenderer } from './analyzer/browser.js'
import { createProvider } from './tryon/providers/index.js'
import { cleanupExpired, failInterrupted } from './routes/tryOn.js'
import { createAnalyzer } from './analyzer/analyze.js'
import { createChartReader } from './analyzer/chartReader.js'

const db = openDb(config.dbPath)
const fetchPage = createPageFetcher({ allowPrivate: config.analyzerAllowPrivate, userAgent: config.analyzerUserAgent })
const storage = createLocalStorage(config.storageDir)
const fetchImage = createImageFetcher({ allowPrivate: config.analyzerAllowPrivate, userAgent: config.analyzerUserAgent })
const provider = createProvider(config)
console.log(`Try-on provider: ${provider.name}${provider.external ? ' (external: photos leave this server)' : ''}`)

failInterrupted(db)
const sweep = () => cleanupExpired(db, storage, config.tryonRetentionHours).catch((e) => console.error('[cleanup]', e.message))
sweep()
setInterval(sweep, 60 * 60 * 1000).unref()

const chartReader = createChartReader({ apiKey: config.anthropicApiKey, model: config.anthropicModel })
console.log(`Size-chart AI reader: ${chartReader.enabled ? `on (${config.anthropicModel}); chart pictures are sent to Anthropic` : 'off (set ANTHROPIC_API_KEY to turn it on)'}`)
const verifyGoogle = createGoogleVerifier(config.googleClientId)
console.log(`Google sign-in: ${verifyGoogle ? 'on' : 'off (set GOOGLE_CLIENT_ID in server/.env to turn it on)'}`)
const fetchResource = createResourceFetcher({ allowPrivate: config.analyzerAllowPrivate, userAgent: config.analyzerUserAgent })
const browser = config.analyzerUseBrowser
  ? await createBrowserRenderer({ allowPrivate: config.analyzerAllowPrivate, userAgent: config.analyzerUserAgent, noSandbox: config.analyzerBrowserNoSandbox })
  : null
console.log(`Browser step for size charts: ${browser ? 'on' : config.analyzerUseBrowser ? 'OFF (the browser is not installed: run "npx playwright install chromium" in the server folder)' : 'off (disabled)'}`)
const app = createApp(db, storage, createAnalyzer(fetchPage, { chartReader, fetchImage, fetchResource, browser }), { provider, fetchImage }, chartReader, { googleClientId: config.googleClientId, verifyGoogle })

const server = app.listen(config.port, () => {
  console.log(`VirtualFit API listening on http://localhost:${config.port}`)
})

const shutdown = () => {
  server.close(() => {
    db.close()
    process.exit(0)
  })
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

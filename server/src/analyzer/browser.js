import dns from 'node:dns'
import { assertSafeUrl, isBlockedAddress } from './ssrfGuard.js'
import { AnalyzeError } from './errors.js'

// OPTIONAL real-browser step. Many stores (Myntra and Flipkart among them) only load their size chart after
// you click "Size chart", so a plain page download never contains it. This opens the page in a headless
// browser, clicks that button, and returns the resulting page, any size-related JSON the page fetched,
// and a screenshot of the opened panel.
//
// UNTESTED AGAINST REAL STORES: a browser could not be installed where this was built. The orchestration
// around it is tested with a stand-in; the browser calls themselves follow Playwright's documented API.
// It is ON by default and installed automatically by `npm install` (about 150 MB, once). If the browser is
// not installed or cannot start, it switches itself off with a message and everything else keeps working.
// Opt out with ANALYZER_USE_BROWSER=false.
//
// Safety: every request the page makes (not just the first) is checked, so a page cannot make the browser
// reach localhost, private networks or cloud metadata. Bot-protection pages are never retried here.
const MAX_CONCURRENT = 2
const SIZE_CHART_LABEL = /size\s*(chart|guide)|find your size|size help/i

// Allowed means: a normal public web address, or an inline data:/blob: resource.
export async function assertRequestAllowed(url, { allowPrivate = false, lookup = dns.promises.lookup } = {}) {
  if (/^(data|blob|about):/i.test(url)) return
  const parsed = assertSafeUrl(url, { allowPrivate })
  if (allowPrivate) return
  const host = parsed.hostname.replace(/^\[|\]$/g, '')
  const addresses = await lookup(host, { all: true })
  if (addresses.some((a) => isBlockedAddress(a.address))) throw new AnalyzeError('blocked_host', 'That address cannot be analyzed.')
}

async function openSizeChart(page) {
  const tries = [
    () => page.getByRole('button', { name: SIZE_CHART_LABEL }).first(),
    () => page.getByRole('link', { name: SIZE_CHART_LABEL }).first(),
    () => page.getByText(SIZE_CHART_LABEL).first(),
  ]
  for (const find of tries) {
    try {
      const el = find()
      if (!(await el.isVisible({ timeout: 1500 }))) continue
      await el.click({ timeout: 3000 })
      await page.waitForTimeout(1800) // let the panel and its data load
      return true
    } catch { /* try the next way of finding it */ }
  }
  return false
}

export async function createBrowserRenderer({ allowPrivate = false, userAgent, timeoutMs = 25_000, noSandbox = false, importPlaywright = () => import('playwright'), lookup = dns.promises.lookup, log = console }) {
  let pw
  try {
    pw = await importPlaywright()
  } catch {
    return null // playwright is not installed: the browser step is simply unavailable
  }
  let browser = null
  let active = 0
  const lookupCache = new Map()
  const cachedLookup = async (host, opts) => {
    if (!lookupCache.has(host)) lookupCache.set(host, lookup(host, opts))
    return lookupCache.get(host)
  }

  // Start the browser once now, so a missing or broken install is found at start-up (and the step is switched
  // off) instead of failing slowly on every product link.
  try {
    browser = await pw.chromium.launch({ headless: true, args: noSandbox ? ['--no-sandbox'] : [] })
  } catch (err) {
    log.warn(`[browser step] OFF: the browser could not start (${String(err.message).split('\n')[0]}). Install it with: npx playwright install chromium (on a Linux server you may also need: npx playwright install-deps chromium)`)
    return null
  }

  return {
    async render(url) {
      if (active >= MAX_CONCURRENT) throw new AnalyzeError('fetch_failed', 'The server is busy. Please try again in a moment.')
      active++
      let context
      try {
        browser ??= await pw.chromium.launch({ headless: true, args: noSandbox ? ['--no-sandbox'] : [] }) // relaunch if it was closed
        context = await browser.newContext({ userAgent, serviceWorkers: 'block', acceptDownloads: false, viewport: { width: 1280, height: 900 }, locale: 'en-IN' })
        await context.route('**/*', async (route) => {
          const request = route.request()
          try {
            await assertRequestAllowed(request.url(), { allowPrivate, lookup: cachedLookup })
          } catch {
            return route.abort('blockedbyclient')
          }
          if (['media', 'font'].includes(request.resourceType())) return route.abort()
          return route.continue()
        })

        const json = []
        const page = await context.newPage()
        page.on('response', async (res) => {
          try {
            if (json.length >= 6 || !/size|chart|guide|measure/i.test(res.url())) return
            if (!/json/i.test(res.headers()['content-type'] ?? '')) return
            const body = await res.text()
            if (body.length < 1_500_000) json.push(JSON.parse(body))
          } catch { /* not JSON, or already gone */ }
        })

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs })
        await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {})
        const opened = await openSizeChart(page)
        const html = await page.content()

        let modalScreenshot = null
        let panelText = null
        if (opened) {
          const panel = page.locator('[role="dialog"], [class*="modal" i], [class*="drawer" i]').first()
          if (await panel.isVisible().catch(() => false)) {
            panelText = await panel.innerText().catch(() => null) // one cell per line: easy to read as a chart
            modalScreenshot = await panel.screenshot({ type: 'png' }).catch(() => null)
          }
        }
        return { html, json, modalScreenshot, panelText, opened }
      } catch (err) {
        if (err instanceof AnalyzeError) throw err
        throw new AnalyzeError(/timeout/i.test(err.name ?? err.message) ? 'timeout' : 'fetch_failed', 'The page could not be opened in a browser.')
      } finally {
        await context?.close().catch(() => {})
        active--
      }
    },
    async close() {
      await browser?.close().catch(() => {})
      browser = null
    },
  }
}

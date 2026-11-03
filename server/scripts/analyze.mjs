#!/usr/bin/env node
// Usage:  npm --prefix server run analyze -- "<product link>" [--no-browser] [--save page.html] [--json]
//
// Shows what the server really receives for a product link, which layer (if any) found a size chart,
// and what to do next. Run this on a store that is not working and send the output to the developer.
import fs from 'node:fs'
import { config } from '../src/config.js'
import { createPageFetcher, createResourceFetcher, createImageFetcher } from '../src/analyzer/fetchPage.js'
import { createBrowserRenderer } from '../src/analyzer/browser.js'
import { createChartReader } from '../src/analyzer/chartReader.js'
import { createAnalyzer } from '../src/analyzer/analyze.js'
import { diagnose, advise } from '../src/analyzer/diagnose.js'

const args = process.argv.slice(2)
const url = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--save')
const flag = (n) => args.includes(`--${n}`)
const saveTo = args.includes('--save') ? args[args.indexOf('--save') + 1] : null
if (!url) {
  console.log('Usage: npm --prefix server run analyze -- "<product link>" [--browser] [--save page.html] [--json]')
  process.exit(1)
}

const opts = { allowPrivate: config.analyzerAllowPrivate, userAgent: config.analyzerUserAgent }
const fetchPage = createPageFetcher(opts)
const out = (s = '') => console.log(s)
const line = () => out('-'.repeat(60))

out(`\nAnalyzing: ${url}\n`)
let page
try {
  page = await fetchPage(url)
} catch (err) {
  line(); out('FETCH FAILED'); out(`  ${err.code ?? 'error'}: ${err.message}`)
  out('\nWHAT TO DO\n  ' + (err.code === 'blocked_by_site' ? 'The store blocks automated requests. Use "Upload a screenshot of the size chart" in the app, or enter the chart by hand.' : 'Check the link opens in your browser. If it does, the store may be blocking this server.'))
  process.exit(2)
}
if (saveTo) { fs.writeFileSync(saveTo, page.html); out(`(page saved to ${saveTo})`) }

const d = diagnose(page.html, page.finalUrl)
line(); out('WHAT THE SERVER RECEIVED')
out(`  final address : ${page.finalUrl}`)
out(`  size          : ${(d.bytes / 1024).toFixed(0)} KB      title: "${d.title}"`)
out(`  bot-protection page : ${d.blocked ? 'YES' : 'no'}`)
out(`  empty script shell  : ${d.looksLikeEmptyShell ? 'YES (content is built by scripts)' : 'no'}`)
out(`  product data (JSON-LD) : ${d.jsonLdProduct ? 'yes' : 'no'}      embedded data blobs: ${d.embeddedJsonBlobs}`)
out(`  tables: ${d.tables.total} (readable size chart: ${d.tables.readableSizeChart ? 'YES' : 'no'})`)
out(`  "Size chart" buttons/links: ${d.sizeChartButtons}      mentions size chart anywhere: ${d.mentionsSizeChart ? 'yes' : 'no'}`)
out(`  chart links: ${d.chartLinks.pages.length} page(s), ${d.chartLinks.images.length} picture(s)      chart-like images: ${d.chartImages.length}`)
if (d.sizeKeyPaths.length) { out('  size-related data in the page:'); d.sizeKeyPaths.forEach((p) => out(`    ${p}`)) }

const chartReader = createChartReader({ apiKey: config.anthropicApiKey, model: config.anthropicModel })
const useBrowser = !flag('no-browser') && config.analyzerUseBrowser
const browser = useBrowser
  ? await createBrowserRenderer({ ...opts, noSandbox: config.analyzerBrowserNoSandbox })
  : null
if (useBrowser && !browser) out('\n  (the browser step is not available: run "npx playwright install chromium" in the server folder)')

const analyze = createAnalyzer(async () => page, { chartReader, fetchImage: createImageFetcher(opts), fetchResource: createResourceFetcher(opts), browser })
let result
try {
  result = await analyze(url)
} catch (err) {
  line(); out('ANALYSIS FAILED'); out(`  ${err.code ?? 'error'}: ${err.message}`)
  out('\nWHAT TO DO\n  ' + advise(d, { browserOn: Boolean(browser), aiOn: chartReader.enabled, chartFound: false }))
  await browser?.close(); process.exit(3)
}

const { product, analysis } = result
line(); out('RESULT')
out(`  name     : ${product.name}`)
out(`  brand    : ${product.brand || '(not found)'}      price: ${product.price ?? '(not found)'}`)
out(`  category : ${product.category ?? '(unknown)'} (${analysis.detectedCategory.confidence})      gender: ${product.gender ?? '(unknown)'}`)
out(`  sizes    : ${product.allSizes.join(', ') || '(none found)'}`)
out(`  read with: ${analysis.extractionMethods.join(', ') || '(nothing)'}`)
if (product.sizeChart) {
  const c = product.sizeChart
  out(`  SIZE CHART FOUND: ${c.rows.length} sizes, measures: ${c.measurements.join(', ')}, basis: ${c.basis}${c.unitGuessed ? `, unit GUESSED as ${c.unitGuessed}` : ''}`)
  c.rows.slice(0, 8).forEach((r) => out(`    ${r.size.padEnd(6)} ${c.measurements.map((m) => `${m}=${r[m] ? r[m].join('-') : '?'}`).join('  ')}  (cm)`))
} else if (analysis.suggestedChart) {
  out(`  size chart read by AI (needs your confirmation): ${analysis.suggestedChart.rows.length} sizes`)
} else {
  out('  size chart: NOT FOUND')
}
analysis.warnings.forEach((w) => out(`  note: ${w}`))
line(); out('WHAT TO DO'); out('  ' + advise(d, { browserOn: Boolean(browser), aiOn: chartReader.enabled, chartFound: Boolean(product.sizeChart) }))
if (flag('json')) { line(); out(JSON.stringify(result, null, 2)) }
await browser?.close()

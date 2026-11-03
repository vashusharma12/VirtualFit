import { Agent, request } from 'undici'
import { assertSafeUrl, createSafeLookup } from './ssrfGuard.js'
import { AnalyzeError } from './errors.js'

const MAX_REDIRECTS = 5
const TIMEOUT_MS = 12_000

// Core safe downloader. Redirects are followed manually so each hop is validated again, and the DNS
// answer used to connect is the one that was checked. `accept` says which content types are wanted.
function createSafeFetcher({ allowPrivate = false, userAgent }) {
  const dispatcher = new Agent({ connect: { lookup: createSafeLookup({ allowPrivate }) } })

  return async function fetchBytes(rawUrl, { accept, typeOk, typeError, maxBytes, tooLargeMessage }) {
    let url = assertSafeUrl(rawUrl, { allowPrivate })

    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      let res
      try {
        res = await request(url, {
          method: 'GET',
          dispatcher,
          headers: { 'user-agent': userAgent, accept, 'accept-language': 'en-IN,en;q=0.9' },
          headersTimeout: TIMEOUT_MS,
          bodyTimeout: TIMEOUT_MS,
          maxRedirections: 0,
        })
      } catch (err) {
        if (err instanceof AnalyzeError) throw err
        if (err.cause instanceof AnalyzeError) throw err.cause
        if (/timeout/i.test(err.code ?? err.name ?? '')) throw new AnalyzeError('timeout', 'The store took too long to respond.')
        throw new AnalyzeError('fetch_failed', 'We could not reach that page.')
      }

      if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
        await res.body.dump()
        const location = res.headers.location
        if (!location) throw new AnalyzeError('fetch_failed', 'The store sent an invalid redirect.')
        url = assertSafeUrl(new URL(location, url).toString(), { allowPrivate })
        continue
      }

      const type = String(res.headers['content-type'] ?? '')
      if (res.statusCode >= 400) {
        await res.body.dump()
        const blockedLike = [401, 403, 429, 503].includes(res.statusCode)
        throw new AnalyzeError(
          blockedLike ? 'blocked_by_site' : 'fetch_failed',
          blockedLike ? 'This store blocked automated access to the page.' : `The store returned an error (${res.statusCode}).`,
        )
      }
      if (!typeOk(type)) {
        await res.body.dump()
        throw new AnalyzeError('not_html', typeError)
      }

      const chunks = []
      let size = 0
      for await (const chunk of res.body) {
        size += chunk.length
        if (size > maxBytes) {
          res.body.destroy()
          throw new AnalyzeError('too_large', tooLargeMessage)
        }
        chunks.push(chunk)
      }
      return { buffer: Buffer.concat(chunks), finalUrl: url.toString(), status: res.statusCode, type }
    }
    throw new AnalyzeError('fetch_failed', 'The link redirected too many times.')
  }
}

export function createPageFetcher(options) {
  const fetchBytes = createSafeFetcher(options)
  async function fetchPage(rawUrl) {
    const { buffer, finalUrl, status } = await fetchBytes(rawUrl, {
      accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
      typeOk: (t) => /text\/html|application\/xhtml/i.test(t),
      typeError: 'That link is not a web page we can read.',
      maxBytes: 3 * 1024 * 1024,
      tooLargeMessage: 'That page is too large to analyze.',
    })
    return { html: buffer.toString('utf8'), finalUrl, status }
  }
  // The address safety check on its own, so callers can run it before anything else looks at the link.
  fetchPage.validate = (rawUrl) => assertSafeUrl(rawUrl, { allowPrivate: options.allowPrivate })
  return fetchPage
}

export function createImageFetcher(options) {
  const fetchBytes = createSafeFetcher(options)
  return async function fetchImage(rawUrl) {
    const { buffer } = await fetchBytes(rawUrl, {
      accept: 'image/avif,image/webp,image/png,image/jpeg;q=0.9,*/*;q=0.1',
      typeOk: (t) => /^image\/(jpeg|png|webp)/i.test(t),
      typeError: 'That link is not a JPG, PNG or WEBP image.',
      maxBytes: 6 * 1024 * 1024,
      tooLargeMessage: 'That product image is too large.',
    })
    return buffer
  }
}

// Fetches a linked resource such as a size-chart page, a data file, or a picture, with the same safety checks.
export function createResourceFetcher(options) {
  const fetchBytes = createSafeFetcher(options)
  return async function fetchResource(rawUrl) {
    const { buffer, type, finalUrl } = await fetchBytes(rawUrl, {
      accept: 'application/json,text/html,image/webp,image/png,image/jpeg;q=0.8,*/*;q=0.1',
      typeOk: (t) => /json|text\/html|xhtml|^image\/(jpeg|png|webp)/i.test(t),
      typeError: 'That link is not a page, data file or picture we can read.',
      maxBytes: 2 * 1024 * 1024,
      tooLargeMessage: 'That size-chart file is too large.',
    })
    return { buffer, type, finalUrl }
  }
}

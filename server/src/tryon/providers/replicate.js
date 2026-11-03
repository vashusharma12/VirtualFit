import sharp from 'sharp'

// REAL provider adapter for Replicate (https://replicate.com). UNTESTED AGAINST THE LIVE SERVICE:
// it was written from Replicate's public HTTP API and its control flow is covered by tests with a
// fake fetch, but it has never called the real API. To use it:
//   1. Create a Replicate account and API token, and choose a virtual try-on model.
//   2. Set in server/.env: TRYON_PROVIDER=replicate, REPLICATE_API_TOKEN=..., REPLICATE_MODEL_VERSION=<version id>
//   3. Check the input names below match your model. They follow the common IDM-VTON layout
//      (human_img, garm_img, category); change `buildInput` if your model differs.
// Photos are sent to Replicate, so this provider is marked `external`: the app asks the shopper to
// confirm before every use. The API token lives only on the server and never reaches the browser.
const API = 'https://api.replicate.com/v1'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const dataUri = (buf, type) => `data:${type};base64,${buf.toString('base64')}`

const CATEGORY = { topwear: 'upper_body', bottomwear: 'lower_body' }

export function createReplicateProvider({ token, version, fetchImpl = fetch, pollMs = 2000, maxWaitMs = 180_000 }) {
  if (!token || !version) throw new Error('The replicate provider needs REPLICATE_API_TOKEN and REPLICATE_MODEL_VERSION.')
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' }

  const fail = (code, message) => Object.assign(new Error(message), { code })

  return {
    id: 'replicate',
    name: 'Replicate',
    external: true,
    supportedCategories: ['topwear', 'bottomwear'],

    async generate({ person, garment, category, size, report, shouldStop }) {
      const input = {
        human_img: dataUri(person, 'image/jpeg'),
        garm_img: dataUri(garment, 'image/png'),
        garment_des: `size ${size}`,
        category: CATEGORY[category],
      }
      await report('Sending to the try-on service', 10)
      const created = await fetchImpl(`${API}/predictions`, { method: 'POST', headers, body: JSON.stringify({ version, input }) })
      if (!created.ok) throw fail('provider_error', `Provider rejected the request (${created.status}).`)
      let prediction = await created.json()

      const started = Date.now()
      while (!['succeeded', 'failed', 'canceled'].includes(prediction.status)) {
        if (shouldStop()) {
          await fetchImpl(`${API}/predictions/${prediction.id}/cancel`, { method: 'POST', headers }).catch(() => {})
          return null
        }
        if (Date.now() - started > maxWaitMs) throw fail('timeout', 'The try-on service took too long.')
        await report('Creating your preview', prediction.status === 'processing' ? 60 : 30)
        await sleep(pollMs)
        const res = await fetchImpl(`${API}/predictions/${prediction.id}`, { headers })
        if (!res.ok) throw fail('provider_error', `Could not check the job (${res.status}).`)
        prediction = await res.json()
      }
      if (prediction.status !== 'succeeded') throw fail('provider_error', 'The try-on service could not create this preview.')

      const url = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output
      let host = ''
      try {
        const u = new URL(url)
        if (u.protocol !== 'https:') throw new Error('not https')
        host = u.hostname
      } catch {
        throw fail('provider_error', 'The try-on service returned an unexpected result.')
      }
      // Only download results from Replicate's own domains.
      if (!/(^|\.)replicate\.(delivery|com)$/.test(host)) throw fail('provider_error', 'The try-on service returned an unexpected result.')
      await report('Downloading your preview', 90)
      const image = await fetchImpl(url)
      if (!image.ok) throw fail('provider_error', 'Could not download the preview.')
      const bytes = Buffer.from(await image.arrayBuffer())
      return sharp(bytes).jpeg({ quality: 90 }).toBuffer()
    },
  }
}

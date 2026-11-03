import sharp from 'sharp'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const esc = (s) => String(s).replace(/[<>&"']/g, '')

// A SIMULATED provider. It does not use AI and does not show the garment on the body. It lays the
// shopper's photo next to the product picture with the chosen size, and says so on the image. It
// exists so the whole flow (consent, queue, progress, results, history) works with no API key.
export function createSimulatedProvider({ delayMs = 1200 } = {}) {
  return {
    id: 'simulated',
    name: 'Simulated preview',
    external: false,
    supportedCategories: ['topwear', 'bottomwear'],

    async generate({ person, garment, size, report, shouldStop }) {
      const stages = [['Preparing your photo', 15], ['Preparing the product image', 40], ['Building the preview', 70], ['Finishing up', 95]]
      for (const [stage, progress] of stages) {
        if (shouldStop()) return null
        await report(stage, progress)
        if (delayMs) await sleep(delayMs)
      }

      const W = 1200
      const H = 1250
      const personPanel = await sharp(person).rotate().resize(700, H, { fit: 'cover', position: 'attention' }).jpeg({ quality: 88 }).toBuffer()
      const card = await sharp(garment).resize(380, 500, { fit: 'contain', background: '#ffffff' }).flatten({ background: '#ffffff' }).png().toBuffer()
      // Three layers, bottom to top: the white product card, the product picture, then the labels.
      const cardBg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect x="720" y="110" width="420" height="540" rx="24" fill="#ffffff" stroke="#e3e7ed" stroke-width="2"/></svg>`)
      const labels = Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
          <rect x="720" y="690" width="190" height="64" rx="32" fill="#1b1f2a"/>
          <text x="815" y="732" text-anchor="middle" font-family="sans-serif" font-size="30" font-weight="bold" fill="#f5c518">Size ${esc(size)}</text>
          <rect x="720" y="1050" width="420" height="120" rx="16" fill="#fdf3c4"/>
          <text x="930" y="1096" text-anchor="middle" font-family="sans-serif" font-size="26" font-weight="bold" fill="#1b1f2a">SIMULATED PREVIEW</text>
          <text x="930" y="1136" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#1b1f2a">Not an AI try-on</text>
        </svg>`,
      )
      return sharp({ create: { width: W, height: H, channels: 3, background: '#f4f6f8' } })
        .composite([{ input: personPanel, left: 0, top: 0 }, { input: cardBg, left: 0, top: 0 }, { input: card, left: 740, top: 130 }, { input: labels, left: 0, top: 0 }])
        .jpeg({ quality: 88 })
        .toBuffer()
    },
  }
}

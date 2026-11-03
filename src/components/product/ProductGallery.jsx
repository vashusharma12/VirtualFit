import { useRef, useState } from 'react'
import ProductImage from './ProductImage'

const VIEW_LABELS = { front: 'Front', back: 'Back', side: 'Side', top: 'Top', detail: 'Detail' }

// Clicking a thumbnail changes the main image. Arrow keys move between thumbnails.
export default function ProductGallery({ images }) {
  const [active, setActive] = useState(0)
  const thumbs = useRef([])
  const index = Math.min(active, images.length - 1)
  const current = images[index]

  const onKeyDown = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const next = (index + (e.key === 'ArrowRight' ? 1 : -1) + images.length) % images.length
    setActive(next)
    thumbs.current[next]?.focus()
  }

  return (
    <div>
      <div className="aspect-[4/5] overflow-hidden rounded-2xl border border-line bg-white" aria-live="polite">
        <ProductImage key={current.src} src={current.src} alt={current.alt} eager />
      </div>
      <div className="mt-3 grid grid-cols-4 gap-3" role="group" aria-label="Product images" onKeyDown={onKeyDown}>
        {images.map((img, i) => (
          <button
            key={img.view}
            ref={(el) => { thumbs.current[i] = el }}
            type="button"
            onClick={() => setActive(i)}
            aria-label={`Show ${VIEW_LABELS[img.view] ?? img.view} view`}
            aria-pressed={i === index}
            className={`aspect-[4/5] overflow-hidden rounded-xl border-2 bg-white transition-colors ${i === index ? 'border-ink' : 'border-line hover:border-ink/40'}`}
          >
            <ProductImage src={img.src} alt="" />
          </button>
        ))}
      </div>
    </div>
  )
}

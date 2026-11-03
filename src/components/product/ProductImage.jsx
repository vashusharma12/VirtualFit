import { useState } from 'react'
import { FALLBACK_IMAGE } from '../../utils/productArt'

// Shows a product image and swaps in a placeholder if it fails to load (real URLs can break).
export default function ProductImage({ src, alt, className = '', eager = false }) {
  const [failed, setFailed] = useState(false)
  return (
    <img
      src={failed ? FALLBACK_IMAGE : src}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`h-full w-full object-cover ${className}`}
    />
  )
}

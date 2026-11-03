import { formatPrice } from '../../utils/format'

export default function ProductPrice({ price, size = 'md' }) {
  return (
    <p className={`font-display font-bold ${size === 'lg' ? 'text-3xl' : 'text-base'}`}>
      {formatPrice(price)}
    </p>
  )
}

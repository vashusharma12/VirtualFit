import Button from '../common/Button'

// Sends the shopper to the size guide for this product (built in phase 8). Needs a profile.
export default function SizeGuideButton({ productId, size }) {
  const query = new URLSearchParams({ product: productId, ...(size ? { size } : {}) })
  return (
    <Button to={`/size-guide?${query}`} variant="accent" size="lg" className="w-full">
      Find my size
    </Button>
  )
}

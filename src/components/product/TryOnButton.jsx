import Button from '../common/Button'

export default function TryOnButton({ productId, size }) {
  if (!size) {
    return <Button variant="secondary" size="lg" className="w-full" disabled>Try it on me</Button>
  }
  const query = new URLSearchParams({ product: productId, size })
  return (
    <Button to={`/try-on?${query}`} variant="secondary" size="lg" className="w-full">
      Try it on me
    </Button>
  )
}

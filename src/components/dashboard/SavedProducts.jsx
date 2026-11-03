import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import Card from '../common/Card'
import Button from '../common/Button'
import ProductImage from '../product/ProductImage'
import ProductPrice from '../product/ProductPrice'
import Skeleton from '../common/Skeleton'

export default function SavedProducts() {
  const ids = useSelector((s) => s.profile.savedProductIds)
  const { products, status } = useSelector((s) => s.products)
  const saved = ids.map((id) => products.find((p) => p.id === id)).filter(Boolean)

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Saved products</h2>
        <Button to="/products" variant="secondary" size="sm">Browse</Button>
      </div>
      {ids.length === 0 && <p className="mt-3 text-sm text-muted">Tap the heart on a product to save it here.</p>}
      {ids.length > 0 && status !== 'succeeded' && <Skeleton className="mt-4 h-28" />}
      {saved.length > 0 && (
        <ul className="mt-4 grid grid-cols-3 gap-3">
          {saved.slice(0, 6).map((p) => (
            <li key={p.id}>
              <Link to={`/products/${p.id}`} className="block">
                <div className="aspect-[4/5] overflow-hidden rounded-lg border border-line bg-white"><ProductImage src={p.image} alt={p.name} /></div>
                <p className="mt-1.5 truncate text-sm font-medium">{p.name}</p>
                <ProductPrice price={p.price} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

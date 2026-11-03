import { Link } from 'react-router-dom'
import { CATEGORY_BY_ID } from '../../data/categories'
import ProductImage from './ProductImage'
import ProductRating from './ProductRating'
import ProductPrice from './ProductPrice'
import SaveProductButton from './SaveProductButton'

export default function ProductCard({ product }) {
  return (
    <article className="group relative">
      <Link to={`/products/${product.id}`} className="block rounded-2xl">
        <div className="aspect-[4/5] overflow-hidden rounded-2xl border border-line bg-white transition-shadow group-hover:shadow-md">
          <ProductImage src={product.image} alt={`${product.name} in ${product.color}`} className="transition-transform duration-300 group-hover:scale-[1.03]" />
        </div>
        <div className="mt-3 space-y-1 px-0.5">
          <p className="text-xs text-muted">{product.brand} · {CATEGORY_BY_ID[product.category].singular}</p>
          <h3 className="font-sans text-base font-medium leading-snug">{product.name}</h3>
          <ProductRating rating={product.rating} compact />
          <div className="flex items-baseline justify-between">
            <ProductPrice price={product.price} />
            <span className="text-xs text-muted">{product.colors.length} colours</span>
          </div>
        </div>
      </Link>
      <SaveProductButton productId={product.id} productName={product.name} className="absolute right-2.5 top-2.5" />
    </article>
  )
}

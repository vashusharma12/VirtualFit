import { useState } from 'react'
import { Link } from 'react-router-dom'
import { galleryForColor } from '../../data/products'
import { CATEGORY_BY_ID } from '../../data/categories'
import ProductGallery from './ProductGallery'
import ProductRating from './ProductRating'
import ProductPrice from './ProductPrice'
import ProductOptions from './ProductOptions'
import ProductInformation from './ProductInformation'

// Rendered with key={product.id}, so colour and size selections reset when the product changes.
export default function ProductView({ product }) {
  const [color, setColor] = useState(product.colors[0])
  const [size, setSize] = useState(null)
  const images = galleryForColor(product, color)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link to="/products" className="hover:text-ink hover:underline">Products</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link to={`/products?category=${product.category}`} className="hover:text-ink hover:underline">{CATEGORY_BY_ID[product.category].label}</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-ink">{product.name}</li>
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
        <ProductGallery images={images} />

        <div className="space-y-6">
          <div>
            <p className="text-sm text-muted">{product.brand}</p>
            <h1 className="mt-1 text-3xl font-bold sm:text-4xl">{product.name}</h1>
            <div className="mt-3"><ProductRating rating={product.rating} reviewCount={product.reviewCount} /></div>
            <div className="mt-4"><ProductPrice price={product.price} size="lg" /></div>
          </div>
          <p className="text-muted">{product.description}</p>
          <ProductOptions product={product} color={color} onColorChange={setColor} size={size} onSizeChange={setSize} />
        </div>
      </div>

      <div className="mt-12 grid gap-8 lg:grid-cols-2 lg:gap-14">
        <ProductInformation product={product} />
      </div>
    </div>
  )
}

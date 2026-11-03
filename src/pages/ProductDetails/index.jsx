import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams } from 'react-router-dom'
import { fetchProductById } from '../../redux/slices/productSlice'
import ProductView from '../../components/product/ProductView'
import Skeleton from '../../components/common/Skeleton'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import Button from '../../components/common/Button'

function DetailSkeleton() {
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2" aria-busy="true" aria-label="Loading product">
      <Skeleton className="aspect-[4/5] rounded-2xl" />
      <div className="space-y-4">
        <Skeleton className="h-4 w-1/4" /><Skeleton className="h-9 w-3/4" /><Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-8 w-1/4" /><Skeleton className="h-20 w-full" /><Skeleton className="h-11 w-full" />
      </div>
    </div>
  )
}

export default function ProductDetails() {
  const { id } = useParams()
  const dispatch = useDispatch()
  const { selectedProduct, detailStatus, detailError } = useSelector((s) => s.products)

  useEffect(() => {
    dispatch(fetchProductById(id))
  }, [dispatch, id])

  // selectedProduct may still be the previous product for one render while the new one loads.
  const ready = detailStatus === 'succeeded' && selectedProduct?.id === id

  if (detailStatus === 'notFound') {
    return (
      <EmptyState
        headingLevel={1}
        title="Product not found"
        description="That product may have been removed, or the link is wrong."
        action={<Button to="/products" variant="accent">Browse products</Button>}
      />
    )
  }
  if (detailStatus === 'failed') {
    return <div className="px-4 py-16"><ErrorState headingLevel={1} title="Could not load this product" message={detailError} onRetry={() => dispatch(fetchProductById(id))} /></div>
  }
  if (!ready) return <DetailSkeleton />
  return <ProductView key={selectedProduct.id} product={selectedProduct} />
}

import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useSearchParams } from 'react-router-dom'
import { fetchProducts, resetFilters, setFilters } from '../../redux/slices/productSlice'
import { selectActiveFilterCount, selectFilteredProducts } from '../../redux/selectors/productSelectors'
import { CATEGORY_BY_ID } from '../../data/categories'
import ProductFilters from '../../components/product/ProductFilters'
import ProductGrid, { ProductGridSkeleton } from '../../components/product/ProductGrid'
import SelectField from '../../components/common/SelectField'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import Button from '../../components/common/Button'
import Badge from '../../components/common/Badge'

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
  { value: 'name', label: 'Name: A to Z' },
]

export default function Products() {
  const dispatch = useDispatch()
  const [params] = useSearchParams()
  const { status, error, products, filters } = useSelector((s) => s.products)
  const results = useSelector(selectFilteredProducts)
  const activeCount = useSelector(selectActiveFilterCount)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    dispatch(fetchProducts())
  }, [dispatch])

  // Links like /products?category=shoes preselect that category.
  const categoryParam = params.get('category')
  useEffect(() => {
    if (categoryParam && CATEGORY_BY_ID[categoryParam]) dispatch(setFilters({ category: categoryParam }))
  }, [categoryParam, dispatch])

  const loading = status === 'idle' || status === 'loading'

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">Products</h1>
          <p className="mt-2 max-w-xl text-muted">These are demo products with made-up brands, so you can explore VirtualFit. To check a real product, <Link to="/" className="font-medium text-denim underline underline-offset-2">paste its link on the home page</Link>.</p>
        </div>
        <Badge tone="accent">Demo catalog: sample products and illustrations</Badge>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[250px_1fr]">
        <aside aria-label="Filters">
          <Button variant="secondary" className="w-full lg:hidden" aria-expanded={showFilters} aria-controls="filter-panel" onClick={() => setShowFilters((v) => !v)}>
            {showFilters ? 'Hide filters' : `Filters${activeCount ? ` (${activeCount})` : ''}`}
          </Button>
          <div id="filter-panel" className={`${showFilters ? 'mt-4 block' : 'hidden'} lg:block`}>
            <ProductFilters />
          </div>
        </aside>

        <section aria-label="Product results">
          {status === 'failed' && <ErrorState title="Could not load products" message={error} onRetry={() => dispatch(fetchProducts())} />}

          {loading && <ProductGridSkeleton />}

          {status === 'succeeded' && (
            <>
              <div className="mb-5 flex items-end justify-between gap-4">
                <p className="text-sm text-muted" role="status" aria-live="polite">
                  {results.length} {results.length === 1 ? 'product' : 'products'}
                </p>
                <SelectField label="Sort by" value={filters.sort} onChange={(v) => dispatch(setFilters({ sort: v }))} options={SORT_OPTIONS} className="w-48" />
              </div>

              {products.length === 0 && <EmptyState title="No products yet" description="The catalog is empty. Please check back soon." />}

              {products.length > 0 && results.length === 0 && (
                <EmptyState
                  title="No products match"
                  description="Try a different search, or remove some filters."
                  action={<Button variant="secondary" onClick={() => dispatch(resetFilters())}>Clear all filters</Button>}
                />
              )}

              {results.length > 0 && <ProductGrid products={results} />}
            </>
          )}
        </section>
      </div>
    </div>
  )
}

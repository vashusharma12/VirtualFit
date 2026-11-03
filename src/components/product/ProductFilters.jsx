import { useDispatch, useSelector } from 'react-redux'
import { setFilters, resetFilters } from '../../redux/slices/productSlice'
import { selectBrands, selectActiveFilterCount } from '../../redux/selectors/productSelectors'
import { CATEGORIES } from '../../data/categories'
import SelectField from '../common/SelectField'
import Button from '../common/Button'

export const PRICE_BUCKETS = [
  { value: 'any', label: 'Any price', range: [0, null] },
  { value: 'u1000', label: 'Under ₹1,000', range: [0, 999] },
  { value: '1000-2500', label: '₹1,000 to ₹2,500', range: [1000, 2500] },
  { value: '2500-5000', label: '₹2,500 to ₹5,000', range: [2500, 5000] },
  { value: 'o5000', label: 'Over ₹5,000', range: [5000, null] },
]

const bucketFor = ([min, max]) =>
  PRICE_BUCKETS.find((b) => b.range[0] === min && b.range[1] === max)?.value ?? 'any'

export default function ProductFilters() {
  const dispatch = useDispatch()
  const filters = useSelector((s) => s.products.filters)
  const brands = useSelector(selectBrands)
  const activeCount = useSelector(selectActiveFilterCount)

  const toggleBrand = (brand) =>
    dispatch(setFilters({ brands: filters.brands.includes(brand) ? filters.brands.filter((b) => b !== brand) : [...filters.brands, brand] }))

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="product-search" className="mb-1.5 block text-sm font-medium">Search</label>
        <input
          id="product-search"
          type="search"
          value={filters.search}
          onChange={(e) => dispatch(setFilters({ search: e.target.value }))}
          placeholder="Name, brand or colour"
          className="h-11 w-full rounded-lg border border-line bg-white px-3 text-base outline-none focus:border-denim sm:text-sm"
        />
      </div>

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">Category</legend>
        <div className="space-y-1">
          {[{ id: 'all', label: 'All products' }, ...CATEGORIES].map((c) => (
            <label key={c.id} className="flex cursor-pointer items-center gap-2.5 rounded-md px-1 py-1.5 text-sm hover:bg-ink/5">
              <input type="radio" name="category" checked={filters.category === c.id} onChange={() => dispatch(setFilters({ category: c.id }))} className="h-4 w-4 accent-denim" />
              {c.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">Brand</legend>
        <div className="space-y-1">
          {brands.map((b) => (
            <label key={b} className="flex cursor-pointer items-center gap-2.5 rounded-md px-1 py-1.5 text-sm hover:bg-ink/5">
              <input type="checkbox" checked={filters.brands.includes(b)} onChange={() => toggleBrand(b)} className="h-4 w-4 accent-denim" />
              {b}
            </label>
          ))}
        </div>
      </fieldset>

      <SelectField
        label="Price"
        value={bucketFor(filters.priceRange)}
        onChange={(v) => dispatch(setFilters({ priceRange: PRICE_BUCKETS.find((b) => b.value === v).range }))}
        options={PRICE_BUCKETS}
      />

      {activeCount > 0 && (
        <Button variant="secondary" size="sm" className="w-full" onClick={() => dispatch(resetFilters())}>
          Clear all filters ({activeCount})
        </Button>
      )}
    </div>
  )
}

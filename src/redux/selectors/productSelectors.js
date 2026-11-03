import { createSelector } from '@reduxjs/toolkit'

const selectProducts = (s) => s.products.products
export const selectFilters = (s) => s.products.filters

export const selectBrands = createSelector([selectProducts], (products) =>
  [...new Set(products.map((p) => p.brand))].sort((a, b) => a.localeCompare(b)),
)

const SORTERS = {
  featured: null, // keeps catalog order
  'price-asc': (a, b) => a.price - b.price,
  'price-desc': (a, b) => b.price - a.price,
  rating: (a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount,
  name: (a, b) => a.name.localeCompare(b.name),
}

export function filterAndSort(products, { search, category, brands, priceRange, sort }) {
  const q = search.trim().toLowerCase()
  const [min, max] = priceRange
  const result = products.filter((p) => {
    if (category !== 'all' && p.category !== category) return false
    if (brands.length && !brands.includes(p.brand)) return false
    if (p.price < min || (max != null && p.price > max)) return false
    if (q) {
      const colors = (p.colors ?? []).map((c) => c.name).join(' ')
      const haystack = `${p.name} ${p.brand} ${p.color} ${colors} ${p.subtype} ${p.category} ${p.description}`.toLowerCase()
      if (!q.split(/\s+/).every((word) => haystack.includes(word))) return false
    }
    return true
  })
  const sorter = SORTERS[sort]
  return sorter ? [...result].sort(sorter) : result
}

export const selectFilteredProducts = createSelector([selectProducts, selectFilters], filterAndSort)

export const selectActiveFilterCount = createSelector([selectFilters], (f) =>
  [f.search.trim(), f.category !== 'all', f.brands.length, f.priceRange[0] > 0 || f.priceRange[1] != null].filter(Boolean).length,
)

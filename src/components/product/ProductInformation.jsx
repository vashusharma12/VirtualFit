import { CATEGORY_BY_ID } from '../../data/categories'

const GENDER = { men: "Men's", women: "Women's", unisex: 'Unisex' }

export default function ProductInformation({ product }) {
  const rows = [
    ['Category', CATEGORY_BY_ID[product.category].singular],
    ['Material', product.material],
    ['Fit', product.fit],
    ['Sizing', GENDER[product.gender] ?? product.gender],
    ['Size chart', product.sizeChart.name],
  ]
  return (
    <section aria-labelledby="product-info-heading">
      <h2 id="product-info-heading" className="text-lg font-bold">Product information</h2>
      <dl className="mt-3 divide-y divide-line rounded-xl border border-line bg-white">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[110px_1fr] gap-3 px-4 py-2.5 text-sm">
            <dt className="text-muted">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

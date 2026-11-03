import SectionHeading from './SectionHeading'
import Badge from '../common/Badge'

const categories = [
  { id: 'topwear', name: 'Topwear', needs: 'Chest, shoulder, waist and height', feature: 'Size and try-on preview' },
  { id: 'bottomwear', name: 'Bottomwear', needs: 'Waist, hips and inseam', feature: 'Size and try-on preview' },
  { id: 'shoes', name: 'Shoes', needs: 'Foot length', feature: 'Size advice' },
  { id: 'headwear', name: 'Caps and hats', needs: 'Head circumference', feature: 'Size advice' },
]

export default function CategoryGrid() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <SectionHeading title="Built for what you actually wear">
          Each category asks only for the measurements that matter to it.
        </SectionHeading>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((c) => (
            <li key={c.id}>
              <div className="flex h-full flex-col rounded-2xl border border-line p-5">
                <h3 className="text-xl font-bold">{c.name}</h3>
                <p className="mt-2 flex-1 text-sm text-muted">Uses: {c.needs}</p>
                <div className="mt-4"><Badge tone={c.feature.includes('try-on') ? 'accent' : 'neutral'}>{c.feature}</Badge></div>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-muted">
          Try-on previews work best for tops and bottoms. Shoes and caps get size advice only for now.
        </p>
      </div>
    </section>
  )
}

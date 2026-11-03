import SectionHeading from './SectionHeading'

const angles = ['Front', 'Left', 'Right', 'Back']

function Silhouette() {
  return (
    <svg viewBox="0 0 60 100" className="h-full w-full text-ink/15" fill="currentColor" aria-hidden="true">
      <circle cx="30" cy="14" r="9" />
      <path d="M14 34c0-5 6-8 16-8s16 3 16 8l3 30h-8l-1 30H20l-1-30h-8z" />
    </svg>
  )
}

export default function TryOnPreview() {
  return (
    <section className="bg-ink text-white">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:gap-16">
        <div>
          <h2 className="text-3xl font-bold sm:text-4xl">See the product on you, not on a model</h2>
          <p className="mt-3 max-w-xl text-lg text-white/70">
            Add photos from up to four angles and VirtualFit shows the product on your own picture.
            The preview shows how the item looks. Your size comes from your measurements, because a
            picture cannot tell you how a size will drape.
          </p>
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Photo angles">
          {angles.map((a) => (
            <li key={a} className="rounded-xl bg-white/5 p-3 text-center">
              <div className="mx-auto h-28 w-16"><Silhouette /></div>
              <p className="mt-2 text-sm font-medium">{a}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

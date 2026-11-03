import HomeLinkBox from './HomeLinkBox'

export default function HomeHero() {
  return (
    <section className="border-b border-line bg-gradient-to-b from-white to-fog">
      <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6 sm:py-20">
        <p className="font-display text-lg font-medium text-denim">Know your size. See your fit.</p>
        <h1 className="mt-3 text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl">Paste any product link. Get your size.</h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted">
          VirtualFit reads the store's size chart, compares it with your measurements, and tells you which size to buy, and why.
        </p>
        <div className="mt-9 text-left"><HomeLinkBox /></div>
      </div>
    </section>
  )
}

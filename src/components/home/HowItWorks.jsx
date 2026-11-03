import SectionHeading from './SectionHeading'

const steps = [
  { title: 'Create your fit profile', text: 'Enter your height, weight and a few body measurements. Only the ones a product needs are ever asked for.' },
  { title: 'Add photos from four angles', text: 'Front, left, right and back, taken with simple on-screen guides. Optional, private, and deleted whenever you choose.' },
  { title: 'Paste a product link', text: 'From stores like Myntra, Ajio, Flipkart or Amazon India. VirtualFit reads the product and its size chart.' },
  { title: 'Get your size', text: 'Your measurements are compared with the chart, and you see which size fits and exactly why.' },
  { title: 'Preview it on you', text: 'See the product on your own photo before you spend anything.' },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <SectionHeading title="The five steps">
        From a product link to a size you can trust.
      </SectionHeading>
      <ol className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-5">
        {steps.map((s, i) => (
          <li key={s.title}>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-tape font-display text-base font-bold">{i + 1}</span>
            <h3 className="mt-4 text-lg font-bold leading-snug">{s.title}</h3>
            <p className="mt-2 text-sm text-muted">{s.text}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

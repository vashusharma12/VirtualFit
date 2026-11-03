import WhyVirtualFit from '../../components/home/WhyVirtualFit'
import CtaBanner from '../../components/home/CtaBanner'

const REAL = [
  ['Size recommendations', 'A matching of your measurements against the size chart, with a confidence score and the reasons shown. It is a careful estimate, not a guarantee: self-measurements and charts are never exact.'],
  ['Body shape', 'Worked out from your chest, waist and hips only. It does not look at your photos.'],
  ['Reading a store page', 'Works for many stores. Some stores block automated requests, and some show their chart only as a picture. When that happens we say so, and you can upload a screenshot or type the chart in.'],
  ['The try-on preview', 'Depending on how this site is set up, it is either a simple side-by-side of your photo and the product, or an image made by an AI service. It always tells you which one you are looking at.'],
]

export default function About() {
  return (
    <>
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
          <h1 className="text-4xl font-bold leading-[1.05] sm:text-5xl">About VirtualFit</h1>
          <p className="mt-5 text-lg text-muted">
            Buying clothes online means guessing your size from a chart you cannot try on. A wrong guess means a return. VirtualFit exists to take the guesswork out: you give it a product link and your measurements, and it tells you which size to buy and why.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6" aria-labelledby="real-heading">
        <h2 id="real-heading" className="text-3xl font-bold">What is exact, and what is an estimate</h2>
        <p className="mt-2 text-muted">We would rather tell you than let you assume.</p>
        <dl className="mt-6 space-y-5">
          {REAL.map(([title, text]) => (
            <div key={title} className="border-t-2 border-ink pt-3">
              <dt className="font-display text-lg font-bold">{title}</dt>
              <dd className="mt-1 text-muted">{text}</dd>
            </div>
          ))}
        </dl>
      </section>

      <WhyVirtualFit />

      <section className="mx-auto max-w-3xl px-4 pb-6 sm:px-6" aria-labelledby="built-heading">
        <h2 id="built-heading" className="text-3xl font-bold">Who built this</h2>
        <p className="mt-3 text-muted">
          VirtualFit is a portfolio project: a full-stack web app with a React front end and a Node server, built to show how a size-recommendation and virtual try-on product can be put together carefully, including the privacy side of handling photos of people.
        </p>
      </section>
      <CtaBanner />
    </>
  )
}

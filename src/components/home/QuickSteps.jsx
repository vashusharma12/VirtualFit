import { Link } from 'react-router-dom'

const STEPS = [
  { title: 'Paste a link', text: 'Any product page from a store you shop at.' },
  { title: 'Add your measurements once', text: 'A minute with a tape measure. They are saved for every product after.' },
  { title: 'Get your size, then preview it', text: 'See the size, how sure we are, and a preview of it on your photo.' },
]

export default function QuickSteps() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20" aria-labelledby="quick-steps">
      <h2 id="quick-steps" className="text-center text-3xl font-bold">Three steps</h2>
      <ol className="mt-8 grid gap-6 sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.title} className="rounded-2xl border border-line bg-white p-5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-tape font-display font-bold">{i + 1}</span>
            <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
            <p className="mt-1.5 text-sm text-muted">{s.text}</p>
          </li>
        ))}
      </ol>
      <p className="mt-8 text-center text-sm text-muted">
        <Link to="/how-it-works" className="font-medium text-denim underline underline-offset-2">See how it works</Link>
        {' · '}
        <Link to="/about" className="font-medium text-denim underline underline-offset-2">What is real and what is an estimate</Link>
      </p>
    </section>
  )
}

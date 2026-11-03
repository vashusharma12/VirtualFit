import SectionHeading from './SectionHeading'

const reasons = [
  { title: 'Every size is explained', text: 'You see which measurements matched, which did not, and how confident the result is.' },
  { title: 'Your photos stay yours', text: 'Photos are uploaded only with your consent, kept private, and permanently deleted when you ask.' },
  { title: 'Honest about limits', text: 'Self-measurements and size charts are imperfect. When the match is close, VirtualFit says so rather than pretending to be certain.' },
  { title: 'Made for the stores you use', text: 'Built for links from Myntra, Ajio, Flipkart and Amazon India. If a page cannot be read, you can enter the size chart yourself.' },
]

export default function WhyVirtualFit() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <SectionHeading title="Why people use VirtualFit" />
      <dl className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2">
        {reasons.map((r) => (
          <div key={r.title} className="border-t-2 border-ink pt-4">
            <dt className="text-xl font-bold font-display">{r.title}</dt>
            <dd className="mt-2 text-muted">{r.text}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

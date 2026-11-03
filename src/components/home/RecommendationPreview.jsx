import SectionHeading from './SectionHeading'
import Card from '../common/Card'

const rows = [
  { part: 'Chest', you: '96 cm', range: '92–98 cm', ok: true },
  { part: 'Shoulder', you: '44 cm', range: '43–45 cm', ok: true },
  { part: 'Waist', you: '82 cm', range: '80–86 cm', ok: true },
]

export default function RecommendationPreview() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:gap-16">
      <div>
        <SectionHeading title="A size, and the reasons behind it">
          VirtualFit does not just say "M". It shows how your measurements compare with each size, how
          confident the match is, and what a smaller or larger size would feel like.
        </SectionHeading>
      </div>
      <Card className="p-5 sm:p-6" aria-label="Example size recommendation">
        <p className="text-xs text-muted">Example recommendation</p>
        <div className="mt-2 flex items-end justify-between">
          <div>
            <p className="text-sm text-muted">Recommended size</p>
            <p className="font-display text-6xl font-bold leading-none">M</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted">Confidence</p>
            <p className="font-display text-3xl font-bold text-ok">92%</p>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-ink/10" role="img" aria-label="Confidence 92 percent">
          <div className="h-full w-[92%] rounded-full bg-ok" />
        </div>
        <p className="mt-4 text-sm">Your chest measurement falls comfortably within the M range.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Your measurements compared with size M</caption>
            <thead className="text-muted">
              <tr><th className="py-2 font-medium">Measurement</th><th className="py-2 font-medium">You</th><th className="py-2 font-medium">Size M</th><th className="py-2 font-medium"><span className="sr-only">Match</span></th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.part} className="border-t border-line">
                  <td className="py-2">{r.part}</td>
                  <td className="py-2">{r.you}</td>
                  <td className="py-2">{r.range}</td>
                  <td className="py-2 font-medium text-ok">{r.ok ? 'In range' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  )
}

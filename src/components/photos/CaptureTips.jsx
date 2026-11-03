import Card from '../common/Card'

const TIPS = [
  'Ask a friend, or prop your phone about 2 metres away at chest height, held upright.',
  'Get your whole body in frame, head to feet, with a little space around you.',
  'Stand in front of a plain wall in good, even light.',
  'Wear fitted clothing so your shape is visible.',
  'Only upload photos of yourself.',
]

export default function CaptureTips() {
  return (
    <Card className="bg-tape-soft/60 p-5">
      <h2 className="text-lg font-bold">For the best results</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
        {TIPS.map((t) => <li key={t}>{t}</li>)}
      </ul>
      <p className="mt-3 text-xs text-muted">
        VirtualFit checks resolution, orientation and sharpness, but it cannot confirm your full body is in frame, so check each photo against the tips.
      </p>
    </Card>
  )
}

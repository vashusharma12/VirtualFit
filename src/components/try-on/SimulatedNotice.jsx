export default function SimulatedNotice({ strong = false }) {
  return (
    <div role="note" className={`rounded-xl border border-tape bg-tape-soft px-4 py-3 text-sm ${strong ? 'font-medium' : ''}`}>
      <strong>Simulated preview.</strong> This shows your photo beside the product in the size you chose. It is not an AI image of the
      clothing on your body, and it cannot show how the fabric will drape. Your size advice comes from your measurements.
    </div>
  )
}

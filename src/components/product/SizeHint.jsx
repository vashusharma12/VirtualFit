import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { recommendSize } from '../../utils/sizeEngine'

// A quick "likely your size" hint on the product page, using the same engine as the size guide.
export default function SizeHint({ product, onUseSize }) {
  const isAuthenticated = useSelector((s) => s.auth.isAuthenticated)
  const measurements = useSelector((s) => s.measurements)
  const fitPreference = useSelector((s) => s.profile.preferences?.fitPreference)

  const result = useMemo(
    () => recommendSize(measurements, product.sizeChart, product.category, {
      fitPreference, availableSizes: product.availableSizes, productFit: product.fit, unit: measurements.displayUnits.length,
    }),
    [measurements, fitPreference, product],
  )
  if (!isAuthenticated) return null

  if (result.status === 'insufficient') {
    return (
      <p className="rounded-xl bg-fog px-4 py-3 text-sm">
        <Link to="/measurements" className="font-medium text-denim underline underline-offset-2">Add your measurements</Link> to see which size is likely to fit you.
      </p>
    )
  }
  if (result.status === 'no_good_fit') {
    return (
      <p className="rounded-xl bg-danger/5 px-4 py-3 text-sm">
        No size in this chart fits your measurements well. <Link to={`/size-guide?product=${product.id}`} className="font-medium underline underline-offset-2">See details</Link>
      </p>
    )
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-tape-soft px-4 py-3 text-sm">
      <p>
        Likely your size: <strong className="font-display text-base">{result.recommendedSize}</strong>
        <span className="text-muted"> · {result.confidence}% confidence</span>
      </p>
      <div className="flex gap-3">
        <button type="button" onClick={() => onUseSize(result.recommendedSize)} className="font-medium text-denim underline underline-offset-2">Select {result.recommendedSize}</button>
        <Link to={`/size-guide?product=${product.id}`} className="font-medium text-denim underline underline-offset-2">See why</Link>
      </div>
    </div>
  )
}

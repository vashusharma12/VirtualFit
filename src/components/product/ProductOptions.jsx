import { useState } from 'react'
import { useSelector } from 'react-redux'
import Modal from '../common/Modal'
import SizeChartTable from './SizeChartTable'
import SizeSelector from './SizeSelector'
import SizeGuideButton from './SizeGuideButton'
import TryOnButton from './TryOnButton'
import SaveProductButton from './SaveProductButton'
import SizeHint from './SizeHint'

export default function ProductOptions({ product, color, onColorChange, size, onSizeChange }) {
  const [chartOpen, setChartOpen] = useState(false)
  const isAuthenticated = useSelector((s) => s.auth.isAuthenticated)
  const unit = useSelector((s) => s.measurements.displayUnits.length)
  const sizes = product.sizeChart.rows.map((r) => r.size)

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Colour: <span className="font-normal text-muted">{color.name}</span></legend>
        <div className="flex flex-wrap gap-2.5">
          {product.colors.map((c) => (
            <label key={c.name} className="cursor-pointer">
              <input type="radio" name="color" value={c.name} checked={c.name === color.name} onChange={() => onColorChange(c)} className="peer sr-only" />
              <span className="block h-9 w-9 rounded-full border border-ink/20 ring-offset-2 peer-checked:ring-2 peer-checked:ring-ink peer-focus-visible:ring-2 peer-focus-visible:ring-denim" style={{ backgroundColor: c.hex }}>
                <span className="sr-only">{c.name}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <SizeHint product={product} onUseSize={onSizeChange} />

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium" id="size-label">Size</p>
          <button type="button" onClick={() => setChartOpen(true)} className="text-sm font-medium text-denim underline underline-offset-2">
            Size chart
          </button>
        </div>
        <SizeSelector sizes={sizes} available={product.availableSizes} value={size} onChange={onSizeChange} />
      </div>

      <div className="space-y-3">
        <SizeGuideButton productId={product.id} size={size} />
        <TryOnButton productId={product.id} size={size} />
        {!size && <p className="text-xs text-muted">Choose a size to enable the try-on preview.</p>}
        {!isAuthenticated && <p className="text-xs text-muted">You will be asked to log in first. It only takes a minute.</p>}
        <div className="flex items-center gap-2 text-sm text-muted">
          <SaveProductButton productId={product.id} productName={product.name} className="border border-line" />
          <span>Save for later</span>
        </div>
      </div>

      <Modal open={chartOpen} onClose={() => setChartOpen(false)} title={`Size chart: ${product.sizeChart.name}`}>
        <p className="mb-3 text-sm text-muted">These are body measurements, not garment measurements. Demo chart.</p>
        <SizeChartTable chart={product.sizeChart} unit={unit} highlightSize={size} />
      </Modal>
    </div>
  )
}

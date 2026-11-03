import { CATEGORY_BY_ID } from '../../data/categories'
import { formatPrice } from '../../utils/format'
import Card from '../common/Card'
import Button from '../common/Button'
import ProductImage from '../product/ProductImage'
import SizeSelector from '../product/SizeSelector'
import SimulatedNotice from './SimulatedNotice'
import ExternalConsent from './ExternalConsent'

export default function TryOnStage({ product, photoUrl, sizes, availableSizes, size, onSizeChange, recommendation, provider, confirmed, onConfirm, onGenerate }) {
  const external = provider?.external
  const ready = Boolean(size) && (!external || confirmed)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <h2 className="text-base font-bold">You</h2>
          <div className="mt-3 aspect-[3/4] overflow-hidden rounded-xl bg-fog"><ProductImage src={photoUrl} alt="Your front photo" eager /></div>
          <a href="/body-profile" className="mt-2 inline-block text-sm font-medium text-denim underline underline-offset-2">Change photo</a>
        </Card>

        <Card className="p-4">
          <h2 className="text-base font-bold">Product</h2>
          <div className="mt-3 aspect-[3/4] overflow-hidden rounded-xl bg-fog">
            {product.image ? <ProductImage src={product.image} alt={product.name} eager /> : <div className="grid h-full place-items-center text-sm text-muted">No image</div>}
          </div>
          <p className="mt-2 text-sm text-muted">{product.brand}{product.brand && ' · '}{CATEGORY_BY_ID[product.category]?.singular}</p>
          <p className="font-medium">{product.name}</p>
          {product.price != null && <p className="text-sm">{formatPrice(product.price)}</p>}
        </Card>

        <Card className="p-4">
          <h2 className="text-base font-bold">Size</h2>
          <div className="mt-3"><SizeSelector sizes={sizes} available={availableSizes} value={size} onChange={onSizeChange} /></div>
          {recommendation?.recommendedSize && (
            <p className="mt-3 rounded-lg bg-fog px-3 py-2 text-sm">
              Recommended for you: <strong>{recommendation.recommendedSize}</strong>
              <span className="text-muted"> ({recommendation.confidence}% confidence)</span>
              {size && size !== recommendation.recommendedSize && (
                <button type="button" onClick={() => onSizeChange(recommendation.recommendedSize)} className="ml-2 font-medium text-denim underline underline-offset-2">Use {recommendation.recommendedSize}</button>
              )}
            </p>
          )}
          {!size && <p className="mt-3 text-sm text-muted">Choose a size to continue.</p>}
        </Card>
      </div>

      {provider?.simulated && <SimulatedNotice />}
      {external && <ExternalConsent providerName={provider.name} checked={confirmed} onChange={onConfirm} />}

      <div>
        <Button variant="accent" size="lg" disabled={!ready} onClick={onGenerate}>Generate Try-On</Button>
        {external && !confirmed && <p className="mt-2 text-sm text-muted">Tick the box above to continue.</p>}
      </div>
    </div>
  )
}

import ConsentCheckbox from '../common/ConsentCheckbox'

// Shown only when the try-on provider is an outside AI service. Photos leave VirtualFit, so the
// shopper must agree each time.
export default function ExternalConsent({ providerName, checked, onChange }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <h3 className="font-bold">Your photo will be sent to {providerName}</h3>
      <p className="mt-1 text-sm text-muted">
        To create this preview, VirtualFit sends your front photo and the product picture to {providerName}, an outside AI service.
        {' '}{providerName} handles them under its own terms. VirtualFit does not control what it does with them.
      </p>
      <div className="mt-3">
        <ConsentCheckbox checked={checked} onChange={onChange}>
          I agree to send my photo and the product image to {providerName} for this preview.
        </ConsentCheckbox>
      </div>
    </div>
  )
}

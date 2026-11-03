export default function SizeSelector({ sizes, available, value, onChange }) {
  return (
    <fieldset>
      <legend className="sr-only">Choose a size</legend>
      <div className="flex flex-wrap gap-2">
        {sizes.map((size) => {
          const inStock = available.includes(size)
          return (
            <label key={size} className={inStock ? 'cursor-pointer' : 'cursor-not-allowed'}>
              <input
                type="radio"
                name="size"
                value={size}
                disabled={!inStock}
                checked={value === size}
                onChange={() => onChange(size)}
                className="peer sr-only"
              />
              <span
                className={`flex h-11 min-w-[3.25rem] items-center justify-center rounded-lg border px-3 text-sm font-medium transition-colors peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-denim peer-focus-visible:ring-offset-2 ${
                  inStock ? 'border-line bg-white hover:border-ink/50' : 'border-line bg-fog text-muted line-through'
                }`}
              >
                {size}
                {!inStock && <span className="sr-only"> (out of stock)</span>}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

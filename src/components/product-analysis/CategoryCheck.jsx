import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { clearAnalysis, setCategoryChoice } from '../../redux/slices/productSlice'
import { CATEGORIES, CATEGORY_BY_ID } from '../../data/categories'
import SegmentedControl from '../common/SegmentedControl'
import Button from '../common/Button'
import Card from '../common/Card'

const label = (id) => CATEGORY_BY_ID[id]?.singular ?? id
const CATEGORY_OPTIONS = CATEGORIES.map((c) => ({ value: c.id, label: c.singular }))

function Evidence({ signals }) {
  const top = signals.slice(0, 3)
  if (!top.length) return null
  return (
    <p className="mt-2 text-xs text-muted">
      Matched: {top.map((s) => `"${s.match}" (${s.source === 'category' ? 'category' : s.source === 'url' ? 'link' : 'title'})`).join(', ')}
    </p>
  )
}

function Picker({ initial, onPick, cta }) {
  const [value, setValue] = useState(initial ?? '')
  return (
    <div className="mt-4 space-y-3">
      <SegmentedControl legend="What kind of product is this?" name="category-picker" options={CATEGORY_OPTIONS} value={value} onChange={setValue} />
      <div><Button variant="accent" disabled={!value} onClick={() => onPick(value)}>{cta}</Button></div>
    </div>
  )
}

export default function CategoryCheck({ category, info, onChooseAnother }) {
  const dispatch = useDispatch()
  const [changing, setChanging] = useState(false)
  const detected = info.detectedCategory

  if (category.status === 'mismatch') {
    return (
      <Card role="alert" className="border-danger/40 bg-danger/5 p-5 sm:p-7">
        <h2 className="text-xl font-bold">Your selected category does not match this product.</h2>
        <p className="mt-2">
          You chose <strong>{label(category.selected)}</strong>, but this looks like <strong>{label(category.detected)}</strong>.
        </p>
        <Evidence signals={detected.signals} />
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button variant="accent" onClick={() => dispatch(setCategoryChoice(category.detected))}>Continue with {label(category.detected)}</Button>
          <Button variant="secondary" onClick={onChooseAnother}>Choose another product</Button>
          <button type="button" className="text-sm text-muted underline underline-offset-2" onClick={() => dispatch(setCategoryChoice(category.selected))}>
            Keep {label(category.selected)} anyway
          </button>
        </div>
      </Card>
    )
  }

  if (category.status === 'unsupported') {
    return (
      <Card role="alert" className="border-tape bg-tape-soft/50 p-5 sm:p-7">
        <h2 className="text-xl font-bold">{category.reason ?? 'This kind of product'} cannot be sized yet.</h2>
        <p className="mt-2 text-sm">VirtualFit currently supports tops, bottoms, shoes, and caps or hats.</p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Button variant="secondary" onClick={onChooseAnother}>Choose another product</Button>
        </div>
        {!changing ? (
          <button type="button" className="mt-3 text-sm text-muted underline underline-offset-2" onClick={() => setChanging(true)}>This is wrong, I will pick the category</button>
        ) : (
          <Picker onPick={(c) => dispatch(setCategoryChoice(c))} cta="Use this category" />
        )}
      </Card>
    )
  }

  if (category.status === 'unknown') {
    return (
      <Card role="alert" className="p-5 sm:p-7">
        <h2 className="text-xl font-bold">We could not tell what kind of product this is.</h2>
        <p className="mt-1 text-sm text-muted">Tell us, so we use the right measurements.</p>
        <Picker initial={category.suggestion} onPick={(c) => dispatch(setCategoryChoice(c))} cta="Continue" />
      </Card>
    )
  }

  // confirmed
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p>
          <span className="text-sm text-muted">Category: </span>
          <strong>{label(category.category)}</strong>
          {category.verified && <span className="ml-2 text-sm text-ok">Matches the product</span>}
          {category.verified === false && <span className="ml-2 text-sm text-muted">We could not verify this automatically</span>}
        </p>
        <button type="button" className="text-sm font-medium text-denim underline underline-offset-2" onClick={() => setChanging((v) => !v)} aria-expanded={changing}>
          Not right? Change
        </button>
      </div>
      {changing && <Picker initial={category.category} onPick={(c) => { dispatch(setCategoryChoice(c)); setChanging(false) }} cta="Use this category" />}
    </Card>
  )
}

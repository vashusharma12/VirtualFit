import { Link } from 'react-router-dom'
import ProductImage from '../product/ProductImage'
import Badge from '../common/Badge'

export default function ResultThumb({ job }) {
  return (
    <Link to={`/results?job=${job.id}`} className="group block">
      <div className="aspect-[24/25] overflow-hidden rounded-xl border border-line bg-fog transition-shadow group-hover:shadow-md">
        <ProductImage src={job.imageUrl} alt={`Try-on of ${job.product.name}, size ${job.size}`} className="!object-contain" />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge tone="accent">Size {job.size}</Badge>
        {job.saved && <Badge tone="success">Saved</Badge>}
      </div>
      <p className="mt-1 text-sm font-medium leading-snug">{job.product.name}</p>
      <p className="text-xs text-muted">{new Date(job.createdAt).toLocaleDateString()}</p>
    </Link>
  )
}

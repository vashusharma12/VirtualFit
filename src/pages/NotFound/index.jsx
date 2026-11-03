import EmptyState from '../../components/common/EmptyState'
import Button from '../../components/common/Button'

export default function NotFound() {
  return (
    <EmptyState
      headingLevel={1}
      title="Page not found"
      description="That page does not exist, or the link is out of date."
      action={<div className="flex flex-wrap justify-center gap-3"><Button to="/" variant="accent">Go home</Button><Button to="/products" variant="secondary">Browse products</Button></div>}
    />
  )
}

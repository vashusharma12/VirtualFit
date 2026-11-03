// `headingLevel` is 1 only when this IS the whole page (for example a 404); otherwise it sits under the page's h1.
export default function EmptyState({ title, description, action, badge, headingLevel = 2 }) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2'
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
      {badge}
      <Heading className="mt-3 text-2xl font-bold">{title}</Heading>
      {description && <p className="mt-2 text-muted">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

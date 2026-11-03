import Button from './Button'

export default function ErrorState({ title = 'Something went wrong', message, onRetry, headingLevel = 2 }) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2'
  return (
    <div role="alert" className="mx-auto max-w-md rounded-2xl border border-danger/30 bg-danger/5 p-6 text-center">
      <Heading className="text-lg font-bold text-danger">{title}</Heading>
      {message && <p className="mt-2 text-sm text-ink/80">{message}</p>}
      {onRetry && (
        <Button className="mt-4" variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

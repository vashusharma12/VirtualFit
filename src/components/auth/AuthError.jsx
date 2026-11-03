export default function AuthError({ message }) {
  if (!message) return null
  return (
    <div role="alert" className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2.5 text-sm text-danger">
      {message}
    </div>
  )
}

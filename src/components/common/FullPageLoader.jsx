import Spinner from './Spinner'

export default function FullPageLoader({ label = 'Loading…' }) {
  return (
    <div className="grid min-h-screen place-items-center bg-fog">
      <div className="flex flex-col items-center gap-3 text-muted">
        <Spinner size={28} label={label} />
        <p className="text-sm">{label}</p>
      </div>
    </div>
  )
}

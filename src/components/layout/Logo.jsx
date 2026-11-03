import { Link } from 'react-router-dom'

export default function Logo({ light = false }) {
  return (
    <Link to="/" className="flex items-center gap-2" aria-label="VirtualFit home">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink">
        <svg width="20" height="20" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <path d="M7 21h18M10 21v-3m4 3v-5m4 5v-3m4 3v-5" stroke="#F5C518" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </span>
      <span className={`font-display text-xl font-bold ${light ? 'text-white' : 'text-ink'}`}>VirtualFit</span>
    </Link>
  )
}

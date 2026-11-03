import { Link } from 'react-router-dom'
import Logo from './Logo'

export default function Footer() {
  return (
    <footer className="bg-ink text-white/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div>
          <Logo light />
          <p className="mt-2 text-sm">Know your size. See your fit.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link to="/how-it-works" className="hover:text-white">How it works</Link>
          <Link to="/about" className="hover:text-white">About</Link>
          <Link to="/settings" className="hover:text-white">Privacy and data</Link>
        </nav>
      </div>
      <p className="border-t border-white/10 px-4 py-4 text-center text-xs sm:px-6">
        VirtualFit is a prototype. Size advice is an estimate, not a guarantee.
      </p>
    </footer>
  )
}

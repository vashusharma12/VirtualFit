import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { logoutUser } from '../../redux/slices/authSlice'
import Button from '../common/Button'
import Logo from './Logo'
import UserMenu, { ACCOUNT_LINKS } from './UserMenu'

// "Try on" is for everyone: logged out, it takes you to log in first and then back to it.
const tryOnLink = { to: '/try-on', label: 'Try on' }
const publicLinks = [tryOnLink, { to: '/how-it-works', label: 'How it works' }, { to: '/about', label: 'About' }]
const authedLinks = [{ to: '/size-guide', label: 'Find my size' }, tryOnLink, { to: '/dashboard', label: 'Dashboard' }, { to: '/how-it-works', label: 'How it works' }, { to: '/about', label: 'About' }]

const linkCls = ({ isActive }) =>
  `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-ink/5 text-ink' : 'text-muted hover:text-ink'
  }`

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const { isAuthenticated } = useSelector((s) => s.auth)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  useEffect(() => setOpen(false), [pathname])

  const links = isAuthenticated ? authedLinks : publicLinks

  const handleLogout = () => {
    dispatch(logoutUser()).then(() => navigate('/'))
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={linkCls}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {isAuthenticated ? (
            <UserMenu />
          ) : (
            <>
              <Button to="/login" variant="ghost" size="sm">Log in</Button>
              <Button to="/signup" variant="accent" size="sm">Create profile</Button>
            </>
          )}
        </div>

        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-lg border border-line md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((o) => !o)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {open && (
        <nav id="mobile-menu" aria-label="Mobile" className="border-t border-line bg-white px-4 pb-4 pt-2 md:hidden">
          <ul className="flex flex-col gap-1">
            {links.map((l) => (
              <li key={l.to}>
                <NavLink to={l.to} className={(p) => `block ${linkCls(p)} py-3`}>
                  {l.label}
                </NavLink>
              </li>
            ))}
          </ul>
          {isAuthenticated && (
            <>
              <p className="mt-3 px-3 text-xs font-medium uppercase tracking-wide text-muted">Account</p>
              <ul className="mt-1 flex flex-col gap-1">
                {ACCOUNT_LINKS.filter((l) => l.to !== '/dashboard').map((l) => (
                  <li key={l.to}><NavLink to={l.to} className={(p) => `block ${linkCls(p)} py-3`}>{l.label}</NavLink></li>
                ))}
              </ul>
            </>
          )}
          <div className="mt-3 flex flex-col gap-2">
            {isAuthenticated ? (
              <Button variant="secondary" onClick={handleLogout}>Log out</Button>
            ) : (
              <>
                <Button to="/login" variant="secondary">Log in</Button>
                <Button to="/signup" variant="accent">Create profile</Button>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  )
}

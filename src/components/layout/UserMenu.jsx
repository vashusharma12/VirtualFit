import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { logoutUser } from '../../redux/slices/authSlice'

export const ACCOUNT_LINKS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/profile', label: 'Profile' },
  { to: '/measurements', label: 'Measurements' },
  { to: '/body-profile', label: 'Body profile' },
  { to: '/results', label: 'Results' },
  { to: '/settings', label: 'Settings' },
]

// The dropdown under the user's name. It follows the standard menu pattern: Up/Down/Home/End move between
// items, Escape closes it and returns to the button, and clicking elsewhere or changing page closes it.
export default function UserMenu() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const user = useSelector((s) => s.auth.user)
  const [open, setOpen] = useState(false)
  const root = useRef(null)
  const button = useRef(null)
  const items = useRef([])

  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    if (!open) return undefined
    items.current[0]?.focus()
    const outside = (e) => { if (!root.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', outside)
    return () => document.removeEventListener('mousedown', outside)
  }, [open])

  const onKeyDown = (e) => {
    const list = items.current.filter(Boolean)
    const i = list.indexOf(document.activeElement)
    if (e.key === 'Escape') { setOpen(false); button.current?.focus() }
    else if (e.key === 'ArrowDown') { e.preventDefault(); list[(i + 1) % list.length]?.focus() }
    else if (e.key === 'ArrowUp') { e.preventDefault(); list[(i - 1 + list.length) % list.length]?.focus() }
    else if (e.key === 'Home') { e.preventDefault(); list[0]?.focus() }
    else if (e.key === 'End') { e.preventDefault(); list[list.length - 1]?.focus() }
    else if (e.key === 'Tab') setOpen(false)
  }

  const logout = () => {
    setOpen(false)
    dispatch(logoutUser()).then(() => navigate('/'))
  }
  const itemCls = 'block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-ink/5 focus:bg-ink/5'

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="user-menu"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => { if (e.key === 'ArrowDown' && !open) { e.preventDefault(); setOpen(true) } }}
        className="flex h-10 max-w-[12rem] items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-medium hover:bg-fog"
      >
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-tape text-xs font-bold" aria-hidden="true">{(user?.name ?? '?').trim().charAt(0).toUpperCase()}</span>
        <span className="truncate">{user?.name}</span>
        <span className="sr-only"> (account menu)</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6" /></svg>
      </button>

      {open && (
        <ul id="user-menu" role="menu" aria-label="Account" onKeyDown={onKeyDown} className="absolute right-0 top-12 z-50 w-56 rounded-xl border border-line bg-white p-1.5 shadow-lg">
          {ACCOUNT_LINKS.map((l, i) => (
            <li key={l.to} role="none">
              <Link ref={(el) => { items.current[i] = el }} to={l.to} role="menuitem" tabIndex={-1} className={itemCls}>{l.label}</Link>
            </li>
          ))}
          <li role="separator" className="my-1 h-px bg-line" />
          <li role="none">
            <button ref={(el) => { items.current[ACCOUNT_LINKS.length] = el }} type="button" role="menuitem" tabIndex={-1} onClick={logout} className={itemCls}>Log out</button>
          </li>
        </ul>
      )}
    </div>
  )
}

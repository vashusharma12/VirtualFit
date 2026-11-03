import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import AuthNotice from './AuthNotice'

const TITLES = {
  '/': 'VirtualFit | Know your size. See your fit.',
  '/how-it-works': 'How it works', '/about': 'About',
  '/login': 'Log in', '/signup': 'Create your profile', '/dashboard': 'Dashboard', '/profile': 'Your profile',
  '/measurements': 'Your measurements', '/body-profile': 'Body profile', '/products': 'Products', '/try-on': 'Virtual try-on',
  '/size-guide': 'Find your size', '/results': 'Your results', '/settings': 'Settings',
}

export default function PageShell() {
  const { pathname } = useLocation()
  const main = useRef(null)
  const first = useRef(true)

  // On every page change: set the tab title, scroll to the top, and move focus to the page content so
  // keyboard and screen-reader users start at the top of the new page instead of where they were.
  useEffect(() => {
    const title = TITLES[pathname] ?? (pathname.startsWith('/products/') ? 'Product' : 'Page not found')
    document.title = pathname === '/' ? title : `${title} | VirtualFit`
    window.scrollTo(0, 0)
    if (first.current) first.current = false
    else main.current?.focus({ preventScroll: true })
  }, [pathname])

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <Navbar />
      <AuthNotice />
      <main id="main" ref={main} tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

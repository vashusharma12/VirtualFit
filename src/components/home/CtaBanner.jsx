import { useAuth } from '../../hooks/useAuth'
import Button from '../common/Button'

export default function CtaBanner() {
  const { isAuthenticated } = useAuth()
  return (
    <section className="px-4 pb-16 sm:px-6 sm:pb-24">
      <div className="mx-auto max-w-6xl rounded-3xl bg-tape px-6 py-12 text-center sm:py-16">
        <h2 className="text-3xl font-bold sm:text-4xl">Stop guessing your size</h2>
        <p className="mx-auto mt-3 max-w-lg text-ink/80">Paste a link, add your measurements once, and use them on every product you consider.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button to={isAuthenticated ? '/size-guide' : '/'} size="lg">Check a product link</Button>
          {!isAuthenticated && <Button to="/signup" variant="secondary" size="lg">Create Your Fit Profile</Button>}
        </div>
      </div>
    </section>
  )
}

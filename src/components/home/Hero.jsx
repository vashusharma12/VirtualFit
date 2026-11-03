import { useAuth } from '../../hooks/useAuth'
import Button from '../common/Button'
import FitDemo from './FitDemo'

export default function Hero() {
  const { isAuthenticated } = useAuth()
  return (
    <section className="border-b border-line bg-white">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <div>
          <p className="font-display text-lg font-medium text-denim">Know your size. See your fit.</p>
          <h1 className="mt-3 text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl">
            Find Your Perfect Fit Before You Buy
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted">
            VirtualFit combines your personal measurements, a product's size information, and virtual
            try-on technology, so you can make a better purchasing decision.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button to={isAuthenticated ? '/measurements' : '/signup'} variant="accent" size="lg">
              Create Your Fit Profile
            </Button>
            <Button to="/products" variant="secondary" size="lg">
              Try a Product
            </Button>
          </div>
        </div>
        <FitDemo />
      </div>
    </section>
  )
}

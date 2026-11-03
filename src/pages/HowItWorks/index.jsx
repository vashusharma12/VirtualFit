import { Link } from 'react-router-dom'
import FitDemo from '../../components/home/FitDemo'
import HowItWorks from '../../components/home/HowItWorks'
import CategoryGrid from '../../components/home/CategoryGrid'
import RecommendationPreview from '../../components/home/RecommendationPreview'
import TryOnPreview from '../../components/home/TryOnPreview'
import CtaBanner from '../../components/home/CtaBanner'
import Card from '../../components/common/Card'

export default function HowItWorksPage() {
  return (
    <>
      <section className="border-b border-line bg-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <div>
            <h1 className="text-4xl font-bold leading-[1.05] sm:text-5xl">How VirtualFit works</h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              Every store sizes differently, so a medium in one shop is not a medium in another. VirtualFit compares your own measurements with each product's own size chart, so you buy the size that fits.
            </p>
          </div>
          <div>
            <h2 className="mb-3 text-xl font-bold">Try the idea in ten seconds</h2>
            <FitDemo />
          </div>
        </div>
      </section>
      <HowItWorks />
      <CategoryGrid />
      <RecommendationPreview />
      <TryOnPreview />
      <section className="mx-auto max-w-3xl px-4 pb-4 pt-14 sm:px-6">
        <Card className="p-6 text-center">
          <h2 className="text-xl font-bold">Want to look around without a link?</h2>
          <p className="mt-2 text-muted">There is a small catalog of demo products with made-up brands, so you can see the size recommendation and try-on screens.</p>
          <Link to="/products" className="mt-3 inline-block font-medium text-denim underline underline-offset-2">Browse the demo products</Link>
        </Card>
      </section>
      <CtaBanner />
    </>
  )
}

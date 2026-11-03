import OnboardingProgress from '../../components/layout/OnboardingProgress'
import MeasurementForm from '../../components/measurements/MeasurementForm'

export default function Measurements() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <OnboardingProgress current={1} />
      <h1 className="mt-8 text-3xl font-bold sm:text-4xl">Your measurements</h1>
      <p className="mt-2 text-muted">
        Use a soft tape measure over thin clothing. Close enough is fine: a few millimetres will not change your size.
      </p>
      <div className="mt-6"><MeasurementForm /></div>
    </div>
  )
}

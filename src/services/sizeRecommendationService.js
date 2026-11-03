import { recommendSize } from '../utils/sizeEngine'
import { delay } from './apiClient'

// The app calls this, never the engine directly. Today it runs the rule-based engine in the browser.
// To use a backend or ML model later, replace the body with an apiClient call that returns the same
// shape: { status, recommendedSize, confidence, explanation, comparison, reasons, meta }.
export async function getSizeRecommendation({ userMeasurements, productSizeChart, category, options }) {
  await delay(250)
  return recommendSize(userMeasurements, productSizeChart, category, options)
}

export { recommendSize }

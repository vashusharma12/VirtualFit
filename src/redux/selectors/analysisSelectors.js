import { createSelector } from '@reduxjs/toolkit'
import { resolveCategory, chartCoversCategory } from '../../utils/calculations'
import { genericChartFor } from '../../data/sizeCharts'

const selectAnalysis = (s) => s.products.analysis
const selectGenderPref = (s) => s.profile.genderPreference

// Everything the size guide needs: the product, the confirmed category, and the chart to use.
export const selectResolvedAnalysis = createSelector([selectAnalysis, selectGenderPref], (analysis, genderPref) => {
  const result = analysis.result
  if (!result) return null
  const { product, analysis: info } = result
  const category = resolveCategory({ detected: info.detectedCategory, selected: analysis.selectedCategory, choice: analysis.categoryChoice })

  let chart = null
  let chartSource = 'none'
  if (category.category) {
    if (analysis.chartOverride) {
      // The shopper's own choice (standard sizing, a chart they entered or confirmed, or a unit correction).
      chart = analysis.chartOverride.chart
      chartSource = analysis.chartOverride.source
    } else if (chartCoversCategory(product.sizeChart, category.category)) {
      chart = product.sizeChart
      chartSource = product.chartSource === 'demo' ? 'demo' : product.chartSource === 'none' ? 'page' : product.chartSource
    }
  }
  const gender = ['men', 'women'].includes(product.gender) ? product.gender : ['men', 'women'].includes(genderPref) ? genderPref : 'men'
  const genericChart = category.category ? genericChartFor(category.category, gender) : null

  return { product, info, category, chart, chartSource, genericChart, genericGender: gender }
})

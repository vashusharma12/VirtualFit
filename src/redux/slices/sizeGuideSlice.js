import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { loadUserData } from '../thunks/userData'
import { getSizeRecommendation } from '../../services/sizeRecommendationService'
import { selectResolvedAnalysis } from '../selectors/analysisSelectors'

const MAX_HISTORY = 50

const initialState = {
  current: { status: 'idle', result: null, error: null, forProductId: null, requestId: null }, // idle | loading | succeeded | failed
  selectedSize: null,
  history: [],
}

// Matches the chosen product's chart against the shopper's measurements and fit preference.
export const computeRecommendation = createAsyncThunk('sizeGuide/compute', async (_, { getState, rejectWithValue }) => {
  const state = getState()
  const resolved = selectResolvedAnalysis(state)
  if (!resolved?.category.category || !resolved.chart) return rejectWithValue('A size chart is needed first.')
  const { product, category, chart, chartSource } = resolved
  try {
    const result = await getSizeRecommendation({
      userMeasurements: state.measurements,
      productSizeChart: chart,
      category: category.category,
      options: {
        fitPreference: state.profile.preferences?.fitPreference ?? 'regular',
        availableSizes: product.availableSizes?.length ? product.availableSizes : null,
        productFit: product.fit ?? '',
        unit: state.measurements.displayUnits.length,
        source: chartSource,
      },
    })
    return { result, productId: product.id }
  } catch (err) {
    return rejectWithValue(err.message)
  }
})

const sizeGuideSlice = createSlice({
  name: 'sizeGuide',
  initialState,
  reducers: {
    setSelectedSize(state, action) {
      state.selectedSize = action.payload
    },
    // One saved recommendation per product: saving again replaces the earlier one.
    saveRecommendation(state, action) {
      state.history = [action.payload, ...state.history.filter((h) => h.product.id !== action.payload.product.id)].slice(0, MAX_HISTORY)
    },
    removeRecommendation(state, action) {
      state.history = state.history.filter((h) => h.id !== action.payload)
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(computeRecommendation.pending, (state, action) => {
        state.current.status = 'loading'
        state.current.error = null
        state.current.requestId = action.meta.requestId // the previous result stays visible meanwhile
      })
      .addCase(computeRecommendation.fulfilled, (state, action) => {
        if (state.current.requestId !== action.meta.requestId) return // a newer request is in flight
        state.current = { status: 'succeeded', result: action.payload.result, error: null, forProductId: action.payload.productId, requestId: action.meta.requestId }
      })
      .addCase(computeRecommendation.rejected, (state, action) => {
        if (state.current.requestId !== action.meta.requestId) return
        state.current = { status: 'failed', result: null, error: action.payload || 'Could not calculate your size.', forProductId: null, requestId: action.meta.requestId }
      })
      .addCase(loadUserData.fulfilled, (state, action) => {
        state.history = action.payload.data?.sizeHistory ?? []
      })
  },
})

export const { setSelectedSize, saveRecommendation, removeRecommendation } = sizeGuideSlice.actions
export default sizeGuideSlice.reducer

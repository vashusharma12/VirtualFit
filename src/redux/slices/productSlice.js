import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { productService } from '../../services/productService'
import { productAnalysisService } from '../../services/productAnalysisService'

export const DEFAULT_FILTERS = {
  search: '',
  category: 'all',
  brands: [],
  priceRange: [0, null], // [min, max]; null max means no upper limit
  sort: 'featured',
}

const initialAnalysis = {
  status: 'idle', // idle | analyzing | succeeded | failed
  result: null, // { product, analysis }
  error: null, // { code, message }
  url: '', // the link that was analyzed
  selectedCategory: null, // what the shopper said they are buying (may be wrong)
  categoryChoice: null, // the category the shopper finally confirmed
  chartOverride: null, // { chart, source: 'generic' | 'manual' } when the page had no usable chart
}

const initialState = {
  products: [],
  selectedProduct: null,
  filters: DEFAULT_FILTERS,
  status: 'idle', // idle | loading | succeeded | failed
  error: null,
  detailStatus: 'idle',
  detailError: null,
  analysis: initialAnalysis,
}

export const fetchProducts = createAsyncThunk(
  'products/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      return await productService.list()
    } catch (err) {
      return rejectWithValue(err.message)
    }
  },
  { condition: (_, { getState }) => getState().products.status !== 'loading' },
)

export const fetchProductById = createAsyncThunk('products/fetchOne', async (id, { rejectWithValue }) => {
  try {
    return await productService.getById(id)
  } catch (err) {
    return rejectWithValue({ message: err.message, notFound: err.status === 404 })
  }
})

export const analyzeProductUrl = createAsyncThunk('products/analyze', async ({ url }, { rejectWithValue }) => {
  try {
    return await productAnalysisService.analyze({ url: url.trim() })
  } catch (err) {
    return rejectWithValue({ code: err.code ?? 'fetch_failed', message: err.message })
  }
})

// Lets a demo-catalog product flow through the same size-guide steps as an analyzed link.
export const loadDemoProduct = createAsyncThunk('products/analyzeDemo', async (id, { rejectWithValue }) => {
  try {
    const product = await productService.getById(id)
    return {
      product,
      analysis: {
        detectedCategory: { category: product.category, confidence: 'high', reason: null, signals: [] },
        extractionMethods: ['demo-catalog'], fieldsFound: [], warnings: [], store: 'demo', analyzedAt: new Date().toISOString(),
      },
    }
  } catch (err) {
    return rejectWithValue({ code: 'no_product_data', message: err.message })
  }
})

const productSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    setFilters(state, action) {
      state.filters = { ...state.filters, ...action.payload }
    },
    resetFilters(state) {
      state.filters = DEFAULT_FILTERS
    },
    setCategoryChoice(state, action) {
      state.analysis.categoryChoice = action.payload
      state.analysis.chartOverride = null
    },
    setChartOverride(state, action) {
      state.analysis.chartOverride = action.payload
    },
    clearAnalysis(state) {
      state.analysis = initialAnalysis
    },
    // Last resort when a page cannot be read: the shopper names the category and supplies the chart.
    startManualProduct(state, action) {
      const { category, url } = action.payload
      state.analysis = {
        ...initialAnalysis,
        status: 'succeeded',
        selectedCategory: category,
        categoryChoice: category,
        result: {
          product: {
            id: 'manual', source: 'manual', sourceSite: url ? safeHost(url) : 'manual', productUrl: url || null, name: 'Product entered manually',
            brand: '', category, gender: null, price: null, image: null, images: [], allSizes: [], availableSizes: [], sizeChart: null, chartSource: 'none', colors: [],
          },
          analysis: { detectedCategory: { category, confidence: 'high', reason: null, signals: [] }, extractionMethods: ['manual'], fieldsFound: [], warnings: [], store: 'manual', analyzedAt: new Date().toISOString() },
        },
      }
    },
  },
  extraReducers: (builder) => {
    const analyzing = (state, action) => {
      state.analysis = { ...initialAnalysis, status: 'analyzing', url: action.meta.arg?.url ?? '', selectedCategory: action.meta.arg?.selectedCategory ?? null }
    }
    const analyzed = (state, action) => {
      state.analysis.status = 'succeeded'
      state.analysis.result = action.payload
    }
    const analysisFailed = (state, action) => {
      state.analysis.status = 'failed'
      state.analysis.error = action.payload ?? { code: 'fetch_failed', message: 'Something went wrong. Please try again.' }
    }
    builder
      .addCase(analyzeProductUrl.pending, analyzing)
      .addCase(analyzeProductUrl.fulfilled, analyzed)
      .addCase(analyzeProductUrl.rejected, analysisFailed)
      .addCase(loadDemoProduct.pending, analyzing)
      .addCase(loadDemoProduct.fulfilled, (state, action) => { analyzed(state, action); state.analysis.categoryChoice = action.payload.product.category })
      .addCase(loadDemoProduct.rejected, analysisFailed)
      .addCase(fetchProducts.pending, (s) => { s.status = 'loading'; s.error = null })
      .addCase(fetchProducts.fulfilled, (s, a) => { s.status = 'succeeded'; s.products = a.payload })
      .addCase(fetchProducts.rejected, (s, a) => { s.status = 'failed'; s.error = a.payload || 'Could not load products.' })
      .addCase(fetchProductById.pending, (s) => { s.detailStatus = 'loading'; s.detailError = null; s.selectedProduct = null })
      .addCase(fetchProductById.fulfilled, (s, a) => { s.detailStatus = 'succeeded'; s.selectedProduct = a.payload })
      .addCase(fetchProductById.rejected, (s, a) => {
        s.detailStatus = a.payload?.notFound ? 'notFound' : 'failed'
        s.detailError = a.payload?.message || 'Could not load this product.'
      })
  },
})

function safeHost(url) {
  try {
    return new URL(/^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, '')
  } catch {
    return 'manual'
  }
}

export const { setFilters, resetFilters, setCategoryChoice, setChartOverride, clearAnalysis, startManualProduct } = productSlice.actions
export default productSlice.reducer

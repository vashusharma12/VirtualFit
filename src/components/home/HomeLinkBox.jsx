import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { analyzeProductUrl } from '../../redux/slices/productSlice'
import { savePendingLink } from '../../utils/pendingLink'
import ProductUrlInput from '../product-analysis/ProductUrlInput'

// The heart of the site. Logged in: start reading the product and show the result. Not logged in: remember
// the link, ask them to sign up, and bring them straight back to it.
export default function HomeLinkBox() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  const analyze = ({ url, category }) => {
    if (isAuthenticated) {
      dispatch(analyzeProductUrl({ url, selectedCategory: category }))
      navigate('/size-guide')
    } else {
      savePendingLink({ url, category })
      navigate('/signup')
    }
  }
  return <ProductUrlInput variant="hero" ctaLabel="Find my size" onAnalyze={analyze} />
}

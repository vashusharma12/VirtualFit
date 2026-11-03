import { useDispatch, useSelector } from 'react-redux'
import { Link, useLocation } from 'react-router-dom'
import { toggleSavedProduct } from '../../redux/slices/profileSlice'

export default function SaveProductButton({ productId, productName, className = '' }) {
  const dispatch = useDispatch()
  const location = useLocation()
  const isAuthenticated = useSelector((s) => s.auth.isAuthenticated)
  const saved = useSelector((s) => s.profile.savedProductIds.includes(productId))
  const cls = `grid h-9 w-9 place-items-center rounded-full bg-white/95 shadow-sm transition-colors hover:bg-white ${className}`
  const icon = (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill={saved ? '#c0392b' : 'none'} stroke={saved ? '#c0392b' : 'currentColor'} strokeWidth="2" strokeLinejoin="round">
      <path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z" />
    </svg>
  )

  if (!isAuthenticated) {
    return (
      <Link to="/login" state={{ from: location.pathname + location.search }} className={cls} aria-label={`Log in to save ${productName}`}>
        {icon}
      </Link>
    )
  }
  return (
    <button type="button" className={cls} aria-pressed={saved} aria-label={saved ? `Remove ${productName} from saved` : `Save ${productName}`} onClick={() => dispatch(toggleSavedProduct(productId))}>
      {icon}
    </button>
  )
}

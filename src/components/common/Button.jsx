import { Link } from 'react-router-dom'
import Spinner from './Spinner'

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50'

const variants = {
  primary: 'bg-ink text-white hover:bg-black',
  accent: 'bg-tape text-ink hover:brightness-95',
  secondary: 'border border-line bg-white text-ink hover:bg-fog',
  ghost: 'text-ink hover:bg-ink/5',
  danger: 'bg-danger text-white hover:brightness-95',
}

const sizes = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-base',
}

export default function Button({
  to,
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  children,
  type = 'button',
  disabled,
  ...rest
}) {
  const cls = `${base} ${variants[variant]} ${sizes[size]} ${className}`
  if (to) {
    return (
      <Link to={to} className={cls} {...rest}>
        {children}
      </Link>
    )
  }
  return (
    <button type={type} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading && <Spinner size={16} />}
      {children}
    </button>
  )
}

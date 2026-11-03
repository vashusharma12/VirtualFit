const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
export const formatPrice = (value) => inr.format(value)
export const formatCount = (n) => new Intl.NumberFormat('en-IN').format(n)

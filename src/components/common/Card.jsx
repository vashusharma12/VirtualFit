export default function Card({ as: Tag = 'div', className = '', children, ...rest }) {
  return (
    <Tag className={`rounded-2xl border border-line bg-white p-6 ${className}`} {...rest}>
      {children}
    </Tag>
  )
}

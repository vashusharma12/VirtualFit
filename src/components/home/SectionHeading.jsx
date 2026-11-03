export default function SectionHeading({ title, children, className = '' }) {
  return (
    <div className={`max-w-2xl ${className}`}>
      <h2 className="text-3xl font-bold sm:text-4xl">{title}</h2>
      {children && <p className="mt-3 text-lg text-muted">{children}</p>}
    </div>
  )
}

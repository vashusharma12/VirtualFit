import Card from '../common/Card'

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="mx-auto grid max-w-md px-4 py-12 sm:py-16">
      <Card className="p-6 sm:p-8">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-1.5 text-sm text-muted">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </Card>
      <p className="mt-5 text-center text-sm text-muted">{footer}</p>
    </div>
  )
}

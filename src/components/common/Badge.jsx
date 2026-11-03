const tones = {
  neutral: 'bg-ink/5 text-ink',
  accent: 'bg-tape-soft text-ink',
  success: 'bg-ok/10 text-ok',
  danger: 'bg-danger/10 text-danger',
}

export default function Badge({ tone = 'neutral', children }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  )
}

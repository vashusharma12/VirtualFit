// A simple pose guide for each angle. Side views are narrower; the arrow shows which way you face.
export default function PoseSilhouette({ angle }) {
  const side = angle === 'left' || angle === 'right'
  const arrow = angle === 'left' ? 'M44 62h-14m5-5-5 5 5 5' : angle === 'right' ? 'M16 62h14m-5-5 5 5-5 5' : null
  return (
    <svg viewBox="0 0 60 100" className="h-full w-full text-ink/20" fill="currentColor" aria-hidden="true">
      <circle cx="30" cy="14" r="9" />
      {side ? (
        <path d="M22 28c0-3 4-4 8-4s8 1 8 4l2 32h-5l-1 34H24l-1-34h-5z" />
      ) : (
        <path d="M12 32c0-5 7-8 18-8s18 3 18 8l2 30h-8l-1 32H19l-1-32h-8z" />
      )}
      {arrow && <path d={arrow} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-denim" />}
    </svg>
  )
}

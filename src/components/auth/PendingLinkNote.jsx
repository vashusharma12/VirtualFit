import { getPendingLink, pendingHost } from '../../utils/pendingLink'

// Shown on the sign-up and log-in pages when the visitor arrived by pasting a link on the home page.
export default function PendingLinkNote({ action = 'Create your profile' }) {
  const link = getPendingLink()
  if (!link) return null
  return (
    <p role="status" className="mb-5 rounded-xl bg-tape-soft px-4 py-3 text-sm">
      <strong>{action} to see your size for {pendingHost(link)}.</strong> We have saved your link and will show the result as soon as you are in.
    </p>
  )
}

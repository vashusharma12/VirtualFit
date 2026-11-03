import { storage } from './storage'

// A product link pasted on the home page by someone who is not logged in yet. It is kept briefly so that
// after they sign up or log in they land on their result instead of having to paste it again.
const KEY = 'pendingLink'
const MAX_AGE_MS = 24 * 60 * 60 * 1000

export const savePendingLink = ({ url, category = null }) => storage.set(KEY, { url, category, savedAt: Date.now() })
export const clearPendingLink = () => storage.remove(KEY)

export function getPendingLink() {
  const v = storage.get(KEY)
  if (!v?.url || Date.now() - (v.savedAt ?? 0) > MAX_AGE_MS) {
    if (v) storage.remove(KEY)
    return null
  }
  return v
}

// Only the store's name is shown back to the user, never the whole link (links can carry private tokens).
export function pendingHost(link) {
  try {
    return new URL(/^[a-z][a-z0-9+.-]*:/i.test(link.url) ? link.url : `https://${link.url}`).hostname.replace(/^www\./, '')
  } catch {
    return 'that store'
  }
}

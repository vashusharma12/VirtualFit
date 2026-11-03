import { useSelector } from 'react-redux'

export function useAuth() {
  return useSelector((s) => s.auth)
}

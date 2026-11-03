import { OAuth2Client } from 'google-auth-library'

// Verifies a Google "ID token" (what the Sign in with Google button hands the browser). Google signs the
// token; this checks the signature, that it was issued for THIS app (audience), and that it has not expired.
// Returns null when no GOOGLE_CLIENT_ID is configured, which turns Google sign-in off.
export function createGoogleVerifier(clientId) {
  if (!clientId) return null
  const client = new OAuth2Client(clientId)
  return async function verifyGoogleToken(credential) {
    const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId })
    const p = ticket.getPayload()
    return {
      sub: p.sub,
      email: String(p.email ?? '').toLowerCase(),
      emailVerified: p.email_verified === true,
      name: p.name ?? '',
    }
  }
}

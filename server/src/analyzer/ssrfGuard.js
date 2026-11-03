import net from 'node:net'
import dns from 'node:dns'
import { AnalyzeError } from './errors.js'

// The analyzer fetches URLs chosen by users, so it must never be steerable at internal services
// (localhost, private networks, cloud metadata). Every URL, every redirect hop, and every DNS
// answer is checked.
const blocked = new net.BlockList()
;[
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
  ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['224.0.0.0', 4], ['240.0.0.0', 4],
].forEach(([ip, bits]) => blocked.addSubnet(ip, bits, 'ipv4'))
blocked.addAddress('::', 'ipv6')
blocked.addAddress('::1', 'ipv6')
blocked.addSubnet('fc00::', 7, 'ipv6') // unique local
blocked.addSubnet('fe80::', 10, 'ipv6') // link local
blocked.addSubnet('ff00::', 8, 'ipv6') // multicast

export function isBlockedAddress(address) {
  const family = net.isIP(address)
  if (!family) return true
  // IPv4-mapped IPv6 (::ffff:127.0.0.1) must be judged by its IPv4 part.
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address)
  if (mapped) return blocked.check(mapped[1], 'ipv4')
  return blocked.check(address, family === 4 ? 'ipv4' : 'ipv6')
}

const ALLOWED_PORTS = new Set(['', '80', '443'])

// Validates the URL itself (scheme, credentials, port, IP literals). Returns a URL object.
export function assertSafeUrl(input, { allowPrivate = false } = {}) {
  let url
  try {
    url = new URL(String(input).trim())
  } catch {
    throw new AnalyzeError('invalid_url', 'That does not look like a valid web address.')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new AnalyzeError('invalid_url', 'Only http and https links can be analyzed.')
  }
  if (url.username || url.password) throw new AnalyzeError('invalid_url', 'Links containing a username or password are not supported.')
  if (!allowPrivate) {
    if (!ALLOWED_PORTS.has(url.port)) throw new AnalyzeError('blocked_host', 'That address cannot be analyzed.')
    const host = url.hostname.replace(/^\[|\]$/g, '')
    if (net.isIP(host) && isBlockedAddress(host)) throw new AnalyzeError('blocked_host', 'That address cannot be analyzed.')
    if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
      throw new AnalyzeError('blocked_host', 'That address cannot be analyzed.')
    }
  }
  return url
}

// Used as the connection's DNS lookup, so the address we actually connect to is the one we checked
// (this closes the "DNS rebinding" gap between checking and connecting).
export function createSafeLookup({ allowPrivate = false } = {}) {
  return (hostname, options, callback) => {
    dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
      if (err) return callback(err)
      if (!allowPrivate && addresses.some((a) => isBlockedAddress(a.address))) {
        return callback(new AnalyzeError('blocked_host', 'That address cannot be analyzed.'))
      }
      if (options?.all) return callback(null, addresses)
      callback(null, addresses[0].address, addresses[0].family)
    })
  }
}

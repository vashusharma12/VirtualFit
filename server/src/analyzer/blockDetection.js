// Recognises bot-protection pages. VirtualFit does not try to get around them.
const PATTERNS = [
  /validateCaptcha|Type the characters you see in this image|Robot Check|api-services-support@amazon/i,
  /<title>\s*(Access Denied|Just a moment\.\.\.|Attention Required|Pardon Our Interruption)/i,
  /cf-browser-verification|cf-chl-|px-captcha|Request unsuccessful\. Incapsula/i,
  /Enable JavaScript and cookies to continue/i,
]
export const looksBlocked = (html) => PATTERNS.some((re) => re.test(html))

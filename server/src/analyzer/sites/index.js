import * as amazon from './amazon.js'
import * as myntra from './myntra.js'
import * as ajio from './ajio.js'
import * as flipkart from './flipkart.js'

const ADAPTERS = [amazon, myntra, ajio, flipkart]
export const adapterFor = (hostname) => ADAPTERS.find((a) => a.matches(hostname.toLowerCase())) ?? null

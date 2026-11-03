import { PRODUCTS } from '../data/products'
import { delay } from './apiClient'

// MOCK product service. Replace the bodies with apiClient calls when a product API exists;
// the function names and return shapes are what the rest of the app depends on.
export const productService = {
  async list() {
    await delay(500)
    return PRODUCTS
  },
  async getById(id) {
    await delay(350)
    const product = PRODUCTS.find((p) => p.id === id)
    if (!product) {
      const err = new Error('We could not find that product.')
      err.status = 404
      throw err
    }
    return product
  },
}

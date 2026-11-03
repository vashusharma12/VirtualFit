import { createSimulatedProvider } from './simulated.js'
import { createReplicateProvider } from './replicate.js'

export function createProvider(config) {
  if (config.tryonProvider === 'replicate') {
    return createReplicateProvider({ token: config.replicateToken, version: config.replicateModelVersion })
  }
  return createSimulatedProvider({ delayMs: config.tryonSimDelayMs })
}

import fs from 'node:fs/promises'
import path from 'node:path'

// File storage adapter. To move to S3 or similar, implement the same three methods
// (put, get, remove) and pass it to createApp: nothing else changes.
export function createLocalStorage(rootDir) {
  const root = path.resolve(rootDir)

  const resolveKey = (key) => {
    const full = path.resolve(root, key)
    if (!full.startsWith(root + path.sep)) throw new Error('Invalid storage key.')
    return full
  }

  return {
    async put(key, buffer) {
      const file = resolveKey(key)
      await fs.mkdir(path.dirname(file), { recursive: true })
      await fs.writeFile(file, buffer, { mode: 0o600 })
    },
    async get(key) {
      try {
        return await fs.readFile(resolveKey(key))
      } catch (err) {
        if (err.code === 'ENOENT') return null
        throw err
      }
    },
    async remove(key) {
      await fs.rm(resolveKey(key), { force: true })
    },
  }
}

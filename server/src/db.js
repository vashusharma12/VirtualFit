import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL, -- '!' means no password (an account that signs in with Google only)
  google_sub    TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- The user's explicit consent to store body photos. A new CONSENT_VERSION requires consent again.
CREATE TABLE IF NOT EXISTS photo_consents (
  user_id    TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  version    TEXT NOT NULL,
  granted_at TEXT NOT NULL
);

-- One photo per angle per user. The image bytes live in file storage, never in the database.
CREATE TABLE IF NOT EXISTS photos (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  angle       TEXT NOT NULL CHECK (angle IN ('front', 'left', 'right', 'back')),
  storage_key TEXT NOT NULL,
  width       INTEGER NOT NULL,
  height      INTEGER NOT NULL,
  bytes       INTEGER NOT NULL,
  updated_at  TEXT NOT NULL,
  UNIQUE (user_id, angle)
);

-- Try-on jobs. Results are temporary (deleted after the retention period) unless the user saves them.
CREATE TABLE IF NOT EXISTS tryon_jobs (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status        TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'succeeded', 'failed', 'cancelled')),
  stage         TEXT NOT NULL DEFAULT '',
  progress      INTEGER NOT NULL DEFAULT 0,
  provider      TEXT NOT NULL,
  category      TEXT NOT NULL,
  size          TEXT NOT NULL,
  angle         TEXT NOT NULL,
  product       TEXT NOT NULL,
  fit           TEXT,
  result_key    TEXT,
  error_code    TEXT,
  error_message TEXT,
  saved         INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tryon_user ON tryon_jobs (user_id, created_at DESC);

-- One JSON document per user: profile, measurements and history. Photos get their own tables later.
CREATE TABLE IF NOT EXISTS user_data (
  user_id    TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data       TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`

export function openDb(dbPath) {
  if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(dbPath), { recursive: true })
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(SCHEMA)
  // Databases made before Google sign-in existed lack the column.
  if (!db.prepare('PRAGMA table_info(users)').all().some((c) => c.name === 'google_sub')) db.exec('ALTER TABLE users ADD COLUMN google_sub TEXT')
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google ON users (google_sub) WHERE google_sub IS NOT NULL')
  return db
}

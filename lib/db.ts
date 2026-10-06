import { Pool } from 'pg';
const globalDb = globalThis as unknown as { labPool?: Pool };
export const db = globalDb.labPool ?? new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
if (process.env.NODE_ENV !== 'production') globalDb.labPool = db;
export async function initSchema() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (id uuid PRIMARY KEY, email text UNIQUE NOT NULL, name text NOT NULL, role text NOT NULL CHECK(role IN ('admin','member')), password_hash text NOT NULL, active boolean NOT NULL DEFAULT true);
    CREATE TABLE IF NOT EXISTS sessions (token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at timestamptz NOT NULL);
    CREATE TABLE IF NOT EXISTS login_attempts (key text PRIMARY KEY, count integer NOT NULL DEFAULT 0, window_start timestamptz NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS devices (id text PRIMARY KEY, code text UNIQUE NOT NULL, data jsonb NOT NULL, revision integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS attachments (id uuid PRIMARY KEY, device_id text REFERENCES devices(id) ON DELETE CASCADE, name text NOT NULL, kind text NOT NULL, visibility text NOT NULL CHECK(visibility IN ('public','internal')), mime text NOT NULL, size integer NOT NULL, storage_key text UNIQUE NOT NULL);
    CREATE TABLE IF NOT EXISTS settings (id integer PRIMARY KEY CHECK(id=1), data jsonb NOT NULL);
    CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
    CREATE INDEX IF NOT EXISTS attachments_device ON attachments(device_id);
  `);
}

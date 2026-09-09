import fs from 'fs';
import path from 'path';
import { createClient } from '@libsql/client';
import Database from 'better-sqlite3';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const idx = line.indexOf('=');
  if (idx > 0) {
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
    env[k] = v;
  }
});

const ddlStatements = [
  `CREATE TABLE IF NOT EXISTS invoice_sequences (
    year         INTEGER PRIMARY KEY,
    lastSequence INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS idempotency_keys (
    key          TEXT PRIMARY KEY,
    scope        TEXT NOT NULL,
    statusCode   INTEGER NOT NULL,
    responseBody TEXT NOT NULL,
    createdAt    INTEGER NOT NULL,
    expiresAt    INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_idempotency_expiry ON idempotency_keys(expiresAt)`,
  `CREATE TRIGGER IF NOT EXISTS trg_prevent_blocked_booking
   BEFORE INSERT ON appointments
   FOR EACH ROW
   WHEN EXISTS (
     SELECT 1 FROM blocked_slots WHERE date = NEW.date AND time = NEW.startTime
   )
   BEGIN
     SELECT RAISE(ABORT, 'slot_blocked');
   END`,
];

async function migrate() {
  console.log('--- Migrating Database for Phase 2 Concurrency & Integrity ---');

  // 1. Local SQLite
  const localDbPath = path.join(process.cwd(), 'data', 'ryma.db');
  if (fs.existsSync(localDbPath)) {
    const db = new Database(localDbPath);
    db.pragma('foreign_keys = ON');
    for (const sql of ddlStatements) {
      try {
        db.exec(sql);
      } catch (err) {
        console.warn('[Local SQLite DDL Warning]:', err.message);
      }
    }
    db.close();
    console.log('✅ Local SQLite schema updated.');
  }

  // 2. Turso Cloud
  if (env.TURSO_DATABASE_URL && env.TURSO_AUTH_TOKEN) {
    const client = createClient({
      url: env.TURSO_DATABASE_URL,
      authToken: env.TURSO_AUTH_TOKEN,
    });
    for (const sql of ddlStatements) {
      try {
        await client.execute(sql);
      } catch (err) {
        console.warn('[Turso DDL Warning]:', err.message);
      }
    }
    console.log('✅ Turso Cloud schema updated.');
  }
}

migrate().catch(console.error);

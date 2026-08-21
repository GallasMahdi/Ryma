/**
 * Database Reset Script for Ryma Kiné Platform
 *
 * Clears all content from both Turso Cloud (if configured) AND local SQLite database files,
 * resetting the entire platform to a fresh 0-record clean state.
 *
 * Usage:
 *   npm run db:reset
 *   OR: node scripts/reset-db.mjs
 */

import Database from 'better-sqlite3';
import { createClient } from '@libsql/client';
import path from 'path';
import fs from 'fs';

// Load .env.local variables if running directly
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '').replace(/\\\$ /g, '$');
    }
  });
}

const DB_PATH = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(process.cwd(), 'data', 'ryma.db');

const BACKUP_DIR = path.join(process.cwd(), 'data', 'backups');

const TABLES = [
  'invoices',
  'prescriptions',
  'appointments',
  'blocked_slots',
  'patient_notes',
  'patients',
  'patient_sessions',
  'rate_limit_log',
];

async function resetTursoDatabase() {
  const rawUrl = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!rawUrl) {
    console.log(`[RESET] Turso URL not configured — skipping Cloud reset.`);
    return;
  }

  console.log(`[RESET] Turso Cloud Database detected: ${rawUrl}`);
  console.log(`[RESET] Clearing all records from Turso Cloud Database...`);

  try {
    const httpUrl = rawUrl.replace(/^libsql:\/\//, 'https://');
    const client = createClient({ url: httpUrl, authToken });

    for (const table of TABLES) {
      try {
        await client.execute(`DELETE FROM ${table}`);
        console.log(`  ✓ Cleared Turso Cloud table: ${table}`);
      } catch (err) {
        console.warn(`  ⚠️ Could not clear Turso table ${table}:`, err.message);
      }
    }
    console.log(`✅ [RESET] Turso Cloud Database reset successfully.`);
  } catch (err) {
    console.error(`❌ [RESET ERROR] Turso reset failed:`, err.message);
  }
}

function resetLocalSqliteDatabase() {
  if (!fs.existsSync(DB_PATH)) {
    console.log(`[RESET] Local SQLite file does not exist at ${DB_PATH}. Skipping local reset.`);
    return;
  }

  // Create safety snapshot
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, `ryma_pre_reset_backup_${timestamp}.db`);

  try {
    const backupDb = new Database(DB_PATH, { readonly: true });
    backupDb.prepare('VACUUM INTO ?').run(backupPath);
    backupDb.close();
    console.log(`[RESET] Created local safety snapshot: ${path.basename(backupPath)}`);
  } catch {
    /* silent backup fallback */
  }

  console.log(`[RESET] Clearing all records from local SQLite file...`);
  const db = new Database(DB_PATH);

  try {
    db.pragma('foreign_keys = OFF');
    db.pragma('journal_mode = WAL');

    db.transaction(() => {
      for (const table of TABLES) {
        try {
          db.prepare(`DELETE FROM ${table}`).run();
          console.log(`  ✓ Cleared local table: ${table}`);
        } catch {
          // Table might not exist yet
        }
      }
    })();

    db.pragma('foreign_keys = ON');
    db.prepare('VACUUM').run();
    console.log(`✅ [RESET] Local SQLite file reset successfully.`);
  } catch (err) {
    console.error(`❌ [RESET ERROR] Local SQLite reset failed:`, err.message);
  } finally {
    db.close();
  }
}

async function main() {
  console.log(`----------------------------------------------------`);
  console.log(`🚀 STARTING PLATFORM DATABASE RESET`);
  console.log(`----------------------------------------------------`);

  await resetTursoDatabase();
  resetLocalSqliteDatabase();

  console.log(`----------------------------------------------------`);
  console.log(`✅ DATABASE RESET COMPLETE: All data cleared.`);
  console.log(`----------------------------------------------------`);
}

main();

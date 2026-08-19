import { createClient } from '@libsql/client';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL || 'libsql://ryma-db-gallasmahdi.aws-eu-west-1.turso.io';
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODY1NDQ3MTIsImlkIjoiMDE5ZmY2NWMtYmMwMS03NDU3LWE3YzQtOTc3MWI0NmJhNzUxIiwia2lkIjoiVnBUMlJaOHFnWTZxZTZXZkYxR0ozZEtkYWxEYjB5Q1RvVlpoZm1kRVlINCIsInJpZCI6IjFiNTk5ZjllLWZlNDMtNDBlOC04OTJjLTczMjk1ZWE0YzQ3MCJ9.CWfJuh-r1IiffbDwJckemsiwSPZNh6ZTMPLifYnv4cDc1R40VgP2q4OAM9kCL1QrDd7hp6MZpmYGsoSPJJGXAg';

console.log('\n🧹 Clearing all data in Turso (Vercel Database)...');

const client = createClient({
  url: TURSO_DATABASE_URL.trim(),
  authToken: TURSO_AUTH_TOKEN.trim(),
});

const tables = [
  'appointments',
  'patient_sessions',
  'patient_notes',
  'patients',
  'blocked_slots',
  'rate_limit_log'
];

try {
  for (const table of tables) {
    try {
      const res = await client.execute(`DELETE FROM ${table}`);
      console.log(`  ✅ Cleared table '${table}' (Rows affected: ${res.rowsAffected})`);
    } catch (err) {
      console.warn(`  ⚠️ Could not clear '${table}':`, err.message);
    }
  }

  console.log('\n✨ Turso database is now completely fresh and empty!\n');
} catch (error) {
  console.error('❌ Error connecting to Turso:', error);
}

// Also clear local SQLite DB if present
const localDbPath = path.join(process.cwd(), 'data', 'ryma.db');
if (fs.existsSync(localDbPath)) {
  console.log('🧹 Clearing local SQLite data at data/ryma.db...');
  try {
    const db = new Database(localDbPath);
    for (const table of tables) {
      try {
        db.prepare(`DELETE FROM ${table}`).run();
        console.log(`  ✅ Cleared local table '${table}'`);
      } catch (err) {
        // ignore missing table
      }
    }
    console.log('✨ Local SQLite is now fresh and empty!\n');
  } catch (err) {
    console.warn('⚠️ Local SQLite clear skipped:', err.message);
  }
}

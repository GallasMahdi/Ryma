/**
 * Enterprise Multi-Engine Database Backup Script
 *
 * Supports:
 *  1. Turso Cloud (LibSQL) online snapshot / table export
 *  2. Local SQLite online non-blocking snapshot using VACUUM INTO
 *
 * Usage: node scripts/backup-db.mjs
 */

import Database from 'better-sqlite3';
import { createClient } from '@libsql/client';
import path from 'path';
import fs from 'fs';

// Load .env.local if present
const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const DB_PATH = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(process.cwd(), 'data', 'ryma.db');

const BACKUP_DIR = path.join(process.cwd(), 'data', 'backups');

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

async function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const isTurso = Boolean(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);

  if (isTurso) {
    console.log(`[BACKUP] Active Turso Cloud detected: ${process.env.TURSO_DATABASE_URL}`);
    try {
      const client = createClient({
        url: process.env.TURSO_DATABASE_URL.replace(/['"]/g, '').trim(),
        authToken: process.env.TURSO_AUTH_TOKEN.replace(/['"]/g, '').trim(),
      });

      const tables = [
        'appointments',
        'patients',
        'patient_sessions',
        'invoices',
        'prescriptions',
        'reviews',
        'security_settings',
        'security_audit_logs',
        'blocked_slots',
        'patient_notes',
      ];

      const dump = {
        exportedAt: new Date().toISOString(),
        engine: 'turso-libsql',
        tables: {},
      };

      for (const table of tables) {
        try {
          const res = await client.execute(`SELECT * FROM ${table}`);
          dump.tables[table] = res.rows;
        } catch {
          dump.tables[table] = [];
        }
      }

      const tursoBackupFile = `ryma_turso_backup_${timestamp}.json`;
      const tursoBackupPath = path.join(BACKUP_DIR, tursoBackupFile);
      fs.writeFileSync(tursoBackupPath, JSON.stringify(dump, null, 2), 'utf8');
      const stats = fs.statSync(tursoBackupPath);
      console.log(`[BACKUP SUCCESS] Turso Cloud snapshot saved: ${tursoBackupFile} (${(stats.size / 1024).toFixed(2)} KB)`);
    } catch (err) {
      console.error('[BACKUP TURSO FAILED]', err);
    }
  }

  // Also snapshot local SQLite if exists
  if (fs.existsSync(DB_PATH)) {
    const backupFileName = `ryma_backup_${timestamp}.db`;
    const backupPath = path.join(BACKUP_DIR, backupFileName);

    console.log(`[BACKUP] Starting online SQLite snapshot of ${DB_PATH}...`);

    let db;
    try {
      db = new Database(DB_PATH, { readonly: true });
      db.prepare(`VACUUM INTO ?`).run(backupPath);
      const stats = fs.statSync(backupPath);
      console.log(`[BACKUP SUCCESS] Created local ${backupFileName} (${(stats.size / 1024).toFixed(2)} KB)`);
    } catch (err) {
      console.error('[LOCAL SQLITE BACKUP FAILED]', err);
    } finally {
      if (db) db.close();
    }
  }

  // Keep only the last 30 daily/hourly backups
  cleanOldBackups(30);
}

function cleanOldBackups(maxKeep = 30) {
  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter(f => (f.startsWith('ryma_backup_') || f.startsWith('ryma_turso_backup_')) && (f.endsWith('.db') || f.endsWith('.json')))
    .map(f => ({ name: f, time: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  if (files.length > maxKeep) {
    const toDelete = files.slice(maxKeep);
    toDelete.forEach(f => {
      try {
        fs.unlinkSync(path.join(BACKUP_DIR, f.name));
        console.log(`[BACKUP CLEANUP] Removed old backup: ${f.name}`);
      } catch {
        /* ignore */
      }
    });
  }
}

backupDatabase().catch(err => {
  console.error('[BACKUP FATAL]', err);
  process.exit(1);
});

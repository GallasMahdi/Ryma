/**
 * Enterprise Online Backup Script for SQLite
 *
 * Performs a safe, non-blocking online database snapshot using SQLite's native VACUUM INTO command.
 * Can be run on demand or scheduled via OS cron (e.g., hourly or daily).
 *
 * Usage: node scripts/backup-db.mjs
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(process.cwd(), 'data', 'ryma.db');

const BACKUP_DIR = path.join(process.cwd(), 'data', 'backups');

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function backupDatabase() {
  if (!fs.existsSync(DB_PATH)) {
    console.error(`[BACKUP ERROR] Database file not found at: ${DB_PATH}`);
    process.exit(1);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `ryma_backup_${timestamp}.db`;
  const backupPath = path.join(BACKUP_DIR, backupFileName);

  console.log(`[BACKUP] Starting online snapshot of ${DB_PATH}...`);

  const db = new Database(DB_PATH, { readonly: true });
  try {
    // Safe non-blocking online snapshot
    db.prepare(`VACUUM INTO ?`).run(backupPath);
    const stats = fs.statSync(backupPath);
    console.log(`[BACKUP SUCCESS] Created ${backupFileName} (${(stats.size / 1024).toFixed(2)} KB)`);

    // Keep only the last 30 daily/hourly backups
    cleanOldBackups(30);
  } catch (err) {
    console.error('[BACKUP FAILED]', err);
    process.exit(1);
  } finally {
    db.close();
  }
}

function cleanOldBackups(maxKeep = 30) {
  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('ryma_backup_') && f.endsWith('.db'))
    .map(f => ({ name: f, time: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  if (files.length > maxKeep) {
    const toDelete = files.slice(maxKeep);
    toDelete.forEach(f => {
      fs.unlinkSync(path.join(BACKUP_DIR, f.name));
      console.log(`[BACKUP CLEANUP] Removed old backup: ${f.name}`);
    });
  }
}

backupDatabase();

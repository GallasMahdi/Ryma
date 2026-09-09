#!/usr/bin/env node
/**
 * Disaster Recovery Database Restore Utility
 * Restores a full JSON database snapshot into Turso Cloud and local SQLite with transactional integrity.
 *
 * Usage:
 *   node scripts/restore-backup.mjs <path-to-backup.json>
 */
import fs from 'fs';
import path from 'path';
import { createClient } from '@libsql/client';
import Database from 'better-sqlite3';

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node scripts/restore-backup.mjs <path-to-backup.json>');
  process.exit(1);
}

const backupPath = path.resolve(args[0]);
if (!fs.existsSync(backupPath)) {
  console.error(`Error: Backup file not found at ${backupPath}`);
  process.exit(1);
}

console.log(`--- Starting Database Disaster Recovery Restore ---`);
console.log(`Source Backup File: ${backupPath}`);

const rawData = fs.readFileSync(backupPath, 'utf8');
let backupData;
try {
  backupData = JSON.parse(rawData);
} catch (err) {
  console.error('Error: Failed to parse backup file as valid JSON:', err.message);
  process.exit(1);
}

if (!backupData.tables || typeof backupData.tables !== 'object') {
  console.error('Error: Backup JSON is missing "tables" property.');
  process.exit(1);
}

console.log(`Snapshot Version: ${backupData.version || 'unknown'}`);
console.log(`Exported At: ${backupData.exportedAt || 'unknown'}`);

// Parse environment variables from .env.local
const env = {};
if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  envContent.split('\n').forEach(line => {
    const idx = line.indexOf('=');
    if (idx > 0) {
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
      env[k] = v;
    }
  });
}

const {
  patients = [],
  patient_sessions = [],
  appointments = [],
  invoices = [],
  prescriptions = [],
  blocked_slots = [],
  patient_notes = [],
  reviews = [],
} = backupData.tables;

const queries = [];

// Clear existing data in reverse dependency order
queries.push({ sql: 'DELETE FROM patient_sessions', args: [] });
queries.push({ sql: 'DELETE FROM prescriptions', args: [] });
queries.push({ sql: 'DELETE FROM patient_notes', args: [] });
queries.push({ sql: 'DELETE FROM appointments', args: [] });
queries.push({ sql: 'DELETE FROM invoices', args: [] });
queries.push({ sql: 'DELETE FROM blocked_slots', args: [] });
queries.push({ sql: 'DELETE FROM patients', args: [] });
if (reviews.length > 0) queries.push({ sql: 'DELETE FROM reviews', args: [] });

// 1. Patients
for (const p of patients) {
  queries.push({
    sql: `INSERT INTO patients (id, patientName, phone, email, gender, dob, coverageType, coverageProvider, coverageNumber, referringDoctor, pathologyTags, medicalHistory, totalPrescribedSessions, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      p.id,
      p.patientName,
      p.phone,
      p.email ?? null,
      p.gender ?? null,
      p.dob ?? null,
      p.coverageType ?? 'PARTICULAR',
      p.coverageProvider ?? null,
      p.coverageNumber ?? null,
      p.referringDoctor ?? null,
      p.pathologyTags ?? '',
      p.medicalHistory ?? '',
      p.totalPrescribedSessions ?? 10,
      p.createdAt,
      p.updatedAt,
    ],
  });
}

// 2. Appointments
for (const a of appointments) {
  queries.push({
    sql: `INSERT INTO appointments (id, patientName, email, phone, service, date, startTime, status, notes, coverageType, coverageProvider, coverageNumber, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      a.id,
      a.patientName,
      a.email ?? null,
      a.phone,
      a.service,
      a.date,
      a.startTime,
      a.status,
      a.notes ?? null,
      a.coverageType ?? 'PARTICULAR',
      a.coverageProvider ?? null,
      a.coverageNumber ?? null,
      a.createdAt,
      a.updatedAt,
    ],
  });
}

// 3. Patient Sessions
for (const s of patient_sessions) {
  queries.push({
    sql: `INSERT INTO patient_sessions (id, patientId, date, time, serviceSlug, evaPainScore, sessionType, notes, practitioner, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      s.id,
      s.patientId,
      s.date,
      s.time ?? null,
      s.serviceSlug,
      s.evaPainScore ?? 5,
      s.sessionType ?? 'MANUAL',
      s.notes ?? null,
      s.practitioner ?? null,
      s.createdAt,
    ],
  });
}

// 4. Invoices
for (const inv of invoices) {
  queries.push({
    sql: `INSERT INTO invoices (id, invoiceNumber, appointmentId, patientId, patientName, patientNif, patientEmail, patientPhone, patientAddress, coverageType, coverageProvider, coverageNumber, serviceSlug, serviceName, practitioner, amount, vatRate, vatExemptionReason, paymentMethod, paymentStatus, paidAt, notes, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      inv.id,
      inv.invoiceNumber,
      inv.appointmentId ?? null,
      inv.patientId ?? null,
      inv.patientName,
      inv.patientNif ?? '999999990',
      inv.patientEmail ?? null,
      inv.patientPhone,
      inv.patientAddress ?? 'Lisboa, Portugal',
      inv.coverageType ?? 'PARTICULAR',
      inv.coverageProvider ?? null,
      inv.coverageNumber ?? null,
      inv.serviceSlug,
      inv.serviceName,
      inv.practitioner ?? '',
      inv.amount,
      inv.vatRate ?? 0,
      inv.vatExemptionReason ?? null,
      inv.paymentMethod ?? 'MULTIBANCO',
      inv.paymentStatus ?? 'PAID',
      inv.paidAt ?? null,
      inv.notes ?? null,
      inv.createdAt,
      inv.updatedAt,
    ],
  });
}

// 5. Prescriptions
for (const pr of prescriptions) {
  queries.push({
    sql: `INSERT INTO prescriptions (id, patientId, patientPhone, patientName, practitioner, date, diagnosisOrGoal, itemsJson, generalNotes, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      pr.id,
      pr.patientId ?? null,
      pr.patientPhone,
      pr.patientName,
      pr.practitioner,
      pr.date,
      pr.diagnosisOrGoal ?? null,
      typeof pr.itemsJson === 'string' ? pr.itemsJson : JSON.stringify(pr.itemsJson || []),
      pr.generalNotes ?? null,
      pr.createdAt,
    ],
  });
}

// 6. Blocked Slots
for (const b of blocked_slots) {
  queries.push({
    sql: `INSERT OR IGNORE INTO blocked_slots (id, date, time) VALUES (?, ?, ?)`,
    args: [b.id || ('blk_' + Math.random().toString(36).slice(2)), b.date, b.time],
  });
}

// 7. Patient Notes
for (const n of patient_notes) {
  queries.push({
    sql: `INSERT OR REPLACE INTO patient_notes (phone, patientName, content, tags, updatedAt) VALUES (?, ?, ?, ?, ?)`,
    args: [n.phone, n.patientName, n.content ?? '', n.tags ?? '', n.updatedAt],
  });
}

// 8. Reviews
for (const r of reviews) {
  queries.push({
    sql: `INSERT OR REPLACE INTO reviews (id, patientName, patientEmail, rating, serviceSlug, comment, location, status, verified, isFeatured, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      r.id,
      r.patientName,
      r.patientEmail ?? null,
      r.rating,
      r.serviceSlug,
      r.comment,
      r.location ?? 'Lisboa',
      r.status ?? 'APPROVED',
      r.verified ?? 1,
      r.isFeatured ?? 0,
      r.createdAt,
      r.updatedAt,
    ],
  });
}

async function runRestore() {
  // 1. Local SQLite restore
  const localDbPath = path.join(process.cwd(), 'data', 'ryma.db');
  if (fs.existsSync(localDbPath)) {
    const db = new Database(localDbPath);
    db.pragma('foreign_keys = ON');
    const runTx = db.transaction(() => {
      for (const q of queries) {
        db.prepare(q.sql).run(...q.args);
      }
    });
    runTx();
    db.close();
    console.log('✅ Local SQLite database restored successfully.');
  }

  // 2. Turso Cloud restore
  if (env.TURSO_DATABASE_URL && env.TURSO_AUTH_TOKEN) {
    const client = createClient({
      url: env.TURSO_DATABASE_URL,
      authToken: env.TURSO_AUTH_TOKEN,
    });
    // LibSQL client batch limit is typically 500-1000 per request, chunk queries
    const chunkSize = 200;
    for (let i = 0; i < queries.length; i += chunkSize) {
      const chunk = queries.slice(i, i + chunkSize);
      await client.batch(chunk, 'write');
    }
    console.log('✅ Turso Cloud database restored successfully.');
  }

  console.log('\n======================================================');
  console.log('🎉 DISASTER RECOVERY RESTORE COMPLETE! 🎉');
  console.log('Restored Table Metrics:');
  console.log(`  - Patients: ${patients.length}`);
  console.log(`  - Appointments: ${appointments.length}`);
  console.log(`  - Patient Sessions: ${patient_sessions.length}`);
  console.log(`  - Invoices: ${invoices.length}`);
  console.log(`  - Prescriptions: ${prescriptions.length}`);
  console.log(`  - Blocked Slots: ${blocked_slots.length}`);
  console.log(`  - Patient Notes: ${patient_notes.length}`);
  console.log(`  - Reviews: ${reviews.length}`);
  console.log('======================================================');
}

runRestore().catch(err => {
  console.error('\n❌ Restore Failed:', err);
  process.exit(1);
});

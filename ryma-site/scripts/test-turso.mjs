import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';

// Parse .env.local manually
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...vals] = trimmed.split('=');
      if (key && vals.length > 0) {
        process.env[key.trim()] = vals.join('=').trim();
      }
    }
  });
}

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

console.log('--- Testing Turso Live Connection ---');
console.log('Database URL:', url);
console.log('Auth Token Present:', Boolean(authToken));

if (!url || !authToken) {
  console.error('ERROR: TURSO_DATABASE_URL or TURSO_AUTH_TOKEN is missing');
  process.exit(1);
}

const client = createClient({ url, authToken });

async function verify() {
  try {
    // 1. Connection ping
    const ping = await client.execute('SELECT 1 as connected');
    console.log('✓ Turso Ping Test:', ping.rows[0]);

    // 2. Ensure schema exists on Turso
    console.log('\nInitialising tables on Turso Cloud Database...');
    const ddl = [
      `CREATE TABLE IF NOT EXISTS appointments (
        id          TEXT PRIMARY KEY,
        patientName TEXT NOT NULL,
        email       TEXT,
        phone       TEXT NOT NULL,
        service     TEXT NOT NULL,
        date        TEXT NOT NULL,
        startTime   TEXT NOT NULL,
        status      TEXT NOT NULL DEFAULT 'PENDING',
        notes       TEXT,
        createdAt   TEXT NOT NULL,
        updatedAt   TEXT NOT NULL,
        UNIQUE(date, startTime)
      )`,
      `CREATE TABLE IF NOT EXISTS blocked_slots (
        id    TEXT PRIMARY KEY,
        date  TEXT NOT NULL,
        time  TEXT NOT NULL,
        UNIQUE(date, time)
      )`,
      `CREATE TABLE IF NOT EXISTS rate_limit_log (
        ip        TEXT NOT NULL,
        action    TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS patient_notes (
        phone       TEXT PRIMARY KEY,
        patientName TEXT NOT NULL,
        content     TEXT NOT NULL DEFAULT '',
        tags        TEXT NOT NULL DEFAULT '',
        updatedAt   TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS patients (
        id                      TEXT PRIMARY KEY,
        patientName             TEXT NOT NULL,
        phone                   TEXT NOT NULL UNIQUE,
        email                   TEXT,
        gender                  TEXT,
        dob                     TEXT,
        cnamStatus              TEXT DEFAULT 'NON',
        cnamNumber              TEXT,
        referringDoctor         TEXT,
        pathologyTags           TEXT NOT NULL DEFAULT '',
        medicalHistory          TEXT NOT NULL DEFAULT '',
        totalPrescribedSessions INTEGER NOT NULL DEFAULT 10,
        createdAt               TEXT NOT NULL,
        updatedAt               TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS patient_sessions (
        id           TEXT PRIMARY KEY,
        patientId    TEXT NOT NULL,
        date         TEXT NOT NULL,
        time         TEXT,
        serviceSlug  TEXT NOT NULL DEFAULT 'kinesitherapie-generale',
        evaPainScore INTEGER NOT NULL DEFAULT 5,
        sessionType  TEXT NOT NULL DEFAULT 'MANUAL',
        notes        TEXT,
        practitioner TEXT,
        createdAt    TEXT NOT NULL
      )`
    ];

    for (const stmt of ddl) {
      await client.execute(stmt);
    }
    console.log('✓ All database schemas initialized successfully on Turso Cloud!');

    // 3. List tables in Turso
    const tables = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    );
    console.log('✓ Active Tables in Turso:', tables.rows.map(r => r.name));

    // 4. Test insert & read
    const testId = 'test_' + Date.now();
    await client.execute({
      sql: `INSERT INTO rate_limit_log (ip, action, timestamp) VALUES (?, ?, ?)`,
      args: ['127.0.0.1', testId, Date.now()]
    });
    console.log('✓ Test record written to Turso Cloud DB');

    const readBack = await client.execute({
      sql: `SELECT * FROM rate_limit_log WHERE action = ?`,
      args: [testId]
    });
    console.log('✓ Test record read back from Turso Cloud DB:', readBack.rows[0]);

    // Clean up test record
    await client.execute({
      sql: `DELETE FROM rate_limit_log WHERE action = ?`,
      args: [testId]
    });

    console.log('\n======================================================');
    console.log('🎉 SUCCESS! TURSO CLOUD DATABASE IS LIVE AND 100% WORKING!');
    console.log('======================================================');
  } catch (err) {
    console.error('✖ Turso Verification Error:', err);
  }
}

verify();

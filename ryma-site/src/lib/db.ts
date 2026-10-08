import { getTreatments, validateTreatment, treatmentFromRow } from '@/lib/treatments';
import { practitionerIntervals } from '@/lib/schedule-math';
import { retryDatabaseBusy, isDatabaseBusy } from '@/lib/db-retry';
import { getSchedulingConfiguration, schedulingAvailability, SchedulingError, type AvailabilityOptions } from '@/lib/scheduling';
import { createScheduledAppointment, createScheduledSeries, updateScheduledAppointment, type AppointmentChanges } from '@/lib/booking-service';
import { createHash } from 'node:crypto';
import { ClinicalError, validEva } from '@/lib/clinical';
import { toCents, sumMoney } from '@/lib/money';
import { migrateSchedulingDatabase, migrateSchedulingSqlite } from '@/lib/scheduling-schema';
import { clockMinutes } from '@/lib/booking-schedule';
import { isCalendarDate, lisbonDayStart, nextLisbonDayStart } from './admin-validation';
// better-sqlite3 is only imported lazily inside getDb() to avoid crashing on
// Vercel serverless where the native .node binary cannot be loaded.
// At module level we only declare the type.
import { createClient, type Client as LibSqlClient } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import { getServicePrice, getServicePole, getServiceName, type PatientRecord, type PatientSession, type Invoice, type CreateInvoiceInput, type InvoiceStats, type PatientPrescription, type PrescriptionItem, type Review, type ReviewStatus, type CreateReviewInput } from '@/types/admin';
import type { Lang } from '@/lib/i18n';
import { SITE } from '@/lib/site';
import { phonesMatch, requireNormalizedPhone, validateAndNormalizePhone } from '@/lib/phone';
import { broadcastAppointmentCreated, broadcastMultipleAppointmentsCreated } from '@/lib/events';
import { VALID_TIME_SLOTS, getLisbonDateTime } from '@/lib/validation';
import { env } from '@/lib/env';

// Configured Turso is authoritative; SQLite is used only when explicitly selected.
let _tursoClient: LibSqlClient | null = null;
let _tursoInitialized = false;
let _tursoSchemaPromise: Promise<void> | undefined;

function isTursoEnabled(): boolean {
  return Boolean(process.env.TURSO_DATABASE_URL);
}

async function ensureTursoSchema(client: LibSqlClient): Promise<void> {
  if (_tursoInitialized) return;
  _tursoSchemaPromise ??= initializeTursoSchema(client).catch(error => {
    _tursoSchemaPromise = undefined;
    throw error;
  });
  return _tursoSchemaPromise;
}

async function initializeTursoSchema(client: LibSqlClient): Promise<void> {
  if (client.protocol === "file") await client.execute("PRAGMA journal_mode=WAL");

  try {
    // 1. Ensure tables exist
    await client.batch([
      `CREATE TABLE IF NOT EXISTS appointments (
        id               TEXT PRIMARY KEY,
        patientName      TEXT NOT NULL,
        email            TEXT,
        phone            TEXT NOT NULL,
        service          TEXT NOT NULL,
        date             TEXT NOT NULL,
        startTime        TEXT NOT NULL,
        status           TEXT NOT NULL DEFAULT 'PENDING'
                         CHECK (status IN ('PENDING','CONFIRMED','CANCELLED','COMPLETED','NO_SHOW')),
        notes            TEXT,
        coverageType     TEXT DEFAULT 'PARTICULAR',
        coverageProvider TEXT,
        coverageNumber   TEXT,
        createdAt        TEXT NOT NULL,
        updatedAt        TEXT NOT NULL
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
        coverageType            TEXT DEFAULT 'PARTICULAR',
        coverageProvider        TEXT,
        coverageNumber          TEXT,
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
        serviceSlug  TEXT NOT NULL,
        evaPainScore INTEGER NOT NULL DEFAULT 5,
        sessionType  TEXT NOT NULL DEFAULT 'MANUAL',
        notes        TEXT,
        practitioner TEXT,
        createdAt    TEXT NOT NULL,
        FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS invoices (
        id                  TEXT PRIMARY KEY,
        invoiceNumber       TEXT NOT NULL UNIQUE,
        appointmentId       TEXT,
        patientId           TEXT,
        patientName         TEXT NOT NULL,
        patientNif          TEXT DEFAULT '999999990',
        patientEmail        TEXT,
        patientPhone        TEXT NOT NULL,
        patientAddress      TEXT,
        coverageType        TEXT DEFAULT 'PARTICULAR',
        coverageProvider    TEXT,
        coverageNumber      TEXT,
        serviceSlug         TEXT NOT NULL,
        serviceName         TEXT NOT NULL,
        practitioner        TEXT,
        amount              REAL NOT NULL,
        vatRate             REAL NOT NULL DEFAULT 0,
        vatExemptionReason  TEXT DEFAULT 'Artigo 9.º do CIVA',
        paymentMethod       TEXT NOT NULL DEFAULT 'MULTIBANCO',
        paymentStatus       TEXT NOT NULL DEFAULT 'PAID',
        paidAt              TEXT,
        notes               TEXT,
        createdAt           TEXT NOT NULL,
        updatedAt           TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS prescriptions (
        id                TEXT PRIMARY KEY,
        patientId         TEXT,
        patientPhone      TEXT NOT NULL,
        patientName       TEXT NOT NULL,
        practitioner      TEXT NOT NULL,
        date              TEXT NOT NULL,
        diagnosisOrGoal   TEXT,
        itemsJson         TEXT NOT NULL,
        generalNotes      TEXT,
        createdAt         TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS security_settings (
        key        TEXT PRIMARY KEY,
        value      TEXT NOT NULL,
        updatedAt  TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS security_audit_logs (
        id        TEXT PRIMARY KEY,
        eventType TEXT NOT NULL,
        ip        TEXT NOT NULL,
        userAgent TEXT,
        details   TEXT,
        createdAt TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS revoked_sessions (
        sessionId  TEXT PRIMARY KEY,
        revokedAt  INTEGER NOT NULL,
        expiresAt  INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS owner_step_up_grants (
        sessionId  TEXT PRIMARY KEY,
        unlockedAt INTEGER NOT NULL,
        expiresAt  INTEGER NOT NULL
      )`,
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
      `CREATE INDEX IF NOT EXISTS idx_revoked_sessions_expiry ON revoked_sessions(expiresAt)`,
      `CREATE INDEX IF NOT EXISTS idx_owner_step_up_expiry ON owner_step_up_grants(expiresAt)`,
      `CREATE INDEX IF NOT EXISTS idx_idempotency_expiry ON idempotency_keys(expiresAt)`,
      `CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date)`,
      `CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status)`,
      `CREATE INDEX IF NOT EXISTS idx_appointments_date_status ON appointments(date, status, startTime)`,
      `CREATE INDEX IF NOT EXISTS idx_appointments_phone_date ON appointments(phone, date DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_rate_limit ON rate_limit_log(ip, action, timestamp)`,
      `CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone)`,
      `CREATE INDEX IF NOT EXISTS idx_patients_updated ON patients(updatedAt DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_patients_coverage ON patients(coverageType)`,
      `CREATE INDEX IF NOT EXISTS idx_patient_sessions_patient ON patient_sessions(patientId)`,
      `CREATE INDEX IF NOT EXISTS idx_patient_sessions_patient_date ON patient_sessions(patientId, date DESC, createdAt DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_blocked_slots_date_time ON blocked_slots(date, time)`,
      `CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoiceNumber)`,
      `CREATE INDEX IF NOT EXISTS idx_invoices_patient ON invoices(patientPhone)`,
      `CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(createdAt)`,
      `CREATE INDEX IF NOT EXISTS idx_invoices_patient_created ON invoices(patientPhone, createdAt DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(paymentStatus)`,
      `CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patientPhone)`,
      `CREATE INDEX IF NOT EXISTS idx_prescriptions_date ON prescriptions(date)`,
      `CREATE TABLE IF NOT EXISTS reviews (
        id           TEXT PRIMARY KEY,
        patientName  TEXT NOT NULL,
        patientEmail TEXT,
        rating       INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        serviceSlug  TEXT NOT NULL,
        comment      TEXT NOT NULL,
        location     TEXT NOT NULL DEFAULT 'Lisboa',
        status       TEXT NOT NULL DEFAULT 'APPROVED' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
        verified     INTEGER NOT NULL DEFAULT 1,
        isFeatured   INTEGER NOT NULL DEFAULT 0,
        createdAt    TEXT NOT NULL,
        updatedAt    TEXT NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status, createdAt DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_reviews_service ON reviews(serviceSlug)`,
    ]);

    // Migration for legacy appointments table with table-level UNIQUE constraint on Turso
    try {
      const apptTableRes = await client.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='appointments'");
      const tableSql = String(apptTableRes.rows[0]?.sql ?? '');
      if (tableSql && (tableSql.includes('UNIQUE(date, startTime)') || tableSql.includes('UNIQUE (date, startTime)'))) {
        console.log('[Turso Migration] Migrating legacy appointments table on Turso Cloud...');
        await client.batch([
          `CREATE TABLE appointments_migration (
            id               TEXT PRIMARY KEY,
            patientName      TEXT NOT NULL,
            email            TEXT,
            phone            TEXT NOT NULL,
            service          TEXT NOT NULL,
            date             TEXT NOT NULL,
            startTime        TEXT NOT NULL,
            status           TEXT NOT NULL DEFAULT 'PENDING'
                             CHECK (status IN ('PENDING','CONFIRMED','CANCELLED','COMPLETED','NO_SHOW')),
            notes            TEXT,
            coverageType     TEXT DEFAULT 'PARTICULAR',
            coverageProvider TEXT,
            coverageNumber   TEXT,
            createdAt        TEXT NOT NULL,
            updatedAt        TEXT NOT NULL
          )`,
          `INSERT INTO appointments_migration SELECT id, patientName, email, phone, service, date, startTime, status, notes, coverageType, coverageProvider, coverageNumber, createdAt, updatedAt FROM appointments`,
          `DROP TABLE appointments`,
          `ALTER TABLE appointments_migration RENAME TO appointments`,
          `CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date)`,
          `CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status)`,
          `CREATE INDEX IF NOT EXISTS idx_appointments_date_status ON appointments(date, status, startTime)`,
          `CREATE INDEX IF NOT EXISTS idx_appointments_phone_date ON appointments(phone, date DESC)`,
        ]);
        console.log('[Turso Migration] Successfully migrated appointments on Turso Cloud!');
      }
    } catch (migErr) {
      console.warn('[Turso Table Migration Warning]:', migErr);
    }

    // 2. Safe non-destructive column migrations on Turso
    const patientColsRes = await client.execute("PRAGMA table_info(patients)");
    const patientColNames = patientColsRes.rows.map((r: any) => String(r.name));

    if (!patientColNames.includes('coverageType')) {
      await client.execute("ALTER TABLE patients ADD COLUMN coverageType TEXT DEFAULT 'PARTICULAR'");
      if (patientColNames.includes('cnamStatus')) {
        await client.execute("UPDATE patients SET coverageType = CASE WHEN cnamStatus = 'OUI' THEN 'INSURANCE' WHEN cnamStatus = 'EN_COURS' THEN 'ADSE' ELSE 'PARTICULAR' END");
      }
    }
    if (!patientColNames.includes('coverageProvider')) {
      await client.execute("ALTER TABLE patients ADD COLUMN coverageProvider TEXT");
    }
    if (!patientColNames.includes('coverageNumber')) {
      await client.execute("ALTER TABLE patients ADD COLUMN coverageNumber TEXT");
      if (patientColNames.includes('cnamNumber')) {
        await client.execute("UPDATE patients SET coverageNumber = cnamNumber WHERE cnamNumber IS NOT NULL AND coverageNumber IS NULL");
      }
    }

    const apptColsRes = await client.execute("PRAGMA table_info(appointments)");
    const apptColNames = apptColsRes.rows.map((r: any) => String(r.name));

    if (!apptColNames.includes('coverageType')) {
      await client.execute("ALTER TABLE appointments ADD COLUMN coverageType TEXT DEFAULT 'PARTICULAR'");
    }
    if (!apptColNames.includes('coverageProvider')) {
      await client.execute("ALTER TABLE appointments ADD COLUMN coverageProvider TEXT");
    }
    if (!apptColNames.includes('coverageNumber')) {
      await client.execute("ALTER TABLE appointments ADD COLUMN coverageNumber TEXT");
    }

    // 3. Automated index maintenance and prune stale rate limit logs (> 24 hours)
    try {
      await client.execute({
        sql: 'DELETE FROM rate_limit_log WHERE timestamp < ?',
        args: [Date.now() - 24 * 60 * 60 * 1000],
      });
      await client.execute('PRAGMA optimize');
    } catch {
      /* non-blocking maintenance */
    }

    const bookingColumns = await client.execute('PRAGMA table_info(appointments)');
    const bookingNames = bookingColumns.rows.map(row => String(row.name));
    if (!bookingNames.includes('source')) await client.execute("ALTER TABLE appointments ADD COLUMN source TEXT NOT NULL DEFAULT 'unknown'");
    if (!bookingNames.includes('bookingRequestId')) await client.execute('ALTER TABLE appointments ADD COLUMN bookingRequestId TEXT');
    await client.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_request ON appointments(bookingRequestId) WHERE bookingRequestId IS NOT NULL');
    await migrateSchedulingDatabase(client);
    _tursoInitialized = true;
  } catch (migErr) {
    throw migErr;
  }
}

function getTursoClient(): LibSqlClient {
  if (!_tursoClient) {
    const rawUrl = (process.env.TURSO_DATABASE_URL ?? '').replace(/['"]/g, '').trim();
    const authToken = (process.env.TURSO_AUTH_TOKEN ?? '').replace(/['"]/g, '').trim();
    _tursoClient = createClient({
      url: rawUrl,
      authToken,
    });
  }
  return _tursoClient;
}

/**
 * Executes a query ONLY against Turso, with 3 resilient retry attempts with exponential backoff on network drop.
 * NEVER falls back to local SQLite. Used for critical booking conflict checks
 * and INSERTs that must be authoritative. Falls back only if Turso is not
 * configured (local dev without Turso credentials).
 */
async function executeTursoDirectly<T = any>(sql: string, args: any[] = []): Promise<T[]> {
  if (!isTursoEnabled()) {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SQLITE_FALLBACK !== 'true') throw new Error('Persistent database configuration required');
    return executeSqliteQuery<T>(sql, args);
  }

  // Reads may be retried; an ambiguous write response must not execute a mutation twice.
  const maxAttempts = /^\s*(SELECT|PRAGMA)\b/i.test(sql) ? 3 : 1;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const client = getTursoClient();
      await ensureTursoSchema(client);
      const res = await retryDatabaseBusy(() => client.execute({ sql, args }));
      return res.rows as unknown as T[];
    } catch (err) {
      if (!/SQLITE_CONSTRAINT|SQLITE_BUSY|SQLITE_LOCKED/.test(String(err))) _tursoClient = null;
      if (attempt === maxAttempts) throw err;
      // Exponential jittered backoff: 50ms, 100ms
      await new Promise(r => setTimeout(r, attempt * 50));
    }
  }
  throw new Error('Turso unreachable after 3 attempts');
}

// ─── Local SQLite Fallback Engine ─────────────────────────────────────────────
function resolveDbPath(): string {
  const isProd = process.env.NODE_ENV === 'production';
  const isServerless = Boolean(
    process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY
  );

  // In production serverless environments, Turso credentials are required to avoid ephemeral data loss
  if (isProd && isServerless && (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN)) {
    throw new Error(
      '[FATAL DB CONFIG ERROR] Serverless production deployment requires TURSO_DATABASE_URL and TURSO_AUTH_TOKEN to be configured to prevent ephemeral data loss.'
    );
  }

  if (process.env.DATABASE_PATH) {
    return path.resolve(process.env.DATABASE_PATH);
  }

  const defaultLocalPath = path.join(process.cwd(), 'data', 'ryma.db');

  if (isServerless) {
    // Development or test serverless simulation
    const tmpPath = path.join('/tmp', 'ryma.db');
    if (!fs.existsSync(tmpPath)) {
      try {
        if (fs.existsSync(defaultLocalPath)) {
          fs.copyFileSync(defaultLocalPath, tmpPath);
        }
      } catch (err) {
        console.warn('[DB] Could not copy seed database to /tmp:', err);
      }
    }
    return tmpPath;
  }

  try {
    const dbDir = path.dirname(defaultLocalPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    return defaultLocalPath;
  } catch (err) {
    if (isProd) {
      throw new Error(
        `[FATAL DB CONFIG ERROR] Cannot write to persistent database directory at ${defaultLocalPath}. Ephemeral /tmp fallback is disabled in production.`
      );
    }
    return path.join('/tmp', 'ryma.db');
  }
}

let _sqliteDb: import('better-sqlite3').Database | null = null;

export function getDb(): import('better-sqlite3').Database {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SQLITE_FALLBACK !== 'true') throw new Error('Persistent database configuration required');
  if (!_sqliteDb) {
    const dbPath = resolveDbPath();
    const dbDir = path.dirname(dbPath);

    if (!fs.existsSync(dbDir)) {
      try {
        fs.mkdirSync(dbDir, { recursive: true });
      } catch {
        /* Ignore mkdir errors on read-only system if /tmp */
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require('better-sqlite3') as typeof import('better-sqlite3');
    _sqliteDb = new Database(dbPath);

    try {
      _sqliteDb.pragma('journal_mode = WAL');
    } catch {
      _sqliteDb.pragma('journal_mode = DELETE');
    }

    _sqliteDb.pragma('foreign_keys = ON');
    _sqliteDb.pragma('synchronous = NORMAL');
    _sqliteDb.pragma('busy_timeout = 5000');
    _sqliteDb.pragma('cache_size = -64000');
    initSchemaSync(_sqliteDb);
  }
  return _sqliteDb;
}

function initSchemaSync(db: import('better-sqlite3').Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS appointments (
      id               TEXT PRIMARY KEY,
      patientName      TEXT NOT NULL,
      email            TEXT,
      phone            TEXT NOT NULL,
      service          TEXT NOT NULL,
      date             TEXT NOT NULL,
      startTime        TEXT NOT NULL,
      status           TEXT NOT NULL DEFAULT 'PENDING'
                       CHECK (status IN ('PENDING','CONFIRMED','CANCELLED','COMPLETED','NO_SHOW')),
      notes            TEXT,
      coverageType     TEXT DEFAULT 'PARTICULAR',
      coverageProvider TEXT,
      coverageNumber   TEXT,
      createdAt        TEXT NOT NULL,
      updatedAt        TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS blocked_slots (
      id    TEXT PRIMARY KEY,
      date  TEXT NOT NULL,
      time  TEXT NOT NULL,
      UNIQUE(date, time)
    );

    CREATE TABLE IF NOT EXISTS rate_limit_log (
      ip        TEXT NOT NULL,
      action    TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS patient_notes (
      phone       TEXT PRIMARY KEY,
      patientName TEXT NOT NULL,
      content     TEXT NOT NULL DEFAULT '',
      tags        TEXT NOT NULL DEFAULT '',
      updatedAt   TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS patients (
      id                      TEXT PRIMARY KEY,
      patientName             TEXT NOT NULL,
      phone                   TEXT NOT NULL UNIQUE,
      email                   TEXT,
      gender                  TEXT,
      dob                     TEXT,
      coverageType            TEXT DEFAULT 'PARTICULAR',
      coverageProvider        TEXT,
      coverageNumber          TEXT,
      referringDoctor         TEXT,
      pathologyTags           TEXT NOT NULL DEFAULT '',
      medicalHistory          TEXT NOT NULL DEFAULT '',
      totalPrescribedSessions INTEGER NOT NULL DEFAULT 10,
      createdAt               TEXT NOT NULL,
      updatedAt               TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS patient_sessions (
      id           TEXT PRIMARY KEY,
      patientId    TEXT NOT NULL,
      date         TEXT NOT NULL,
      time         TEXT,
      serviceSlug  TEXT NOT NULL,
      evaPainScore INTEGER NOT NULL DEFAULT 5,
      sessionType  TEXT NOT NULL DEFAULT 'MANUAL',
      notes        TEXT,
      practitioner TEXT,
      createdAt    TEXT NOT NULL,
      FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id                  TEXT PRIMARY KEY,
      invoiceNumber       TEXT NOT NULL UNIQUE,
      appointmentId       TEXT,
      patientId           TEXT,
      patientName         TEXT NOT NULL,
      patientNif          TEXT DEFAULT '999999990',
      patientEmail        TEXT,
      patientPhone        TEXT NOT NULL,
      patientAddress      TEXT,
      coverageType        TEXT DEFAULT 'PARTICULAR',
      coverageProvider    TEXT,
      coverageNumber      TEXT,
      serviceSlug         TEXT NOT NULL,
      serviceName         TEXT NOT NULL,
      practitioner        TEXT,
      amount              REAL NOT NULL,
      vatRate             REAL NOT NULL DEFAULT 0,
      vatExemptionReason  TEXT DEFAULT 'Artigo 9.º do CIVA',
      paymentMethod       TEXT NOT NULL DEFAULT 'MULTIBANCO',
      paymentStatus       TEXT NOT NULL DEFAULT 'PAID',
      paidAt              TEXT,
      notes               TEXT,
      createdAt           TEXT NOT NULL,
      updatedAt           TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS prescriptions (
      id                TEXT PRIMARY KEY,
      patientId         TEXT,
      patientPhone      TEXT NOT NULL,
      patientName       TEXT NOT NULL,
      practitioner      TEXT NOT NULL,
      date              TEXT NOT NULL,
      diagnosisOrGoal   TEXT,
      itemsJson         TEXT NOT NULL,
      generalNotes      TEXT,
      createdAt         TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS security_settings (
      key        TEXT PRIMARY KEY,
      value      TEXT NOT NULL,
      updatedAt  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS security_audit_logs (
      id        TEXT PRIMARY KEY,
      eventType TEXT NOT NULL,
      ip        TEXT NOT NULL,
      userAgent TEXT,
      details   TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS revoked_sessions (
      sessionId  TEXT PRIMARY KEY,
      revokedAt  INTEGER NOT NULL,
      expiresAt  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS owner_step_up_grants (
      sessionId  TEXT PRIMARY KEY,
      unlockedAt INTEGER NOT NULL,
      expiresAt  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invoice_sequences (
      year         INTEGER PRIMARY KEY,
      lastSequence INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS idempotency_keys (
      key          TEXT PRIMARY KEY,
      scope        TEXT NOT NULL,
      statusCode   INTEGER NOT NULL,
      responseBody TEXT NOT NULL,
      createdAt    INTEGER NOT NULL,
      expiresAt    INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_revoked_sessions_expiry ON revoked_sessions(expiresAt);
    CREATE INDEX IF NOT EXISTS idx_owner_step_up_expiry ON owner_step_up_grants(expiresAt);
    CREATE INDEX IF NOT EXISTS idx_idempotency_expiry ON idempotency_keys(expiresAt);


    CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
    CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
    CREATE INDEX IF NOT EXISTS idx_appointments_date_status ON appointments(date, status, startTime);
    CREATE INDEX IF NOT EXISTS idx_appointments_phone_date ON appointments(phone, date DESC);
    CREATE INDEX IF NOT EXISTS idx_rate_limit ON rate_limit_log(ip, action, timestamp);
    CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
    CREATE INDEX IF NOT EXISTS idx_patients_updated ON patients(updatedAt DESC);
    CREATE INDEX IF NOT EXISTS idx_patients_coverage ON patients(coverageType);
    CREATE INDEX IF NOT EXISTS idx_patient_sessions_patient ON patient_sessions(patientId);
    CREATE INDEX IF NOT EXISTS idx_patient_sessions_patient_date ON patient_sessions(patientId, date DESC, createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_blocked_slots_date_time ON blocked_slots(date, time);
    CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoiceNumber);
    CREATE INDEX IF NOT EXISTS idx_invoices_patient ON invoices(patientPhone);
    CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(createdAt);
    CREATE INDEX IF NOT EXISTS idx_invoices_patient_created ON invoices(patientPhone, createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(paymentStatus);
    CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patientPhone);
    CREATE INDEX IF NOT EXISTS idx_prescriptions_date ON prescriptions(date);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON security_audit_logs(createdAt DESC);

    CREATE TABLE IF NOT EXISTS reviews (
      id           TEXT PRIMARY KEY,
      patientName  TEXT NOT NULL,
      patientEmail TEXT,
      rating       INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      serviceSlug  TEXT NOT NULL,
      comment      TEXT NOT NULL,
      location     TEXT NOT NULL DEFAULT 'Lisboa',
      status       TEXT NOT NULL DEFAULT 'APPROVED' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
      verified     INTEGER NOT NULL DEFAULT 1,
      isFeatured   INTEGER NOT NULL DEFAULT 0,
      createdAt    TEXT NOT NULL,
      updatedAt    TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status, createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_reviews_service ON reviews(serviceSlug);
  `);

  // Migration for legacy appointments table with table-level UNIQUE constraint
  try {
    const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='appointments'").get() as { sql: string } | undefined;
    if (tableInfo?.sql && (tableInfo.sql.includes('UNIQUE(date, startTime)') || tableInfo.sql.includes('UNIQUE (date, startTime)'))) {
      db.exec(`
        BEGIN TRANSACTION;
        CREATE TABLE appointments_migration (
          id               TEXT PRIMARY KEY,
          patientName      TEXT NOT NULL,
          email            TEXT,
          phone            TEXT NOT NULL,
          service          TEXT NOT NULL,
          date             TEXT NOT NULL,
          startTime        TEXT NOT NULL,
          status           TEXT NOT NULL DEFAULT 'PENDING'
                           CHECK (status IN ('PENDING','CONFIRMED','CANCELLED','COMPLETED','NO_SHOW')),
          notes            TEXT,
          coverageType     TEXT DEFAULT 'PARTICULAR',
          coverageProvider TEXT,
          coverageNumber   TEXT,
          createdAt        TEXT NOT NULL,
          updatedAt        TEXT NOT NULL
        );
        INSERT INTO appointments_migration SELECT id, patientName, email, phone, service, date, startTime, status, notes, coverageType, coverageProvider, coverageNumber, createdAt, updatedAt FROM appointments;
        DROP TABLE appointments;
        ALTER TABLE appointments_migration RENAME TO appointments;
        CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
        CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
        CREATE INDEX IF NOT EXISTS idx_appointments_date_status ON appointments(date, status, startTime);
        CREATE INDEX IF NOT EXISTS idx_appointments_phone_date ON appointments(phone, date DESC);
        COMMIT;
      `);
    }
  } catch (migErr) {
    console.warn('[Appointments Schema Migration Warning]:', migErr);
  }

  // Non-destructive migration for existing tables
  try {
    const patientCols = db.pragma('table_info(patients)') as { name: string }[];
    const colNames = patientCols.map(c => c.name);

    if (!colNames.includes('coverageType')) {
      db.exec("ALTER TABLE patients ADD COLUMN coverageType TEXT DEFAULT 'PARTICULAR'");
      if (colNames.includes('cnamStatus')) {
        db.exec("UPDATE patients SET coverageType = CASE WHEN cnamStatus = 'OUI' THEN 'INSURANCE' WHEN cnamStatus = 'EN_COURS' THEN 'ADSE' ELSE 'PARTICULAR' END");
      }
    }
    if (!colNames.includes('coverageProvider')) {
      db.exec("ALTER TABLE patients ADD COLUMN coverageProvider TEXT");
    }
    if (!colNames.includes('coverageNumber')) {
      db.exec("ALTER TABLE patients ADD COLUMN coverageNumber TEXT");
      if (colNames.includes('cnamNumber')) {
        db.exec("UPDATE patients SET coverageNumber = cnamNumber WHERE cnamNumber IS NOT NULL AND coverageNumber IS NULL");
      }
    }

    const apptCols = db.pragma('table_info(appointments)') as { name: string }[];
    const apptColNames = apptCols.map(c => c.name);
    if (!apptColNames.includes('coverageType')) {
      db.exec("ALTER TABLE appointments ADD COLUMN coverageType TEXT DEFAULT 'PARTICULAR'");
    }
    if (!apptColNames.includes('coverageProvider')) {
      db.exec("ALTER TABLE appointments ADD COLUMN coverageProvider TEXT");
    }
    if (!apptColNames.includes('coverageNumber')) {
      db.exec("ALTER TABLE appointments ADD COLUMN coverageNumber TEXT");
    }
  } catch (err) {
    console.warn('[DB Migration Warning]:', err);
  }
  const bookingNames = (db.pragma('table_info(appointments)') as {name: string}[]).map(row => row.name);
  if (!bookingNames.includes('source')) db.exec("ALTER TABLE appointments ADD COLUMN source TEXT NOT NULL DEFAULT 'unknown'");
  if (!bookingNames.includes('bookingRequestId')) db.exec('ALTER TABLE appointments ADD COLUMN bookingRequestId TEXT');
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_request ON appointments(bookingRequestId) WHERE bookingRequestId IS NOT NULL');
  migrateSchedulingSqlite(db);
}

// Queries use the configured authoritative database.
export async function executeQuery<T = any>(sql: string, args: any[] = []): Promise<T[]> {
  return executeTursoDirectly<T>(sql, args);
}

export async function executeAtomicBatch(statements: { sql: string; args: any[] }[]): Promise<void> {
  if (isTursoEnabled()) {
    const client = getTursoClient();
    await ensureTursoSchema(client);
    await client.batch(statements, 'write');
  } else {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SQLITE_FALLBACK !== 'true') throw new Error('Persistent database configuration required');
    const db = getDb();
    db.transaction(() => { for (const q of statements) db.prepare(q.sql).run(...q.args); })();
  }
}

/** Integration state and replies commit only while the worker still owns its lease. */
export async function executeConditionalBatch(guard: {sql: string; args: any[]}, statements: {sql: string; args: any[]}[]): Promise<boolean> {
  if (isTursoEnabled()) {
    const client = getTursoClient();
    await ensureTursoSchema(client);
    return retryDatabaseBusy(async () => {
    const tx = await client.transaction('write');
    try {
      if (!(await tx.execute(guard)).rows.length) { await tx.rollback(); return false; }
      await tx.batch(statements);
      await tx.commit();
      return true;
    } finally { tx.close(); }
    });
  }
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SQLITE_FALLBACK !== 'true') throw new Error('Persistent database configuration required');
  const db = getDb();
  return db.transaction(() => {
    if (!db.prepare(guard.sql).get(...guard.args)) return false;
    for (const statement of statements) db.prepare(statement.sql).run(...statement.args);
    return true;
  })();
}

function executeSqliteQuery<T = any>(sql: string, args: any[] = []): T[] {
  const db = getDb();
  const statement = db.prepare(sql);
  if (statement.reader) {
    return statement.all(...args) as T[];
  } else {
    const res = statement.run(...args);
    return [{ changes: res.changes, lastInsertRowid: res.lastInsertRowid }] as unknown as T[];
  }
}

// ─── Public Export Types ──────────────────────────────────────────────────────
export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';

export interface Appointment {
  serviceNameJson?: string | null;
  servicePriceCents?: number | null;
  servicePole?: string | null;
  archivedAt?: string | null;
  archivedStatus?: AppointmentStatus | null;
  practitionerId: string;
  practitionerName: string;
  durationMinutes: number;
  bufferBefore: number;
  bufferAfter: number;
  resourceIds: string;
  patientId?: string | null;
  version: number;
  bookingRequestHash?: string | null;
  id: string;
  patientName: string;
  email: string | null;
  phone: string;
  service: string;
  date: string;
  startTime: string;
  status: AppointmentStatus;
  source?: 'website' | 'dashboard' | 'whatsapp' | 'unknown';
  bookingRequestId?: string | null;
  notes: string | null;
  coverageType: string;
  coverageProvider: string | null;
  coverageNumber: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppointmentInput {
  practitionerId?: string;
  patientName: string;
  email?: string;
  phone: string;
  service: string;
  date: string;
  startTime: string;
  status?: AppointmentStatus;
  source?: 'website' | 'dashboard' | 'whatsapp';
  bookingRequestId?: string;
  notes?: string;
  coverageType?: string;
  coverageProvider?: string;
  coverageNumber?: string;
}

export type AddAppointmentResult =
  | { success: true; appointment: Appointment; replayed?: boolean }
  | { success: false; error: 'slot_taken' | 'invalid_data' | 'slot_blocked' | 'rate_limited' | 'schedule_changed' };

// ─── Slot Availability Checker (Unified Single Source of Truth) ───────────────
export interface SlotAvailabilityResult {
  available: boolean;
  reason?: 'sunday' | 'past' | 'booked' | 'blocked' | 'invalid_time' | 'invalid_date';
}

/**
 * Authoritative availability check used by ALL booking flows:
 * Client booking, Admin single booking, and Multiple Sessions scheduler.
 */
export async function dbCheckSlotAvailability(date: string, startTime: string, service?: string, options: AvailabilityOptions = {}) {
  if (!isCalendarDate(date)) return {available: false, reason: 'invalid_date'};
  if (!VALID_TIME_SLOTS.includes(startTime)) return {available:false,reason:'invalid_time'};
  return (await schedulingAvailability([date], [startTime], service, options)).get(date)?.[0] ?? {available:false, reason:'invalid_time'};
}
export async function dbCheckMultipleDatesAvailability(dates: string[], timeSlots: readonly string[] = VALID_TIME_SLOTS, service?: string, options: AvailabilityOptions = {}) {
  return schedulingAvailability(dates,timeSlots,service,options);
}
export async function dbCreateAppointment(input: CreateAppointmentInput): Promise<AddAppointmentResult> {
  return createScheduledAppointment(input);
}

// ─── Multiple Sessions Creation (Atomic & Concurrency-Protected) ─────────────
export interface CreateMultipleAppointmentsInput {
  bookingRequestId?: string;
  practitionerId?: string;
  sessionType?: 'ONLINE' | 'MANUAL' | 'PAPER';
  patientName: string;
  phone: string;
  email?: string;
  service: string;
  patientId?: string;
  coverageType?: string;
  coverageProvider?: string;
  coverageNumber?: string;
  practitioner?: string;
  sessions: {
    date: string;
    startTime: string;
    notes?: string;
    evaPainScore?: number;
  }[];
}

export interface SessionConflictItem {
  date: string;
  startTime: string;
  reason: string;
  sessionIndex: number;
}

export type CreateMultipleAppointmentsResult =
  | {
      success: true;
      appointments: Appointment[];
      patientSessions: PatientSession[];
      patientId: string;
      replayed?: boolean;
    }
  | {
      success: false;
      error: 'slot_conflict' | 'empty_sessions' | 'invalid_input' | 'slot_taken' | 'schedule_changed';
      message: string;
      conflicts?: SessionConflictItem[];
    };

export async function dbCreateMultipleAppointments(input: CreateMultipleAppointmentsInput): Promise<CreateMultipleAppointmentsResult> {
  const result = await createScheduledSeries(input);
  if (result.success && !result.replayed) broadcastMultipleAppointmentsCreated(result.appointments);
  return result;
}

type AppointmentFilters = {practitionerId?: string;status?: string; date?: string; search?: string; dateFrom?: string; dateTo?: string; phone?: string; patientId?: string; includeArchived?: boolean};
function appointmentWhere(filters: AppointmentFilters = {}) {
  const clauses = [filters.includeArchived ? '1=1' : 'archivedAt IS NULL'];
  const params: (string | number)[] = [];
  if (filters.practitionerId) {clauses.push('practitionerId = ?'); params.push(filters.practitionerId);}
  if (filters.status && filters.status !== 'all') {clauses.push('status = ?'); params.push(filters.status.toUpperCase());}
  if (filters.date) {clauses.push('date = ?'); params.push(filters.date);}
  if (filters.dateFrom) {clauses.push('date >= ?'); params.push(filters.dateFrom);}
  if (filters.dateTo) {clauses.push('date <= ?'); params.push(filters.dateTo);}
  if (filters.patientId) {clauses.push('(patientId = ? OR (patientId IS NULL AND phone = (SELECT phone FROM patients WHERE id=?)))'); params.push(filters.patientId,filters.patientId);}
  else if (filters.phone) {
    const validation = validateAndNormalizePhone(filters.phone);
    clauses.push('(phone = ? OR phone = ?)'); params.push(filters.phone, validation.isValid ? validation.normalized : filters.phone);
  }
  if (filters.search) {clauses.push('(patientName LIKE ? OR phone LIKE ? OR service LIKE ?)'); params.push(...Array(3).fill('%' + filters.search + '%'));}
  return {where: ' WHERE ' + clauses.join(' AND '), params};
}
export async function dbGetAppointments(filters: AppointmentFilters & {limit?: number; offset?: number} = {}): Promise<Appointment[]> {
  const {where, params} = appointmentWhere(filters);
  let sql = 'SELECT * FROM appointments' + where + ' ORDER BY date DESC, startTime ASC, id ASC';
  if (filters.limit) {sql += ' LIMIT ? OFFSET ?'; params.push(filters.limit, filters.offset || 0);}
  return executeQuery<Appointment>(sql, params);
}
export async function dbGetAppointmentSummary(filters: AppointmentFilters = {}) {
  const catalogue=await getTreatments();
  const {where,params}=appointmentWhere(filters);
  const rows = await executeQuery<{status: string; service: string; servicePriceCents:number|null; count: number}>('SELECT status, service, servicePriceCents, COUNT(*) AS count FROM appointments'+where+' GROUP BY status, service, servicePriceCents',params);
  const stats = {total: 0, confirmed: 0, pending: 0, cancelled: 0, completed: 0, noShow: 0, revenue: 0};
  for (const row of rows) {
    const n = Number(row.count); stats.total += n;
    const key = ({CONFIRMED:'confirmed', PENDING:'pending', CANCELLED:'cancelled', COMPLETED:'completed', NO_SHOW:'noShow'} as const)[row.status as 'CONFIRMED'];
    if (key) stats[key] += n;
    if (row.status === 'CONFIRMED' || row.status === 'COMPLETED') stats.revenue += n * (row.servicePriceCents!=null?row.servicePriceCents/100:getServicePrice(row.service, catalogue));
  }
  return stats;
}
export async function dbGetAppointmentsPaginated(options: AppointmentFilters & {page?: number; limit?: number}) {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 50));
  const {where, params} = appointmentWhere(options);
  const count = await executeQuery<{cnt: number}>('SELECT COUNT(*) AS cnt FROM appointments' + where, params);
  const total = Number(count[0]?.cnt || 0);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const actualPage = Math.min(page, totalPages);
  const appointments = await dbGetAppointments({...options, limit, offset: (actualPage - 1) * limit});
  return {appointments, total, page: actualPage, limit, totalPages};
}

export async function dbGetAppointmentById(id: string, includeArchived = false): Promise<Appointment | null> {
  const rows = await executeQuery<Appointment>('SELECT * FROM appointments WHERE id = ?' + (includeArchived ? '' : ' AND archivedAt IS NULL'), [id]);
  return rows[0] ?? null;
}

export async function dbUpdateAppointment(id: string, fields: AppointmentChanges): Promise<Appointment | null> {
  return updateScheduledAppointment(id,fields);
}

export async function dbDeleteAppointment(id: string, actorSessionId?: string): Promise<boolean> {
  const existing = await dbGetAppointmentById(id);
  if (!existing) return false;
  const now = new Date().toISOString();
  const archived = await executeConditionalBatch(
    {sql:'SELECT id FROM appointments WHERE id=? AND version=? AND archivedAt IS NULL',args:[id,existing.version]},
    [
      {sql:"UPDATE appointments SET archivedAt=?,archivedStatus=status,status='CANCELLED',updatedAt=?,version=version+1 WHERE id=?",args:[now,now,id]},
      {sql:'INSERT INTO security_audit_logs(id,eventType,ip,details,createdAt) VALUES(?,?,?,?,?)',args:['audit_'+crypto.randomUUID(),'appointment_archived','internal',JSON.stringify({appointmentId:id,previousStatus:existing.status,actor:actorSessionId?createHash('sha256').update(actorSessionId).digest('hex'):null}),now]},
    ],
  );
  if (!archived) throw new SchedulingError('APPOINTMENT_CHANGED','This appointment was changed by another user. Refresh before archiving.');
  return true;
}

// ─── Blocked Slots Helpers ────────────────────────────────────────────────────
export async function dbGetBlockedSlots(): Promise<{ date: string; time: string; practitionerId: string }[]> {
  return executeQuery<{ date: string; time: string; practitionerId: string }>('SELECT date, time, practitionerId FROM blocked_slots');
}

export async function dbToggleBlockSlot(date: string, time: string, practitionerId = '*'): Promise<boolean> {
  const rows = await executeQuery('DELETE FROM blocked_slots WHERE date=? AND time=? AND practitionerId=? RETURNING id',[date,time,practitionerId]);
  if(rows.length)return false;
  await executeQuery('INSERT INTO blocked_slots(id,date,time,practitionerId) VALUES(?,?,?,?)',['blk_'+crypto.randomUUID(),date,time,practitionerId]);
  return true;
}

export async function dbIsSlotAvailable(date: string, time: string): Promise<boolean> {
  const res = await dbCheckSlotAvailability(date, time);
  return res.available;
}

// ─── Rate Limiting Helpers ────────────────────────────────────────────────────
/** The check and charge hold one write transaction, including across workers. */
export async function dbConsumeRateLimit(ip:string,action:string,maxAttempts:number,windowSeconds:number):Promise<boolean> {
  const now=Date.now();
  return executeConditionalBatch({sql:'SELECT 1 WHERE (SELECT COUNT(*) FROM rate_limit_log WHERE ip=? AND action=? AND timestamp>?)<?',args:[ip,action,now-windowSeconds*1000,maxAttempts]},[
    {sql:'INSERT INTO rate_limit_log(ip,action,timestamp) VALUES(?,?,?)',args:[ip,action,now]},
  ]);
}

export async function dbCheckRateLimit(
  ip: string,
  action: string,
  maxAttempts: number,
  windowSeconds: number
): Promise<boolean> {
  const windowStart = Date.now() - windowSeconds * 1000;
  const rows = await executeQuery<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM rate_limit_log WHERE ip = ? AND action = ? AND timestamp > ?',
    [ip, action, windowStart]
  );
  const count = Number(rows[0]?.cnt ?? 0);
  return count < maxAttempts;
}

export async function dbRecordRateLimitAttempt(ip: string, action: string): Promise<void> {
  await executeQuery('INSERT INTO rate_limit_log (ip, action, timestamp) VALUES (?, ?, ?)', [
    ip,
    action,
    Date.now(),
  ]);
  // Cleanup old entries probabilistically (1-in-20 calls) and fire-and-forget
  // so the booking write path is not blocked by a serial DELETE round-trip.
  if (Math.random() < 0.05) {
    const oneHourAgo = Date.now() - 3600 * 1000;
    executeQuery('DELETE FROM rate_limit_log WHERE timestamp < ?', [oneHourAgo]).catch(() => {});
  }
}

export async function dbResetRateLimit(ip: string, action: string): Promise<void> {
  try {
    await executeQuery('DELETE FROM rate_limit_log WHERE ip = ? AND action = ?', [ip, action]);
  } catch (err) {
    console.warn('[Rate Limit Reset Warning]:', err);
  }
}

// ─── Owner Analytics Security & Audit Logging Helpers ─────────────────────────
export async function dbGetOwnerAnalyticsPasswordHash(): Promise<string> {
  try {
    const rows = await executeQuery<{ value: string }>(
      'SELECT value FROM security_settings WHERE key = ?',
      ['analytics_owner_password_hash']
    );
    if (rows.length > 0 && rows[0]?.value) {
      return rows[0].value;
    }
  } catch (err) {
    throw err;
  }
  return env.OWNER_ANALYTICS_PASSWORD_HASH;
}

export async function dbSetOwnerAnalyticsPasswordHash(newHash: string): Promise<void> {
  const now = new Date().toISOString();
  await executeAtomicBatch([{
    sql: `INSERT INTO security_settings (key, value, updatedAt)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt`,
    args: ['analytics_owner_password_hash', newHash, now]
  }, { sql: 'DELETE FROM owner_step_up_grants', args: [] }]);
}

export async function dbLogSecurityAudit(
  eventType: string,
  ip: string,
  userAgent?: string | null,
  details?: Record<string, unknown> | null
): Promise<void> {
  try {
    const id = 'audit_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
    const now = new Date().toISOString();
    const detailsStr = details ? JSON.stringify(details) : null;
    await executeQuery(
      'INSERT INTO security_audit_logs (id, eventType, ip, userAgent, details, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      [id, eventType, ip, userAgent ? userAgent.slice(0, 500) : null, detailsStr, now]
    );
  } catch (err) {
    console.warn('[Security Audit Log Error]:', err);
  }
}

// ─── Stateful Session Revocation & Owner Step-Up Token Registry (v2) ──────────

export async function dbRevokeSession(sessionId: string, expiresAt: number): Promise<void> {
  if (!sessionId) return;
  const now = Date.now();
  try {
    await executeQuery(
      'INSERT OR REPLACE INTO revoked_sessions (sessionId, revokedAt, expiresAt) VALUES (?, ?, ?)',
      [sessionId, now, expiresAt]
    );
  } catch (err) {
    console.error('[dbRevokeSession Error]:', err);
    throw err;
  }
}

export async function dbIsSessionRevoked(sessionId: string): Promise<boolean> {
  if (!sessionId) return true;
  try {
    const rows = await executeQuery<{ cnt: number }>(
      'SELECT COUNT(*) as cnt FROM revoked_sessions WHERE sessionId = ?',
      [sessionId]
    );
    return (rows[0]?.cnt ?? 0) > 0;
  } catch (err) {
    console.error('[dbIsSessionRevoked Error]:', err);
    return true;
  }
}

export async function dbGrantOwnerStepUp(sessionId: string, expiresAt: number): Promise<void> {
  if (!sessionId) return;
  const now = Date.now();
  try {
    await executeQuery(
      'INSERT OR REPLACE INTO owner_step_up_grants (sessionId, unlockedAt, expiresAt) VALUES (?, ?, ?)',
      [sessionId, now, expiresAt]
    );
  } catch (err) {
    console.error('[dbGrantOwnerStepUp Error]:', err);
    throw err;
  }
}

export async function dbRevokeOwnerStepUp(sessionId: string): Promise<void> {
  if (!sessionId) return;
  try {
    await executeQuery(
      'DELETE FROM owner_step_up_grants WHERE sessionId = ?',
      [sessionId]
    );
  } catch (err) {
    console.error('[dbRevokeOwnerStepUp Error]:', err);
    throw err;
  }
}

export async function dbIsOwnerStepUpActive(sessionId: string): Promise<boolean> {
  if (!sessionId) return false;
  const now = Date.now();
  try {
    const rows = await executeQuery<{ cnt: number }>(
      'SELECT COUNT(*) as cnt FROM owner_step_up_grants WHERE sessionId = ? AND expiresAt > ?',
      [sessionId, now]
    );
    return (rows[0]?.cnt ?? 0) > 0;
  } catch (err) {
    console.error('[dbIsOwnerStepUpActive Error]:', err);
    return false;
  }
}

// ─── Idempotency Key Registry ─────────────────────────────────────────────────

export interface IdempotencyRecord {
  key: string;
  scope: string;
  statusCode: number;
  responseBody: any;
  createdAt: number;
  expiresAt: number;
}

export async function dbGetIdempotencyKey(
  key: string,
  scope: string
): Promise<{ statusCode: number; responseBody: any } | null> {
  if (!key) return null;
  const now = Date.now();
  try {
    const rows = await executeQuery<{ statusCode: number; responseBody: string; expiresAt: number }>(
      'SELECT statusCode, responseBody, expiresAt FROM idempotency_keys WHERE key = ? AND scope = ?',
      [key, scope]
    );
    if (rows.length > 0) {
      const row = rows[0];
      if (now < row.expiresAt) {
        return {
          statusCode: row.statusCode,
          responseBody: JSON.parse(row.responseBody),
        };
      } else {
        // Expired — delete asynchronously
        executeQuery('DELETE FROM idempotency_keys WHERE key = ?', [key]).catch(() => {});
      }
    }
  } catch (err) {
    console.warn('[dbGetIdempotencyKey Warning]:', err);
  }
  return null;
}

export async function dbSaveIdempotencyKey(
  key: string,
  scope: string,
  statusCode: number,
  responseBody: any,
  ttlSeconds: number = 86400 // 24 hours default
): Promise<void> {
  if (!key) return;
  const now = Date.now();
  const expiresAt = now + ttlSeconds * 1000;
  try {
    await executeQuery(
      `INSERT OR REPLACE INTO idempotency_keys (key, scope, statusCode, responseBody, createdAt, expiresAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [key, scope, statusCode, JSON.stringify(responseBody), now, expiresAt]
    );
  } catch (err) {
    console.warn('[dbSaveIdempotencyKey Warning]:', err);
  }
}

// ─── Patient Notes Helpers ────────────────────────────────────────────────────
export interface PatientNote {
  phone: string;
  patientName: string;
  content: string;
  tags: string;
  updatedAt: string;
}

export async function dbGetAllPatientNotes(): Promise<PatientNote[]> {
  return executeQuery<PatientNote>('SELECT * FROM patient_notes ORDER BY updatedAt DESC');
}

export async function dbGetPatientNote(phone: string): Promise<PatientNote | null> {
  const phoneValidation = validateAndNormalizePhone(phone);
  const normalizedPhone = phoneValidation.isValid ? phoneValidation.normalized : phone.trim();
  const rows = await executeQuery<PatientNote>('SELECT * FROM patient_notes WHERE phone = ? OR phone = ?', [phone, normalizedPhone]);
  return rows[0] ?? null;
}

export async function dbUpsertPatientNote(
  phone: string,
  patientName: string,
  content: string,
  tags: string
): Promise<PatientNote> {
  const now = new Date().toISOString();
  const normalizedPhone = requireNormalizedPhone(phone);
  const existing = await dbGetPatientNote(phone);

  if (existing) {
    await executeQuery(
      'UPDATE patient_notes SET patientName = ?, content = ?, tags = ?, updatedAt = ?, phone = ? WHERE phone = ?',
      [patientName, content, tags, now, normalizedPhone, existing.phone]
    );
  } else {
    await executeQuery(
      'INSERT INTO patient_notes (phone, patientName, content, tags, updatedAt) VALUES (?, ?, ?, ?, ?)',
      [normalizedPhone, patientName, content, tags, now]
    );
  }

  const updated = await dbGetPatientNote(normalizedPhone);
  return updated!;
}

export async function dbEnsurePatientNote(phone: string, patientName: string): Promise<PatientNote> {
  const normalizedPhone = requireNormalizedPhone(phone);
  const existing = await dbGetPatientNote(phone);
  if (existing) return existing;

  const now = new Date().toISOString();
  await executeQuery(
    'INSERT INTO patient_notes (phone, patientName, content, tags, updatedAt) VALUES (?, ?, \'\', \'\', ?)',
    [normalizedPhone, patientName, now]
  );
  return (await dbGetPatientNote(normalizedPhone))!;
}

export async function dbDeletePatientNote(phone: string): Promise<void> {
  const phoneValidation = validateAndNormalizePhone(phone);
  const normalizedPhone = phoneValidation.isValid ? phoneValidation.normalized : phone.trim();
  await executeQuery('DELETE FROM patient_notes WHERE phone = ? OR phone = ?', [phone, normalizedPhone]);
}

// ─── Structured Patient EMR Helpers ──────────────────────────────────────────
export async function dbGetAllPatients(): Promise<PatientRecord[]> {
  const patients = await executeQuery<PatientRecord>('SELECT * FROM patients ORDER BY updatedAt DESC');
  const allSessions = await executeQuery<PatientSession>(
    'SELECT * FROM patient_sessions ORDER BY date DESC, createdAt DESC'
  );

  const sessionsByPatient: Record<string, PatientSession[]> = {};
  for (const s of allSessions) {
    if (!sessionsByPatient[s.patientId]) sessionsByPatient[s.patientId] = [];
    sessionsByPatient[s.patientId].push(s);
  }

  return patients.map(p => ({
    ...p,
    sessions: sessionsByPatient[p.id] ?? [],
  }));
}

// The directory includes legacy-only records, but loads sessions only for one page.
export async function dbGetAdminRecordCounts() {
  const [patients, invoices, legacy] = await Promise.all([
    executeQuery<{n: number}>('SELECT COUNT(*) AS n FROM patients'),
    executeQuery<{n: number}>('SELECT COUNT(*) AS n FROM invoices'),
    executeQuery<{n: number}>(`SELECT COUNT(*) AS n FROM patient_notes WHERE substr(replace(replace(replace(replace(replace(phone, '+', ''), ' ', ''), '-', ''), '(', ''), ')', ''), -9) NOT IN (SELECT substr(replace(replace(replace(replace(replace(phone, '+', ''), ' ', ''), '-', ''), '(', ''), ')', ''), -9) FROM patients)`),
  ]);
  return {patients: Number(patients[0].n) + Number(legacy[0].n), invoices: Number(invoices[0].n)};
}

export async function dbGetPatientDirectory(options: {page: number; limit: number; search: string; coverageType: string}) {
  const phoneKey = (column: string) => `substr(replace(replace(replace(replace(replace(${column}, '+', ''), ' ', ''), '-', ''), '(', ''), ')', ''), -9)`;
  const directory = `WITH directory AS (
    SELECT id, patientName, phone, email, gender, dob, coverageType, coverageProvider, coverageNumber,
      referringDoctor, pathologyTags, medicalHistory, totalPrescribedSessions, createdAt, updatedAt,
      (SELECT count(*) FROM patient_sessions s WHERE s.patientId = p.id AND s.clinicalStatus='COMPLETED' AND s.archivedAt IS NULL) AS sessionCount
    FROM patients p
    UNION ALL
    SELECT 'legacy_' || n.phone, n.patientName, n.phone, NULL, NULL, NULL, 'PARTICULAR', NULL, NULL,
      NULL, n.tags, n.content, 10, n.updatedAt, n.updatedAt, 0
    FROM patient_notes n WHERE ${phoneKey('n.phone')} NOT IN (SELECT ${phoneKey('p.phone')} FROM patients p)
  )`;
  const insurance = "(coverageType IN ('INSURANCE', 'ADSE') OR length(trim(coalesce(coverageProvider, ''))) > 0)";
  const particular = "(coverageType IS NULL OR coverageType = 'PARTICULAR')";
  const where: string[] = [];
  const args: string[] = [];
  if (options.search.trim()) {
    where.push('(patientName LIKE ? OR phone LIKE ? OR pathologyTags LIKE ? OR coverageProvider LIKE ? OR referringDoctor LIKE ? OR email LIKE ? OR coverageNumber LIKE ?)');
    args.push(...Array(7).fill('%' + options.search.trim() + '%'));
  }
  if (options.coverageType === 'INSURANCE') where.push(insurance);
  if (options.coverageType === 'PARTICULAR') where.push(particular);
  if (options.coverageType === 'ACTIVE_SESSIONS') where.push('sessionCount > 0');
  const filter = where.length ? ' WHERE ' + where.join(' AND ') : '';
  const [count, counts] = await Promise.all([
    executeQuery<{total: number}>(directory + ' SELECT COUNT(*) AS total FROM directory' + filter, args),
    executeQuery<{all: number; insurance: number; particular: number; withSessions: number}>(directory + ` SELECT COUNT(*) AS 'all', coalesce(sum(${insurance}), 0) AS insurance, coalesce(sum(${particular}), 0) AS particular, coalesce(sum(sessionCount > 0), 0) AS withSessions FROM directory`),
  ]);
  const total = Number(count[0]?.total || 0);
  const totalPages = Math.max(1, Math.ceil(total / options.limit));
  const page = Math.min(options.page, totalPages);
  const patients = await executeQuery<PatientRecord>(directory + ' SELECT * FROM directory' + filter + ' ORDER BY updatedAt DESC, id ASC LIMIT ? OFFSET ?', [...args, options.limit, (page - 1) * options.limit]);
  return {patients, notes: [], total, page, limit: options.limit, totalPages, counts: counts[0]};
}

export async function dbGetPatientsPaginated(options: {
  page?: number;
  limit?: number;
  search?: string;
  coverageType?: string;
}): Promise<{
  patients: PatientRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(options.limit) || 10));
  const offset = (page - 1) * limit;

  const whereClauses: string[] = [];
  const queryArgs: any[] = [];

  if (options.search && options.search.trim()) {
    const q = `%${options.search.trim()}%`;
    whereClauses.push('(patientName LIKE ? OR phone LIKE ? OR pathologyTags LIKE ? OR coverageProvider LIKE ? OR referringDoctor LIKE ?)');
    queryArgs.push(q, q, q, q, q);
  }

  if (options.coverageType && options.coverageType !== 'ALL') {
    if (options.coverageType === 'INSURANCE_OR_ADSE') {
      whereClauses.push('(coverageType = ? OR coverageType = ?)');
      queryArgs.push('INSURANCE', 'ADSE');
    } else {
      whereClauses.push('coverageType = ?');
      queryArgs.push(options.coverageType);
    }
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countRows = await executeQuery<{ count: number }>(
    `SELECT COUNT(*) as count FROM patients ${whereSql}`,
    queryArgs
  );
  const total = Number(countRows[0]?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const patients = await executeQuery<PatientRecord>(
    `SELECT * FROM patients ${whereSql} ORDER BY updatedAt DESC LIMIT ? OFFSET ?`,
    [...queryArgs, limit, offset]
  );

  if (patients.length === 0) {
    return {
      patients: [],
      total,
      page,
      limit,
      totalPages,
    };
  }

  // Load sessions specifically for these page patients only
  const patientIds = patients.map(p => p.id);
  const placeholders = patientIds.map(() => '?').join(',');
  const sessions = await executeQuery<PatientSession>(
    `SELECT * FROM patient_sessions WHERE patientId IN (${placeholders}) ORDER BY date DESC, createdAt DESC`,
    patientIds
  );

  const sessionsByPatient: Record<string, PatientSession[]> = {};
  for (const s of sessions) {
    if (!sessionsByPatient[s.patientId]) sessionsByPatient[s.patientId] = [];
    sessionsByPatient[s.patientId].push(s);
  }

  const enrichedPatients = patients.map(p => ({
    ...p,
    sessions: sessionsByPatient[p.id] ?? [],
  }));

  return {
    patients: enrichedPatients,
    total,
    page,
    limit,
    totalPages,
  };
}

export async function dbGetPatientById(id: string): Promise<PatientRecord | null> {
  const rows = await executeQuery<PatientRecord>('SELECT * FROM patients WHERE id = ?', [id]);
  const patient = rows[0];
  if (!patient) return null;

  const sessions = await executeQuery<PatientSession>(
    'SELECT * FROM patient_sessions WHERE patientId = ? ORDER BY date DESC, createdAt DESC',
    [id]
  );
  return { ...patient, sessions };
}

export async function dbGetPatientByPhone(phone: string): Promise<PatientRecord | null> {
  const phoneValidation = validateAndNormalizePhone(phone);
  const normalizedPhone = phoneValidation.isValid ? phoneValidation.normalized : phone.trim();
  const rows = await executeQuery<PatientRecord>('SELECT * FROM patients WHERE phone = ? OR phone = ?', [phone, normalizedPhone]);
  const patient = rows[0];
  if (!patient) return null;

  const sessions = await executeQuery<PatientSession>(
    'SELECT * FROM patient_sessions WHERE patientId = ? ORDER BY date DESC, createdAt DESC',
    [patient.id]
  );
  return { ...patient, sessions };
}

export async function dbEnsureBookingPatient(input: Parameters<typeof dbUpsertPatient>[0]): Promise<PatientRecord> {
  const existing = await dbGetPatientByPhone(input.phone);
  if (existing) return existing;
  try { return await dbUpsertPatient(input); }
  catch (error) {
    if (/UNIQUE.*patients.phone/i.test(String(error)) || (error instanceof PatientWriteError && error.code === 'PATIENT_PHONE_CONFLICT')) {
      const concurrent = await dbGetPatientByPhone(input.phone);
      if (concurrent) return concurrent;
    }
    throw error;
  }
}

export class PatientWriteError extends Error {
  constructor(public code: 'PATIENT_PHONE_CONFLICT' | 'PATIENT_NOT_FOUND' | 'PATIENT_CHANGED' | 'PATIENT_HAS_HISTORY') {
    super(code === 'PATIENT_HAS_HISTORY' ? 'Esta ficha contém histórico e não pode ser eliminada. Os registos foram preservados.' : code === 'PATIENT_PHONE_CONFLICT'
      ? 'Este telefone já está associado a uma ficha. Abra a ficha existente para editar; não foi criado nem alterado nenhum utente.'
      : code === 'PATIENT_CHANGED' ? 'A ficha foi alterada por outro utilizador. Atualize antes de guardar.' : 'A ficha do utente já não existe. Atualize a lista.');
  }
}

export async function dbAssertLegacyIdentity(phone:string,patientName:string):Promise<void> {
  const validation=validateAndNormalizePhone(phone);
  const normalized=validation.isValid?validation.normalized:phone.trim();
  const rows=await executeQuery<{patientName:string}>(`SELECT patientName FROM patient_notes WHERE phone IN(?,?)
    UNION SELECT patientName FROM appointments WHERE patientId IS NULL AND phone IN(?,?)
    UNION SELECT patientName FROM invoices WHERE patientId IS NULL AND patientPhone IN(?,?)
    UNION SELECT patientName FROM prescriptions WHERE patientId IS NULL AND patientPhone IN(?,?)`,[phone,normalized,phone,normalized,phone,normalized,phone,normalized]);
  const normalize=(s:string)=>s.normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase();
  if(rows.some(row=>normalize(row.patientName)!==normalize(patientName))) throw new PatientWriteError('PATIENT_PHONE_CONFLICT');
}

export async function dbUpsertPatient(input: {
  id?: string;
  legacyPhone?: string;
  patientName: string;
  phone: string;
  email?: string | null;
  gender?: string | null;
  dob?: string | null;
  coverageType?: string | null;
  coverageProvider?: string | null;
  coverageNumber?: string | null;
  referringDoctor?: string | null;
  pathologyTags?: string;
  medicalHistory?: string;
  totalPrescribedSessions?: number;
}): Promise<PatientRecord> {
  const now = new Date().toISOString();
  const normalizedPhone = requireNormalizedPhone(input.phone);

  const existing = input.id ? await dbGetPatientById(input.id) : null;
  if (input.id && !existing) throw new PatientWriteError('PATIENT_NOT_FOUND');
  const phoneOwner = await dbGetPatientByPhone(normalizedPhone);
  if (phoneOwner && phoneOwner.id !== existing?.id) throw new PatientWriteError('PATIENT_PHONE_CONFLICT');
  const legacyPhone = input.legacyPhone ? requireNormalizedPhone(input.legacyPhone) : undefined;
  if (existing && legacyPhone) throw new PatientWriteError('PATIENT_PHONE_CONFLICT');
  const previousPhone = existing?.phone ?? legacyPhone ?? normalizedPhone;
  const previousValidation = validateAndNormalizePhone(previousPhone);
  const previousNormalizedPhone = previousValidation.isValid ? previousValidation.normalized : previousPhone.trim();
  if (previousNormalizedPhone !== normalizedPhone && await dbGetPatientNote(normalizedPhone)) throw new PatientWriteError('PATIENT_PHONE_CONFLICT');
  const legacyNote = await dbGetPatientNote(previousPhone);
  if (!existing && legacyNote && !legacyPhone) throw new PatientWriteError('PATIENT_PHONE_CONFLICT');
  await dbAssertLegacyIdentity(previousPhone,existing?.patientName??input.patientName);
  if (legacyPhone && (!legacyNote || await dbGetPatientByPhone(legacyPhone))) throw new PatientWriteError('PATIENT_CHANGED');
  const id = existing?.id ?? input.id ?? ('pat_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6));
  const medicalHistory = input.medicalHistory ?? existing?.medicalHistory ?? legacyNote?.content ?? '';
  const pathologyTags = input.pathologyTags ?? existing?.pathologyTags ?? legacyNote?.tags ?? '';
  const statements: {sql: string; args: any[]}[] = [];

  // Bind phone-only legacy rows before a contact changes; document snapshots stay
  // unchanged, and rows already assigned to another patient are never claimed.
  for (const [table, column] of [['appointments','phone'], ['invoices','patientPhone'], ['prescriptions','patientPhone']]) {
    statements.push({sql:`UPDATE ${table} SET patientId=? WHERE patientId IS NULL AND (${column}=? OR ${column}=?)`,args:[id,previousPhone,previousNormalizedPhone]});
  }

  const covType = input.coverageType ?? (existing as any)?.coverageType ?? 'PARTICULAR';
  const covProv = input.coverageProvider !== undefined ? input.coverageProvider : existing?.coverageProvider ?? null;
  const covNum = input.coverageNumber !== undefined ? input.coverageNumber : existing?.coverageNumber ?? null;

  if (existing) {
    statements.push({sql: `UPDATE patients SET
        patientName = ?, phone = ?, email = ?, gender = ?, dob = ?,
        coverageType = ?, coverageProvider = ?, coverageNumber = ?, referringDoctor = ?, pathologyTags = ?,
        medicalHistory = ?, totalPrescribedSessions = ?, updatedAt = ?
       WHERE id = ?`, args: [
        input.patientName,
        normalizedPhone,
        input.email !== undefined ? input.email : existing.email ?? null,
        input.gender !== undefined ? input.gender : existing.gender ?? null,
        input.dob !== undefined ? input.dob : existing.dob ?? null,
        covType,
        covProv,
        covNum,
        input.referringDoctor !== undefined ? input.referringDoctor : existing.referringDoctor ?? null,
        pathologyTags,
        medicalHistory,
        input.totalPrescribedSessions ?? existing.totalPrescribedSessions ?? 10,
        now,
        id,
      ]});
  } else {
    statements.push({sql: `INSERT INTO patients (
        id, patientName, phone, email, gender, dob, coverageType, coverageProvider, coverageNumber,
        referringDoctor, pathologyTags, medicalHistory, totalPrescribedSessions, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, args: [
        id,
        input.patientName,
        normalizedPhone,
        input.email ?? null,
        input.gender ?? null,
        input.dob ?? null,
        covType,
        covProv,
        covNum,
        input.referringDoctor ?? null,
        pathologyTags,
        medicalHistory,
        input.totalPrescribedSessions ?? 10,
        now,
        now,
      ]});
  }
  if (legacyNote && previousPhone !== normalizedPhone) {
    statements.push({sql:'DELETE FROM patient_notes WHERE phone=? OR phone=?',args:[previousPhone,previousNormalizedPhone]});
  }
  statements.push({sql:`INSERT INTO patient_notes(phone,patientName,content,tags,updatedAt) VALUES(?,?,?,?,?)
    ON CONFLICT(phone) DO UPDATE SET patientName=excluded.patientName,content=excluded.content,tags=excluded.tags,updatedAt=excluded.updatedAt`,args:[normalizedPhone,input.patientName,medicalHistory,pathologyTags,now]});
  try {
    if (existing) {
      const saved = await executeConditionalBatch({sql:'SELECT id FROM patients WHERE id=? AND phone=? AND updatedAt=?',args:[id,existing.phone,existing.updatedAt]}, statements);
      if (!saved) throw new PatientWriteError('PATIENT_CHANGED');
    } else if (legacyPhone && legacyNote) {
      const saved = await executeConditionalBatch({sql:'SELECT phone FROM patient_notes WHERE phone=? AND updatedAt=? AND NOT EXISTS(SELECT id FROM patients WHERE phone=?)',args:[legacyNote.phone,legacyNote.updatedAt,legacyPhone]}, statements);
      if (!saved) throw new PatientWriteError('PATIENT_CHANGED');
    } else await executeAtomicBatch(statements);
  }
  catch (error) {
    if (/UNIQUE.*patients.phone/i.test(String(error))) throw new PatientWriteError('PATIENT_PHONE_CONFLICT');
    throw error;
  }
  return (await dbGetPatientById(id))!;
}

export async function dbDeletePatientRecord(idOrPhone: string): Promise<void> {
  const p = (await dbGetPatientById(idOrPhone)) ?? (await dbGetPatientByPhone(idOrPhone));
  const phone=p?.phone??idOrPhone,validation=validateAndNormalizePhone(phone);
  const normalized=validation.isValid?validation.normalized:phone.trim(),id=p?.id??'';
  // Only empty administrative shells can be deleted. Check and delete in the
  // same write transaction so a newly linked record cannot be lost in a race.
  const clauses=[
    ...['appointments','invoices','prescriptions'].map(table=>`NOT EXISTS(SELECT 1 FROM ${table} WHERE patientId=? OR ${table==='appointments'?'phone':'patientPhone'} IN(?,?))`),
    'NOT EXISTS(SELECT 1 FROM patient_sessions WHERE patientId=?)',
    'NOT EXISTS(SELECT 1 FROM clinical_session_revisions WHERE patientId=?)',
    "NOT EXISTS(SELECT 1 FROM patient_notes WHERE phone IN(?,?) AND (TRIM(COALESCE(content,''))!='' OR TRIM(COALESCE(tags,''))!=''))",
    "NOT EXISTS(SELECT 1 FROM patients WHERE id=? AND (TRIM(COALESCE(medicalHistory,''))!='' OR TRIM(COALESCE(pathologyTags,''))!=''))",
  ];
  const args=[id,phone,normalized,id,phone,normalized,id,phone,normalized,id,id,phone,normalized,id];
  const saved=await executeConditionalBatch({sql:'SELECT 1 WHERE '+clauses.join(' AND '),args},[
    {sql:'DELETE FROM patient_notes WHERE phone IN(?,?)',args:[phone,normalized]},
    {sql:'DELETE FROM patients WHERE id=?',args:[id]},
  ]);
  if(!saved)throw new PatientWriteError('PATIENT_HAS_HISTORY');
}

export async function dbAddPatientSession(input: {
  patientId: string; date: string; time?: string | null; serviceSlug?: string; evaPainScore?: number | null;
  appointmentId?: string; clinicalStatus?: 'PLANNED' | 'COMPLETED'; actorSessionId?: string;
  sessionType?: 'ONLINE' | 'MANUAL' | 'PAPER'; notes?: string | null; practitioner?: string | null; practitionerId?: string;
}): Promise<PatientSession> {
  const {todayStr,currentHHMM}=getLisbonDateTime();
  const future = input.date>todayStr || (input.date===todayStr && !!input.time && input.time>currentHHMM);
  const clinicalStatus = input.clinicalStatus ?? (future ? 'PLANNED' : 'COMPLETED');
  if (!validEva(input.evaPainScore ?? null)) throw new ClinicalError('INVALID_EVA','EVA must be null or an integer from 0 to 10.');
  if (future && clinicalStatus==='COMPLETED') throw new ClinicalError('FUTURE_SESSION','A future visit cannot be completed.');
  if (clinicalStatus!=='COMPLETED' && input.evaPainScore!=null) throw new ClinicalError('UNMEASURED_SESSION','Only a completed session can have a measured EVA.');
  if (!await dbGetPatientById(input.patientId)) throw new ClinicalError('PATIENT_NOT_FOUND','Patient not found.',404);
  let appointmentVersion:number|undefined;
  if (input.appointmentId) {
    const appointment = await dbGetAppointmentById(input.appointmentId);
    if (!appointment || appointment.patientId!==input.patientId) throw new ClinicalError('APPOINTMENT_MISMATCH','Appointment does not belong to this patient.',422);
    if (['CANCELLED','NO_SHOW'].includes(appointment.status)) throw new ClinicalError('INACTIVE_APPOINTMENT','This appointment cannot be documented as completed.');
    if (clinicalStatus==='COMPLETED' && (appointment.date>todayStr || (appointment.date===todayStr && appointment.startTime>currentHHMM))) throw new ClinicalError('FUTURE_SESSION','A future visit cannot be completed.');
    if (appointment.date!==input.date || (input.time && appointment.startTime!==input.time) || (input.serviceSlug && appointment.service!==input.serviceSlug) || (input.practitionerId && appointment.practitionerId!==input.practitionerId)) throw new ClinicalError('APPOINTMENT_MISMATCH','Use the appointment date, service and practitioner.');
    const linked = (await executeQuery<PatientSession>('SELECT * FROM patient_sessions WHERE appointmentId=?',[appointment.id]))[0];
    if (linked) throw new ClinicalError('CLINICAL_RECORD_EXISTS','This appointment already has a clinical record. Open it to complete or edit it.',409);
    appointmentVersion=appointment.version;
    input={...input,time:appointment.startTime,practitionerId:appointment.practitionerId,serviceSlug:appointment.service};
  } else if(input.time && future) {
    const patient=await dbGetPatientById(input.patientId);if(!patient)throw Error('Patient not found');
    const result=await dbCreateMultipleAppointments({patientId:patient.id,patientName:patient.patientName,phone:patient.phone,email:patient.email??undefined,service:input.serviceSlug??'',practitionerId:input.practitionerId,sessionType:input.sessionType,sessions:[{date:input.date,startTime:input.time,notes:input.notes??undefined}]});
    if(!result.success)throw Error('slot_taken: '+result.message);
    return result.patientSessions[0];
  }
  if(!input.serviceSlug || (!input.appointmentId && !(await getTreatments()).some(t=>t.slug===input.serviceSlug))) throw new ClinicalError('INVALID_SERVICE','Choose an existing treatment.');
  const id='sess_'+crypto.randomUUID(),now=new Date().toISOString();
  const practitioner=input.practitionerId?(await executeQuery<{name:string}>('SELECT name FROM practitioners WHERE id=?',[input.practitionerId]))[0]:null;
  if(input.practitionerId&&!practitioner)throw Error('invalid_practitioner');
  const statements = [
    {sql:'INSERT INTO patient_sessions(id,patientId,date,time,serviceSlug,evaPainScore,sessionType,notes,practitioner,practitionerId,appointmentId,clinicalStatus,completedAt,createdAt) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)',args:[id,input.patientId,input.date,input.time??null,input.serviceSlug??'',input.evaPainScore??null,input.sessionType??'MANUAL',input.notes??null,practitioner?.name??input.practitioner??null,input.practitionerId??null,input.appointmentId??null,clinicalStatus,clinicalStatus==='COMPLETED'?now:null,now]},
    {sql:'UPDATE patients SET updatedAt=? WHERE id=?',args:[now,input.patientId]},
  ];
  if (input.appointmentId && clinicalStatus==='COMPLETED') statements.push({sql:"UPDATE appointments SET status='COMPLETED',version=version+1,updatedAt=? WHERE id=?",args:[now,input.appointmentId]});
  if (input.appointmentId) {
    const saved = await executeConditionalBatch({sql:"SELECT id FROM appointments WHERE id=? AND patientId=? AND version=? AND archivedAt IS NULL AND status NOT IN('CANCELLED','NO_SHOW') AND NOT EXISTS(SELECT 1 FROM patient_sessions WHERE appointmentId=?)",args:[input.appointmentId,input.patientId,appointmentVersion,input.appointmentId]},statements);
    if (!saved) throw new ClinicalError('CLINICAL_RECORD_EXISTS','The appointment changed. Refresh the record.',409);
  } else await executeAtomicBatch(statements);
  return (await dbGetPatientSessionById(id))!;
}

export async function dbGetPatientSessionById(sessionId: string): Promise<PatientSession | null> {
  const rows = await executeQuery<PatientSession>('SELECT * FROM patient_sessions WHERE id = ?', [sessionId]);
  return rows[0] || null;
}

export async function dbDeletePatientSession(sessionId: string, patientId?: string, actorSessionId?:string): Promise<boolean> {
  const existing = await dbGetPatientSessionById(sessionId);
  if (!existing || existing.archivedAt || (patientId && existing.patientId!==patientId)) return false;
  const now=new Date().toISOString();
  const statements=[
    {sql:'UPDATE patient_sessions SET archivedAt=?,version=version+1 WHERE id=?',args:[now,sessionId]},
    {sql:'INSERT INTO clinical_session_revisions(id,sessionId,patientId,beforeJson,createdAt,actor) VALUES(?,?,?,?,?,?)',args:[crypto.randomUUID(),sessionId,existing.patientId,JSON.stringify(existing),now,actorSessionId?createHash('sha256').update(actorSessionId).digest('hex'):null]},
  ];
  if(existing.appointmentId) statements.push({sql:"UPDATE appointments SET archivedAt=?,archivedStatus=status,status='CANCELLED',updatedAt=?,version=version+1 WHERE id=? AND archivedAt IS NULL",args:[now,now,existing.appointmentId]});
  if(!await executeConditionalBatch({sql:'SELECT id FROM patient_sessions WHERE id=? AND version=? AND archivedAt IS NULL',args:[sessionId,existing.version]},statements)) throw new ClinicalError('SESSION_CHANGED','The session changed. Refresh before archiving.',409);
  return true;
}

export async function dbUpdatePatientSession(
  sessionId: string,
  updates: {
    evaPainScore?: number | null;
    notes?: string | null;
    expectedVersion?: number;
    clinicalStatus?: 'PLANNED' | 'COMPLETED';
    actorSessionId?: string;
  },
  patientId?: string
): Promise<PatientSession | null> {
  const existing = await dbGetPatientSessionById(sessionId);
  if (!existing || existing.archivedAt || (patientId && existing.patientId!==patientId)) return null;
  if (!Number.isInteger(updates.expectedVersion)) throw new ClinicalError('VERSION_REQUIRED','Reload the session before saving.',428);
  if (updates.expectedVersion!==existing.version) throw new ClinicalError('SESSION_CHANGED','Another user changed this session. Reload and compare your changes.',409);
  if (updates.evaPainScore!==undefined && !validEva(updates.evaPainScore)) throw new ClinicalError('INVALID_EVA','EVA must be null or an integer from 0 to 10.');
  const clinicalStatus=updates.clinicalStatus??existing.clinicalStatus;
  const eva=updates.evaPainScore===undefined?existing.evaPainScore:updates.evaPainScore;
  const {todayStr,currentHHMM}=getLisbonDateTime();
  if (clinicalStatus==='COMPLETED' && (existing.date>todayStr || (existing.date===todayStr && !!existing.time && existing.time>currentHHMM))) throw new ClinicalError('FUTURE_SESSION','A future visit cannot be completed.');
  if (clinicalStatus!=='COMPLETED' && eva!==null) throw new ClinicalError('UNMEASURED_SESSION','Complete the session before recording an EVA measurement.');
  const appointment=existing.appointmentId?await dbGetAppointmentById(existing.appointmentId):null;
  if (existing.appointmentId && clinicalStatus==='COMPLETED' && (!appointment || ['CANCELLED','NO_SHOW'].includes(appointment.status))) throw new ClinicalError('INACTIVE_APPOINTMENT','The appointment is cancelled, archived or not attended.');
  const now=new Date().toISOString();
  const statements = [
    {sql:'UPDATE patient_sessions SET evaPainScore=?,notes=?,clinicalStatus=?,completedAt=?,version=version+1 WHERE id=?',args:[eva,updates.notes===undefined?existing.notes:updates.notes,clinicalStatus,clinicalStatus==='COMPLETED'?(existing.completedAt??now):null,sessionId]},
    {sql:'INSERT INTO clinical_session_revisions(id,sessionId,patientId,beforeJson,createdAt,actor) VALUES(?,?,?,?,?,?)',args:[crypto.randomUUID(),sessionId,existing.patientId,JSON.stringify(existing),now,updates.actorSessionId?createHash('sha256').update(updates.actorSessionId).digest('hex'):null]},
  ];
  if (appointment && clinicalStatus==='COMPLETED') statements.push({sql:"UPDATE appointments SET status='COMPLETED',version=version+1,updatedAt=? WHERE id=?",args:[now,appointment.id]});
  const guard=appointment?{sql:"SELECT s.id FROM patient_sessions s JOIN appointments a ON a.id=s.appointmentId WHERE s.id=? AND s.version=? AND a.version=? AND s.archivedAt IS NULL",args:[sessionId,existing.version,appointment.version]}:{sql:'SELECT id FROM patient_sessions WHERE id=? AND version=? AND archivedAt IS NULL',args:[sessionId,existing.version]};
  if (!await executeConditionalBatch(guard,statements)) throw new ClinicalError('SESSION_CHANGED','The session or appointment changed. Reload before saving.',409);
  return dbGetPatientSessionById(sessionId);
}

export async function dbBulkBlockSlots(date: string, times: string[], action: 'block' | 'unblock', practitionerId = '*'): Promise<void> {
  await executeAtomicBatch(times.map(time => action === 'block'
    ? { sql: 'INSERT OR IGNORE INTO blocked_slots (id, date, time, practitionerId) VALUES (?, ?, ?, ?)', args: ['blk_' + crypto.randomUUID(), date, time, practitionerId] }
    : { sql: 'DELETE FROM blocked_slots WHERE date = ? AND time = ? AND practitionerId = ?', args: [date, time, practitionerId] }));
}

export async function dbGetBackupStatus(): Promise<{ lastBackupDate: string | null; backupCount: number; dbSizeBytes: number }> {
  const BACKUP_DIR = path.join(process.cwd(), 'data', 'backups');
  let lastBackupDate: string | null = null;
  let backupCount = 0;

  try {
    if (fs.existsSync(BACKUP_DIR)) {
      const files = fs
        .readdirSync(BACKUP_DIR)
        .filter(f => f.startsWith('ryma_backup_') && f.endsWith('.db'))
        .map(f => ({ name: f, time: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs }))
        .sort((a, b) => b.time - a.time);

      backupCount = files.length;
      if (files.length > 0) {
        lastBackupDate = new Date(files[0].time).toISOString();
      }
    }
  } catch {
    /* silent */
  }

  let dbSizeBytes = 0;
  try {
    const currentDbPath = resolveDbPath();
    if (fs.existsSync(/*turbopackIgnore: true*/ currentDbPath)) {
      dbSizeBytes = fs.statSync(/*turbopackIgnore: true*/ currentDbPath).size;
    }
  } catch {
    /* silent */
  }

  return { lastBackupDate, backupCount, dbSizeBytes };
}

export async function dbGetNoShowCounts(): Promise<Record<string, number>> {
  // Limit to the past 12 months — older cancellations are not clinically relevant
  // for current scheduling decisions and increase query cost unnecessarily.
  // Only include patients with ≥2 no-shows/cancellations to avoid flagging one-off cases.
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const cutoffDate = oneYearAgo.toISOString().split('T')[0];

  const rows = await executeQuery<{ phone: string; cnt: number }>(`
    SELECT phone, COUNT(*) as cnt
    FROM appointments
    WHERE archivedAt IS NULL AND status IN ('CANCELLED', 'NO_SHOW')
      AND date >= ?
    GROUP BY phone
    HAVING cnt >= 2
  `, [cutoffDate]);

  const map: Record<string, number> = {};
  rows.forEach(r => {
    map[r.phone] = Number(r.cnt);
  });
  return map;
}

// ─── Portuguese Medical Invoicing Helpers ─────────────────────────────────────

export async function dbGenerateInvoiceNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `FT ${currentYear}/`;
  
  let nextSeq = 1;
  try {
    const existing = await executeQuery<{ lastSequence: number }>(
      'SELECT lastSequence FROM invoice_sequences WHERE year = ?',
      [currentYear]
    );

    if (existing.length === 0) {
      // Find current highest sequence in invoices table for this year
      const maxRow = await executeQuery<{ invoiceNumber: string }>(
        `SELECT invoiceNumber FROM invoices WHERE invoiceNumber LIKE ? ORDER BY LENGTH(invoiceNumber) DESC, invoiceNumber DESC LIMIT 1`,
        [`%${currentYear}/%`]
      );
      let startingSeq = 0;
      if (maxRow.length > 0 && maxRow[0]?.invoiceNumber) {
        const parts = maxRow[0].invoiceNumber.split('/');
        if (parts[1]) {
          const parsed = parseInt(parts[1], 10);
          if (!isNaN(parsed)) startingSeq = parsed;
        }
      }
      await executeQuery(
        'INSERT OR IGNORE INTO invoice_sequences (year, lastSequence) VALUES (?, ?)',
        [currentYear, startingSeq]
      );
    }

    // Atomic increment
    const updated = await executeQuery<{ lastSequence: number }>(
      'UPDATE invoice_sequences SET lastSequence = lastSequence + 1 WHERE year = ? RETURNING lastSequence',
      [currentYear]
    );

    if (updated.length > 0 && typeof updated[0]?.lastSequence === 'number') {
      nextSeq = updated[0].lastSequence;
    } else {
      const fallbackRow = await executeQuery<{ lastSequence: number }>(
        'SELECT lastSequence FROM invoice_sequences WHERE year = ?',
        [currentYear]
      );
      nextSeq = fallbackRow[0]?.lastSequence || 1;
    }
  } catch (seqErr) {
    console.warn('[dbGenerateInvoiceNumber Sequence Warning, falling back to MAX query]:', seqErr);
    const rows = await executeQuery<{ invoiceNumber: string }>(
      `SELECT invoiceNumber FROM invoices WHERE invoiceNumber LIKE ? ORDER BY LENGTH(invoiceNumber) DESC, invoiceNumber DESC LIMIT 1`,
      [`${prefix}%`]
    );
    if (rows.length > 0 && rows[0]?.invoiceNumber) {
      const parts = rows[0].invoiceNumber.split('/');
      if (parts[1]) {
        const parsed = parseInt(parts[1], 10);
        if (!isNaN(parsed)) nextSeq = parsed + 1;
      }
    }
  }

  const padded = String(nextSeq).padStart(4, '0');
  return `${prefix}${padded}`;
}

async function documentPractitioner(practitionerId?: string, appointmentId?: string): Promise<{id:string;name:string}> {
  if(appointmentId){const appointment=await dbGetAppointmentById(appointmentId); if(!appointment || (practitionerId && practitionerId!==appointment.practitionerId))throw new DocumentError('The appointment and practitioner do not match.'); return {id:appointment.practitionerId,name:appointment.practitionerName};}
  const candidates=await executeQuery<{id:string;name:string}>('SELECT id,name FROM practitioners WHERE active=1'+(practitionerId?' AND id=?':''),practitionerId?[practitionerId]:[]);
  if(candidates.length!==1)throw new DocumentError('Choose an active practitioner');
  return candidates[0];
}

export class DocumentError extends Error {}
async function documentPatient(input:{patientId?:string;patientPhone:string;patientName:string;appointmentId?:string;serviceSlug?:string}) {
  const appointment=input.appointmentId?await dbGetAppointmentById(input.appointmentId):null;
  if (input.appointmentId && !appointment) throw new DocumentError('Appointment not found.');
  const id=input.patientId || appointment?.patientId;
  const patient=id?await dbGetPatientById(id):await dbGetPatientByPhone(input.patientPhone);
  if (id && !patient) throw new DocumentError('Patient not found.');
  if (appointment && (appointment.patientId!==patient?.id || input.serviceSlug!==appointment.service)) throw new DocumentError('The patient or treatment does not match this appointment.');
  const name=(s:string)=>s.normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase();
  if (patient && (!phonesMatch(patient.phone,input.patientPhone) || name(patient.patientName)!==name(input.patientName))) throw new DocumentError('The patient name and phone do not match the selected record. Refresh the patient details.');
  if (!patient) {try {await dbAssertLegacyIdentity(input.patientPhone,input.patientName);}catch(error){if(!(error instanceof PatientWriteError))throw error;throw new DocumentError('This contact has legacy records with a different identity. Review the patient record first.');}}
  return patient;
}

export async function dbCreateInvoice(input: CreateInvoiceInput, idempotencyKey?: string): Promise<Invoice> {
  const normalizedPhone = requireNormalizedPhone(input.patientPhone);
  let amountCents:number;
  try { amountCents=toCents(input.amount); } catch { throw new DocumentError('Amount must use at most two decimal places.'); }
  if (amountCents<=0 || amountCents>5000000) throw new DocumentError('Invalid invoice amount.');
  const requestHash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
  const dedupeKey = idempotencyKey ? 'invoice:' + idempotencyKey : undefined;
  const findExisting = async (): Promise<Invoice | null> => {
    if (!dedupeKey) return null;
    const rows = await executeQuery<{responseBody: string}>('SELECT responseBody FROM idempotency_keys WHERE key = ? AND scope = ?', [dedupeKey, 'admin_invoice']);
    if (!rows.length) return null;
    const saved = JSON.parse(rows[0].responseBody);
    if (saved.requestHash !== requestHash) throw new Error('idempotency_conflict');
    const existing = await dbGetInvoiceById(saved.invoiceId);
    if (!existing) throw new Error('idempotency_record_missing');
    return existing;
  };
  const existing = await findExisting();
  if (existing) return existing;

  const patient=await documentPatient(input);
  input={...input,patientId:patient?.id??input.patientId,patientName:patient?.patientName??input.patientName};
  const author=await documentPractitioner(input.practitionerId,input.appointmentId);
  const treatment=(await getTreatments()).find(t=>t.slug===input.serviceSlug);
  const appointment=input.appointmentId?await dbGetAppointmentById(input.appointmentId):null;
  if(!treatment&&!appointment)throw new DocumentError('Choose an existing treatment or a historical appointment.');
  const servicePole=appointment?.servicePole??treatment?.pole??'kinesitherapie';
  const isKineService=servicePole!=='minceur';

  const defaultVatRate = input.vatRate !== undefined ? input.vatRate : (isKineService ? 0 : 23);
  const defaultExemption = defaultVatRate === 0
    ? (input.vatExemptionReason || 'Isento de IVA - Artigo 9.º do CIVA')
    : null;

  const paymentStatus = input.paymentStatus || 'PAID';

  let lastError: any = null;
  for (let attempt = 1; attempt <= 10; attempt++) {
    const id = 'inv_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    const now = new Date().toISOString();
    const paidAt = paymentStatus === 'PAID' ? now : null;
    const invoiceNumber = await dbGenerateInvoiceNumber();

    try {
      const statements = [{ sql: `INSERT INTO invoices (
          id, invoiceNumber, appointmentId, patientId, patientName, patientNif,
          patientEmail, patientPhone, patientAddress, coverageType, coverageProvider, coverageNumber,
          serviceSlug, serviceName, servicePole, practitioner, practitionerId, amount, vatRate, vatExemptionReason,
          paymentMethod, paymentStatus, paidAt, notes, createdAt, updatedAt, amountCents
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          invoiceNumber,
          input.appointmentId || null,
          input.patientId || null,
          input.patientName.trim(),
          input.patientNif?.trim() || '999999990',
          input.patientEmail?.trim() || null,
          normalizedPhone,
          input.patientAddress?.trim() || 'Lisboa, Portugal',
          input.coverageType || 'PARTICULAR',
          input.coverageProvider?.trim() || null,
          input.coverageNumber?.trim() || null,
          input.serviceSlug,
          input.serviceName || input.serviceSlug,
          servicePole,
          author.name,
          author.id,
          amountCents / 100,
          defaultVatRate,
          defaultExemption,
          input.paymentMethod || 'MULTIBANCO',
          paymentStatus,
          paidAt,
          input.notes || null,
          now,
          now,
          amountCents,
        ] }];
      if (dedupeKey) statements.push({sql: `INSERT INTO idempotency_keys (key, scope, statusCode, responseBody, createdAt, expiresAt) VALUES (?, ?, ?, ?, ?, ?)`, args: [dedupeKey, 'admin_invoice', 201, JSON.stringify({invoiceId: id, requestHash}), Date.now(), Date.now() + 86400000]});
      if (patient) {
        if (!await executeConditionalBatch({sql:'SELECT id FROM patients WHERE id=? AND updatedAt=? AND phone=?',args:[patient.id,patient.updatedAt,patient.phone]},statements)) throw new DocumentError('The patient record changed. Refresh before issuing this document.');
      } else await executeAtomicBatch(statements);

      const created = await dbGetInvoiceById(id);
      if (created) return created;
    } catch (err: any) {
      const concurrent = await findExisting();
      if (concurrent) return concurrent;
      lastError = err;
      if (err?.message?.includes('UNIQUE') || err?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        // Small backoff before retrying to let concurrent insert finish and increment sequence
        await new Promise(r => setTimeout(r, 20 * Math.pow(1.5, attempt) + Math.floor(Math.random() * 30)));
        continue;
      }
      throw err;
    }
  }
  throw lastError || new Error('Não foi possível gerar um número de fatura único.');
}

export async function dbGetInvoices(filters?: {
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  patientPhone?: string;
  patientId?: string;
  paymentMethod?: string;
  dateBasis?: string;
  pole?: string;
  limit?: number;
  offset?: number;
}): Promise<Invoice[]> {
  const catalogue=await getTreatments();
  const SERVICES=catalogue;
  const dateColumn=filters?.dateBasis==='payment'?'COALESCE(paidAt,createdAt)':'createdAt';
  let sql = 'SELECT * FROM invoices WHERE 1=1';
  const params: (string | number)[] = [];

  if (filters?.status && filters.status !== 'all') {
    sql += ' AND paymentStatus = ?';
    params.push(filters.status.toUpperCase());
  }
  if (filters?.paymentMethod && filters.paymentMethod !== 'all') {
    sql += ' AND paymentMethod = ?';
    params.push(filters.paymentMethod.toUpperCase());
  }
  if (filters?.patientId) {
    sql += ' AND (patientId = ? OR (patientId IS NULL AND patientPhone = (SELECT phone FROM patients WHERE id=?)))';
    params.push(filters.patientId, filters.patientId);
  } else if (filters?.patientPhone) {
    const phoneValidation = validateAndNormalizePhone(filters.patientPhone);
    const norm = phoneValidation.isValid ? phoneValidation.normalized : filters.patientPhone.trim();
    sql += ' AND (patientPhone = ? OR patientPhone = ?)';
    params.push(filters.patientPhone, norm);
  }
  if (filters?.dateFrom) {
    sql += ` AND ${dateColumn} >= ?`;
    params.push(lisbonDayStart(filters.dateFrom));
  }
  if (filters?.dateTo) {
    sql += ` AND ${dateColumn} < ?`;
    params.push(nextLisbonDayStart(filters.dateTo));
  }
  if (filters?.search) {
    sql += ' AND (patientName LIKE ? OR patientNif LIKE ? OR invoiceNumber LIKE ? OR serviceName LIKE ? OR patientPhone LIKE ?)';
    const q = `%${filters.search}%`;
    params.push(q, q, q, q, q);
  }

  if (filters?.pole && filters.pole!=='all') { sql+=" AND COALESCE(servicePole,(SELECT json_extract(content,'$.pole') FROM treatment_catalog t WHERE t.slug=invoices.serviceSlug),'kinesitherapie')=?";params.push(filters.pole); }
  sql += ' ORDER BY createdAt DESC';

  if (typeof filters?.limit === 'number' && filters.limit > 0) {
    sql += ' LIMIT ?';
    params.push(filters.limit);
    if (typeof filters?.offset === 'number' && filters.offset >= 0) {
      sql += ' OFFSET ?';
      params.push(filters.offset);
    }
  }

  return executeQuery<Invoice>(sql, params);
}

export async function dbGetInvoicesPaginated(options: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  patientPhone?: string;
  patientId?: string;
  paymentMethod?: string;
  dateBasis?: string;
  pole?: string;
}): Promise<{
  invoices: Invoice[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const catalogue=await getTreatments();
  const SERVICES=catalogue;
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(100, Math.max(1, options.limit ?? 50));
  const offset = (page - 1) * limit;

  const dateColumn=options.dateBasis==='payment'?'COALESCE(paidAt,createdAt)':'createdAt';
  let countSql = 'SELECT COUNT(*) as cnt FROM invoices WHERE 1=1';
  const countParams: (string | number)[] = [];

  if (options.status && options.status !== 'all') {
    countSql += ' AND paymentStatus = ?';
    countParams.push(options.status.toUpperCase());
  }
  if (options.paymentMethod && options.paymentMethod !== 'all') {
    countSql += ' AND paymentMethod = ?';
    countParams.push(options.paymentMethod.toUpperCase());
  }
  if (options.patientId) {
    countSql += ' AND (patientId = ? OR (patientId IS NULL AND patientPhone = (SELECT phone FROM patients WHERE id=?)))';
    countParams.push(options.patientId, options.patientId);
  } else if (options.patientPhone) {
    const phoneValidation = validateAndNormalizePhone(options.patientPhone);
    const norm = phoneValidation.isValid ? phoneValidation.normalized : options.patientPhone.trim();
    countSql += ' AND (patientPhone = ? OR patientPhone = ?)';
    countParams.push(options.patientPhone, norm);
  }
  if (options.dateFrom) {
    countSql += ` AND ${dateColumn} >= ?`;
    countParams.push(lisbonDayStart(options.dateFrom));
  }
  if (options.dateTo) {
    countSql += ` AND ${dateColumn} < ?`;
    countParams.push(nextLisbonDayStart(options.dateTo));
  }
  if (options.search) {
    countSql += ' AND (patientName LIKE ? OR patientNif LIKE ? OR invoiceNumber LIKE ? OR serviceName LIKE ? OR patientPhone LIKE ?)';
    const q = `%${options.search}%`;
    countParams.push(q, q, q, q, q);
  }

  if (options.pole && options.pole!=='all') { countSql+=" AND COALESCE(servicePole,(SELECT json_extract(content,'$.pole') FROM treatment_catalog t WHERE t.slug=invoices.serviceSlug),'kinesitherapie')=?";countParams.push(options.pole); }
  const [countRes, invoices] = await Promise.all([
    executeQuery<{ cnt: number }>(countSql, countParams),
    dbGetInvoices({ ...options, limit, offset }),
  ]);

  const total = Number(countRes[0]?.cnt ?? 0);
  const totalPages = Math.ceil(total / limit) || 1;

  return {
    invoices,
    total,
    page,
    limit,
    totalPages,
  };
}

export async function dbGetInvoiceById(id: string): Promise<Invoice | null> {
  const rows = await executeQuery<Invoice>('SELECT * FROM invoices WHERE id = ? OR invoiceNumber = ?', [id, id]);
  return rows[0] ?? null;
}

export async function dbUpdateInvoice(
  id: string,
  fields: Partial<Pick<Invoice, 'patientName' | 'patientNif' | 'patientEmail' | 'patientAddress' | 'paymentMethod' | 'paymentStatus' | 'notes' | 'coverageType' | 'coverageProvider' | 'coverageNumber'>>
): Promise<Invoice | null> {
  const updates: string[] = [];
  const params: (string | number)[] = [];

  if (fields.patientName !== undefined)      { updates.push('patientName = ?');      params.push(fields.patientName); }
  if (fields.patientNif !== undefined)       { updates.push('patientNif = ?');       params.push(fields.patientNif); }
  if (fields.patientEmail !== undefined)     { updates.push('patientEmail = ?');     params.push(fields.patientEmail ?? ''); }
  if (fields.patientAddress !== undefined)   { updates.push('patientAddress = ?');   params.push(fields.patientAddress ?? ''); }
  if (fields.paymentMethod !== undefined)    { updates.push('paymentMethod = ?');    params.push(fields.paymentMethod); }
  if (fields.paymentStatus !== undefined)    {
    updates.push('paymentStatus = ?');
    params.push(fields.paymentStatus);
    if (fields.paymentStatus === 'PAID') {
      updates.push("paidAt = CASE WHEN paymentStatus = 'PAID' THEN paidAt ELSE ? END");
      params.push(new Date().toISOString());
    } else {
      updates.push('paidAt = NULL');
    }
  }
  if (fields.coverageType !== undefined)     { updates.push('coverageType = ?');     params.push(fields.coverageType); }
  if (fields.coverageProvider !== undefined) { updates.push('coverageProvider = ?'); params.push(fields.coverageProvider ?? ''); }
  if (fields.coverageNumber !== undefined)   { updates.push('coverageNumber = ?');   params.push(fields.coverageNumber ?? ''); }
  if (fields.notes !== undefined)            { updates.push('notes = ?');            params.push(fields.notes ?? ''); }

  if (updates.length === 0) return dbGetInvoiceById(id);

  updates.push('updatedAt = ?');
  params.push(new Date().toISOString());
  params.push(id);

  await executeQuery(`UPDATE invoices SET ${updates.join(', ')} WHERE id = ?`, params);
  return dbGetInvoiceById(id);
}

export async function dbDeleteInvoice(id: string): Promise<void> {
  // Portuguese Tax Compliance (CIVA / SAF-T): Issued sequential medical invoices
  // cannot be physically deleted. They must be annulled/cancelled to preserve sequence audit trails.
  await executeQuery(
    "UPDATE invoices SET paymentStatus = 'CANCELLED', notes = COALESCE(notes || ' | ', '') || 'Anulado administrativamente', updatedAt = ? WHERE id = ?",
    [new Date().toISOString(), id]
  );
}

export async function dbAssertInvoiceAmountsReviewed(): Promise<void> {
  const rows=await executeQuery("SELECT id FROM invoices WHERE moneyReview=1 OR amountCents IS NULL LIMIT 1");
  if (rows.length) throw new DocumentError('Older invoices contain amounts that require reconciliation. Financial totals and exports are unavailable until those records are reviewed.');
}

export async function dbGetInvoiceStats(): Promise<InvoiceStats> {
  await dbAssertInvoiceAmountsReviewed();
  // Portuguese Accounting Rule: Cancelled/annulled invoices must not count toward clinic revenue.
  // Aggregate entirely in SQL — avoids loading all invoice rows into Node.js memory.
  const [statusRows, coverageRows] = await Promise.all([
    executeQuery<{ paymentStatus: string; cnt: number; total: number }>(
      `SELECT paymentStatus, COUNT(*) as cnt, COALESCE(SUM(amountCents), 0) / 100.0 as total
       FROM invoices
       WHERE paymentStatus != 'CANCELLED'
       GROUP BY paymentStatus`
    ),
    executeQuery<{ coverageType: string; cnt: number }>(
      `SELECT coverageType, COUNT(*) as cnt
       FROM invoices
       WHERE paymentStatus != 'CANCELLED'
       GROUP BY coverageType`
    ),
  ]);

  let totalRevenue = 0;
  let totalPaid = 0;
  let totalPending = 0;
  let countPaid = 0;
  let countPending = 0;
  let countTotal = 0;

  for (const row of statusRows) {
    const cnt = Number(row.cnt || 0);
    const total = Number(row.total || 0);
    const status = (row.paymentStatus || '').toUpperCase();
    countTotal += cnt;
    totalRevenue = sumMoney([totalRevenue,total]);
    if (status === 'PAID') {
      totalPaid = total;
      countPaid = cnt;
    } else if (status === 'PENDING') {
      totalPending = total;
      countPending = cnt;
    }
  }

  let insuranceCount = 0;
  for (const row of coverageRows) {
    const type = (row.coverageType || '').toUpperCase();
    if (type === 'ADSE' || type === 'INSURANCE') {
      insuranceCount += Number(row.cnt || 0);
    }
  }

  const avgTicket = countTotal > 0 ? Math.round(toCents(totalRevenue) / countTotal) / 100 : 0;
  const insuranceShare = countTotal > 0 ? Math.round((insuranceCount / countTotal) * 100) : 0;

  return {
    totalRevenue,
    totalPaid,
    totalPending,
    countPaid,
    countPending,
    countTotal,
    avgTicket,
    insuranceShare,
  };
}

// ─── Prescriptions & Recommendations Database Operations ─────────────────────

export async function dbCreatePrescription(input: {
  practitionerId?: string;
  patientId?: string;
  patientPhone: string;
  patientName: string;
  practitioner?: string;
  diagnosisOrGoal?: string;
  items: Array<{
    category: string;
    title: string;
    instructions: string;
    productRef?: string;
  }>;
  generalNotes?: string;
}): Promise<PatientPrescription> {
  const normalizedPhone = requireNormalizedPhone(input.patientPhone);
  const patient=await documentPatient(input);
  input={...input,patientId:patient?.id??input.patientId,patientName:patient?.patientName??input.patientName};
  const id = `rx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();
  const dateStr = now.split('T')[0];

  const itemsWithIds: PrescriptionItem[] = input.items.map((item, idx) => ({
    id: `item_${Date.now()}_${idx}`,
    category: item.category as any,
    title: item.title,
    instructions: item.instructions,
    productRef: item.productRef,
  }));

  const itemsJson = JSON.stringify(itemsWithIds);
  const author=await documentPractitioner(input.practitionerId);

  const statement={sql:`INSERT INTO prescriptions (
      id, patientId, patientPhone, patientName, practitioner, practitionerId, date,
      diagnosisOrGoal, itemsJson, generalNotes, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,args:[
      id,
      input.patientId ?? null,
      normalizedPhone,
      input.patientName.trim(),
      author.name,
      author.id,
      dateStr,
      input.diagnosisOrGoal?.trim() || null,
      itemsJson,
      input.generalNotes?.trim() || null,
      now,
    ]};
  if (patient) {
    if (!await executeConditionalBatch({sql:'SELECT id FROM patients WHERE id=? AND updatedAt=? AND phone=?',args:[patient.id,patient.updatedAt,patient.phone]},[statement])) throw new DocumentError('The patient record changed. Refresh before issuing this document.');
  } else await executeAtomicBatch([statement]);

  return {
    id,
    patientId: input.patientId,
    patientPhone: normalizedPhone,
    patientName: input.patientName.trim(),
    practitioner: author.name,
    practitionerId: author.id,
    date: dateStr,
    diagnosisOrGoal: input.diagnosisOrGoal?.trim(),
    items: itemsWithIds,
    generalNotes: input.generalNotes?.trim(),
    createdAt: now,
  };
}

export async function dbGetPrescriptionsByPatientId(patientId: string): Promise<PatientPrescription[]> {
  return readPatientPrescriptions(undefined, patientId);
}

export async function dbGetPrescriptionsByPatientPhone(patientPhone: string): Promise<PatientPrescription[]> {
  return readPatientPrescriptions(patientPhone);
}

async function readPatientPrescriptions(patientPhone?: string, patientId?: string): Promise<PatientPrescription[]> {
  const allRows = await executeQuery<{
    id: string;
    patientId?: string;
    patientPhone: string;
    patientName: string;
    practitioner: string;
    practitionerId?: string;
    date: string;
    diagnosisOrGoal?: string;
    itemsJson: string;
    generalNotes?: string;
    createdAt: string;
  }>('SELECT * FROM prescriptions' + (patientId ? ' WHERE patientId=? OR (patientId IS NULL AND patientPhone=(SELECT phone FROM patients WHERE id=?))' : '') + ' ORDER BY createdAt DESC', patientId ? [patientId, patientId] : []);

  const filtered = patientId ? allRows : allRows.filter(r => phonesMatch(r.patientPhone, patientPhone || ''));

  return filtered.map(r => {
    let items: PrescriptionItem[] = [];
    try {
      items = JSON.parse(r.itemsJson || '[]');
    } catch {
      items = [];
    }
    return {
      id: r.id,
      patientId: r.patientId,
      patientPhone: r.patientPhone,
      patientName: r.patientName,
      practitioner: r.practitioner,
      practitionerId: r.practitionerId,
      date: r.date,
      diagnosisOrGoal: r.diagnosisOrGoal,
      items: items.map((it, idx) => ({
        ...it,
        id: it.id || `rx_item_${r.id}_${idx}`,
      })),
      generalNotes: r.generalNotes,
      createdAt: r.createdAt,
    };
  });
}

// ─── Full Database Snapshot Export & Restore ─────────────────────────────────
// The allowlist also defines dependency order. Scheduling revisions are deliberately not
// restored: a restore must invalidate every outstanding availability/configuration snapshot.
const BACKUP_TABLES = ['practitioners','practitioner_services','working_hours','schedule_exceptions','resources','service_resources','patients','appointments','patient_sessions','clinical_session_revisions','invoices','prescriptions','blocked_slots','patient_notes','security_settings','security_audit_logs','reviews','idempotency_keys','treatment_catalog','treatment_revisions'] as const;
const SCHEDULE_BACKUP_TABLES = new Set<string>(BACKUP_TABLES.slice(0,6));
export async function dbExportFullDatabaseBackup() {
  const tables: Record<string, any[]> = {};
  if (isTursoEnabled()) {
    const client=getTursoClient(); await ensureTursoSchema(client);
    const tx=await client.transaction('read');
    try { for(const table of BACKUP_TABLES) tables[table]=(await tx.execute('SELECT * FROM '+table)).rows; await tx.commit(); }
    finally {tx.close();}
  } else {
    const db=getDb(); db.transaction(()=>{for(const table of BACKUP_TABLES) tables[table]=db.prepare('SELECT * FROM '+table).all();})();
  }
  return {version:'3.0.0',exportedAt:new Date().toISOString(),tables};
}
export async function dbRestoreFullDatabaseBackup(backupData: any): Promise<{success:boolean;restoredCounts:Record<string,number>}> {
  if(!backupData || !backupData.tables || Array.isArray(backupData.tables) || typeof backupData.tables!=='object') throw new Error('Invalid backup tables');
  if(!['1.0.0','2.0.0','3.0.0'].includes(backupData.version)) throw new Error('Unsupported backup version');
  const currentCatalogue=await getTreatments();
  const legacy=backupData.version==='1.0.0';
  const selected=BACKUP_TABLES.filter(t=>backupData.version==='3.0.0'||!['treatment_catalog','treatment_revisions'].includes(t)).filter(t=>t!=='clinical_session_revisions' || Array.isArray(backupData.tables[t])).filter(t=>!legacy || (!SCHEDULE_BACKUP_TABLES.has(t)&&t!=='idempotency_keys'));
  for(const table of selected) if(!Array.isArray(backupData.tables[table])) throw new Error('Missing or invalid backup table: '+table);
  if(!legacy) {
    for(const table of selected) {
      if(backupData.tables[table].length>500000)throw new Error('Backup table too large: '+table);
      if(backupData.tables[table].some((row:any)=>!row||typeof row!=='object'||Array.isArray(row)))throw new Error('Invalid row in '+table);
    }
    const resources=new Set(backupData.tables.resources.map((r:any)=>r?.id));
    const practitioners=new Set(backupData.tables.practitioners.map((p:any)=>p?.id));
    const validId=(id:unknown):id is string=>typeof id==='string'&&id.length>0&&id.length<=160&&id===id.trim();
    if([...resources,...practitioners].some(id=>!validId(id))||resources.size!==backupData.tables.resources.length||practitioners.size!==backupData.tables.practitioners.length)throw new Error('Invalid scheduling identities');
    const scope=(id:unknown)=>id==='*'||practitioners.has(id);
    // Older backups may retain mappings for historical services outside the catalogue.
    // They remain unavailable for new bookings until an administrator creates and publishes them.
    const validService=(slug:unknown)=>typeof slug==='string'&&slug.length<=100&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
    if(backupData.version==='3.0.0')for(const row of backupData.tables.treatment_catalog){ const content=JSON.parse(row.content); validateTreatment({...content,...row},treatmentFromRow(row)); }
    for(const row of backupData.tables.practitioner_services)if(!practitioners.has(row.practitionerId)||!validService(row.service))throw new Error('Invalid practitioner service');
    for(const row of backupData.tables.service_resources)if(!resources.has(row.resourceId)||!validService(row.service))throw new Error('Invalid service resource');
    for(const row of backupData.tables.working_hours)if(!scope(row.practitionerId))throw new Error('Invalid working hours practitioner');
    for(const row of backupData.tables.schedule_exceptions)if(!scope(row.practitionerId)||!isCalendarDate(row.date))throw new Error('Invalid schedule exception');
    for(const row of backupData.tables.blocked_slots)if(!scope(row.practitionerId)||!isCalendarDate(row.date)||!VALID_TIME_SLOTS.includes(row.time))throw new Error('Invalid blocked slot');
    for(const row of backupData.tables.appointments) {
      if(!isCalendarDate(row.date)||!VALID_TIME_SLOTS.includes(row.startTime)||!['PENDING','CONFIRMED','CANCELLED','COMPLETED','NO_SHOW'].includes(row.status))throw new Error('Invalid appointment schedule');
      let ids:unknown;
      try { ids=JSON.parse(row?.resourceIds); } catch { throw new Error('Invalid appointment resource allocation'); }
      if(!Array.isArray(ids)||ids.some(id=>typeof id!=='string'||!resources.has(id))||new Set(ids).size!==ids.length) throw new Error('Invalid appointment resource allocation');
      if(typeof row?.practitionerId!=='string'||!practitioners.has(row.practitionerId)) throw new Error('Invalid appointment practitioner');
    }
  }
  // Validate the complete document before deleting anything. Column names come from our schema.
  const schemas=await Promise.all(selected.map(table=>executeQuery<{name:string}>(`PRAGMA table_info(${table})`)));
  const queries:{sql:string;args:any[]}[]=selected.slice().reverse().map(table=>({sql:'DELETE FROM '+table,args:[]}));
  if(legacy) queries.unshift({sql:'DELETE FROM idempotency_keys',args:[]});
  if(!selected.includes('clinical_session_revisions'))queries.unshift({sql:'DELETE FROM clinical_session_revisions',args:[]});
  const restoredCounts:Record<string,number>={};
  for(let i=0;i<selected.length;i++){
    const table=selected[i]; const rows=backupData.tables[table];
    if(!Array.isArray(rows)) throw new Error('Missing or invalid backup table: '+table);
    if(rows.length>500000) throw new Error('Backup table too large: '+table);
    const columns=new Set(schemas[i].map(c=>c.name)); restoredCounts[table]=rows.length;
    for(const original of rows){
      if(!original||typeof original!=='object'||Array.isArray(original))throw new Error('Invalid row in '+table);
      const row={...original};
      if (table==='patient_sessions' && row.clinicalStatus===undefined) Object.assign(row,{legacyEvaPainScore:row.evaPainScore??null,evaPainScore:null,clinicalStatus:'LEGACY_REVIEW',completedAt:null});
      if (table==='invoices' && row.amountCents===undefined) { try {row.amountCents=toCents(row.amount);row.moneyReview=0;}catch{row.amountCents=null;row.moneyReview=1;} }
      if(legacy && table==='appointments') { row.practitionerId='legacy'; row.practitionerName=SITE.professionalName; row.durationMinutes=row.durationMinutes??currentCatalogue.find(t=>t.slug===row.service)?.durationMinutes??30; }
      if(legacy && table==='blocked_slots')row.practitionerId='*';
      const keys=Object.keys(row).filter(k=>columns.has(k));
      if(!keys.length)throw new Error('Empty row in '+table);
      const values=keys.map(k=>{const v=row[k]; if(v!==null&&typeof v!=='string'&&typeof v!=='number')throw new Error('Invalid value in '+table+'.'+k);return v;});
      queries.push({sql:`INSERT INTO ${table} (${keys.map(k=>'"'+k+'"').join(',')}) VALUES (${keys.map(()=>'?').join(',')})`,args:values});
    }
  }
  queries.push({sql:'UPDATE booking_sync SET revision=revision+1 WHERE id=1',args:[]});
  await executeAtomicBatch(queries);
  return {success:true,restoredCounts};
}

export async function dbDeletePrescription(id: string): Promise<void> {
  await executeQuery('DELETE FROM prescriptions WHERE id = ?', [id]);
}

// ─── Patient Reviews Engine ───────────────────────────────────────────────────

export async function dbGetApprovedReviews(options?: {
  serviceSlug?: string;
  limit?: number;
}): Promise<Review[]> {
  let sql = `SELECT * FROM reviews WHERE status = 'APPROVED'`;
  const args: any[] = [];

  if (options?.serviceSlug && options.serviceSlug !== 'all') {
    sql += ` AND serviceSlug = ?`;
    args.push(options.serviceSlug);
  }

  sql += ` ORDER BY isFeatured DESC, createdAt DESC`;

  if (options?.limit && options.limit > 0) {
    sql += ` LIMIT ?`;
    args.push(options.limit);
  }

  const rows = await executeQuery<any>(sql, args);
  return rows.map((r) => ({
    id: String(r.id),
    patientName: String(r.patientName),
    patientEmail: null, // Privacy & GDPR: Never leak patient email addresses on public endpoints
    rating: Number(r.rating),
    serviceSlug: String(r.serviceSlug),
    comment: String(r.comment),
    location: String(r.location || 'Lisboa'),
    status: r.status as ReviewStatus,
    verified: Boolean(r.verified),
    isFeatured: Boolean(r.isFeatured),
    createdAt: String(r.createdAt),
    updatedAt: String(r.updatedAt),
  }));
}

export async function dbGetAllReviewsAdmin(options?: {
  status?: ReviewStatus | 'ALL';
  search?: string;
}): Promise<Review[]> {
  let sql = `SELECT * FROM reviews`;
  const args: any[] = [];
  const where: string[] = [];

  if (options?.status && options.status !== 'ALL') {
    where.push(`status = ?`);
    args.push(options.status);
  }

  if (options?.search && options.search.trim()) {
    where.push(`(patientName LIKE ? OR comment LIKE ? OR location LIKE ?)`);
    const term = `%${options.search.trim()}%`;
    args.push(term, term, term);
  }

  if (where.length > 0) {
    sql += ` WHERE ` + where.join(' AND ');
  }

  sql += ` ORDER BY createdAt DESC`;

  const rows = await executeQuery<any>(sql, args);
  return rows.map((r) => ({
    id: String(r.id),
    patientName: String(r.patientName),
    patientEmail: r.patientEmail ? String(r.patientEmail) : null,
    rating: Number(r.rating),
    serviceSlug: String(r.serviceSlug),
    comment: String(r.comment),
    location: String(r.location || 'Lisboa'),
    status: r.status as ReviewStatus,
    verified: Boolean(r.verified),
    isFeatured: Boolean(r.isFeatured),
    createdAt: String(r.createdAt),
    updatedAt: String(r.updatedAt),
  }));
}

export async function dbCreateReview(input: CreateReviewInput): Promise<Review> {
  const id = 'rev_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
  const now = new Date().toISOString();
  // As requested: user accepted first (status = 'APPROVED')
  const status: ReviewStatus = input.status || 'APPROVED';
  const verified = input.verified !== undefined ? (input.verified ? 1 : 0) : 1;
  const isFeatured = input.isFeatured ? 1 : 0;
  const location = input.location?.trim() || 'Lisboa';

  await executeQuery(
    `INSERT INTO reviews (id, patientName, patientEmail, rating, serviceSlug, comment, location, status, verified, isFeatured, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.patientName.trim(),
      input.patientEmail?.trim() || null,
      Math.min(5, Math.max(1, Math.round(input.rating))),
      input.serviceSlug,
      input.comment.trim(),
      location,
      status,
      verified,
      isFeatured,
      now,
      now,
    ]
  );

  return {
    id,
    patientName: input.patientName.trim(),
    patientEmail: input.patientEmail?.trim() || null,
    rating: Math.min(5, Math.max(1, Math.round(input.rating))),
    serviceSlug: input.serviceSlug,
    comment: input.comment.trim(),
    location,
    status,
    verified: Boolean(verified),
    isFeatured: Boolean(isFeatured),
    createdAt: now,
    updatedAt: now,
  };
}

export async function dbUpdateReviewStatus(
  id: string,
  updates: { status?: ReviewStatus; verified?: boolean; isFeatured?: boolean }
): Promise<Review | null> {
  const existing = await executeQuery<any>('SELECT * FROM reviews WHERE id = ?', [id]);
  if (!existing || existing.length === 0) return null;

  const current = existing[0];
  const newStatus = updates.status !== undefined ? updates.status : current.status;
  const newVerified = updates.verified !== undefined ? (updates.verified ? 1 : 0) : current.verified;
  const newFeatured = updates.isFeatured !== undefined ? (updates.isFeatured ? 1 : 0) : current.isFeatured;
  const now = new Date().toISOString();

  await executeQuery(
    `UPDATE reviews SET status = ?, verified = ?, isFeatured = ?, updatedAt = ? WHERE id = ?`,
    [newStatus, newVerified, newFeatured, now, id]
  );

  return {
    id,
    patientName: String(current.patientName),
    patientEmail: current.patientEmail ? String(current.patientEmail) : null,
    rating: Number(current.rating),
    serviceSlug: String(current.serviceSlug),
    comment: String(current.comment),
    location: String(current.location || 'Lisboa'),
    status: newStatus as ReviewStatus,
    verified: Boolean(newVerified),
    isFeatured: Boolean(newFeatured),
    createdAt: String(current.createdAt),
    updatedAt: now,
  };
}

export async function dbDeleteReview(id: string): Promise<boolean> {
  await executeQuery('DELETE FROM reviews WHERE id = ?', [id]);
  return true;
}

/**
 * Highly optimized SQL-level analytics aggregation.
 * Eliminates in-memory data serialization and full-table array processing.
 */
export async function dbGetAnalyticsStats(lang: string = 'fr'): Promise<{
  stats: {
    total: number;
    confirmed: number;
    pending: number;
    completed: number;
    cancelled: number;
    noShow: number;
    revenue: number;
    invoicesCount: number;
    paidInvoicesRevenue: number;
  };
  analyticsData: {
    dowLabels: string[];
    dowCounts: number[];
    topServices: [string, number][];
    peakHours: [string, number][];
    cancelRate: number;
    completionRate: number;
  };
}> {
  const catalogue=await getTreatments();
  const [
    statusCounts,
    invoiceAgg,
    serviceCounts,
    hourCounts,
    dowData,
    completedServiceCounts,
  ] = await Promise.all([
    executeQuery<{ status: string; cnt: number }>(
      'SELECT status, COUNT(*) as cnt FROM appointments WHERE archivedAt IS NULL GROUP BY status'
    ),
    executeQuery<{ totalInvoices: number; paidRevenue: number }>(
      `SELECT
         COUNT(*) as totalInvoices,
         COALESCE(SUM(CASE WHEN paymentStatus = 'PAID' THEN amount ELSE 0 END), 0) as paidRevenue
       FROM invoices`
    ),
    executeQuery<{ service: string; servicePriceCents:number|null; cnt: number }>(
      'SELECT service, COUNT(*) as cnt FROM appointments WHERE archivedAt IS NULL GROUP BY service ORDER BY cnt DESC LIMIT 6'
    ),
    executeQuery<{ startTime: string; cnt: number }>(
      'SELECT startTime, COUNT(*) as cnt FROM appointments WHERE archivedAt IS NULL GROUP BY startTime ORDER BY cnt DESC LIMIT 8'
    ),
    executeQuery<{ dow: number; cnt: number }>(
      `SELECT CAST(strftime('%w', date) AS INTEGER) as dow, COUNT(*) as cnt
       FROM appointments
       WHERE archivedAt IS NULL AND date IS NOT NULL AND date != ''
       GROUP BY dow`
    ),
    executeQuery<{ service: string; servicePriceCents:number|null; cnt: number }>(
      `SELECT service, servicePriceCents, COUNT(*) as cnt
       FROM appointments
       WHERE archivedAt IS NULL AND status IN ('CONFIRMED', 'COMPLETED')
       GROUP BY service, servicePriceCents`
    ),
  ]);

  let total = 0;
  let confirmed = 0;
  let pending = 0;
  let completed = 0;
  let cancelled = 0;
  let noShow = 0;

  for (const row of statusCounts) {
    const c = Number(row.cnt);
    total += c;
    const s = String(row.status).toUpperCase();
    if (s === 'CONFIRMED') confirmed = c;
    else if (s === 'PENDING') pending = c;
    else if (s === 'COMPLETED') completed = c;
    else if (s === 'CANCELLED') cancelled = c;
    else if (s === 'NO_SHOW') noShow = c;
  }

  const invoicesCount = Number(invoiceAgg[0]?.totalInvoices ?? 0);
  const paidInvoicesRevenue = Number(invoiceAgg[0]?.paidRevenue ?? 0);

  let appointmentsRevenue = 0;
  for (const row of completedServiceCounts) {
    const price = (row.servicePriceCents!=null?row.servicePriceCents/100:getServicePrice(row.service, catalogue));
    appointmentsRevenue += price * Number(row.cnt);
  }

  const revenue = Math.max(paidInvoicesRevenue, appointmentsRevenue);

  const dowLabels =
    lang === 'pt'
      ? ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
      : lang === 'en'
      ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      : ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  const dowCounts = Array(7).fill(0);
  for (const row of dowData) {
    const dow = Number(row.dow);
    const idx = (dow + 6) % 7;
    dowCounts[idx] = Number(row.cnt);
  }

  const topServices: [string, number][] = serviceCounts.map(s => [s.service, Number(s.cnt)]);
  const peakHours: [string, number][] = hourCounts.map(h => [h.startTime, Number(h.cnt)]);

  const cancelRate = total > 0 ? Math.round(((cancelled + noShow) / total) * 100) : 0;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    stats: {
      total,
      confirmed,
      pending,
      completed,
      cancelled,
      noShow,
      revenue,
      invoicesCount,
      paidInvoicesRevenue,
    },
    analyticsData: {
      dowLabels,
      dowCounts,
      topServices,
      peakHours,
      cancelRate,
      completionRate,
    },
  };
}

export interface FilteredAnalyticsOptions {
  lang?: Lang;
  range?: string;
  startDate?: string;
  endDate?: string;
  pole?: string;
}

export interface FilteredAnalyticsResult {
  stats: {
    total: number;
    confirmed: number;
    pending: number;
    completed: number;
    cancelled: number;
    noShow: number;
    revenue: number;
    totalRevenue: number;
    totalBilled: number;
    totalPaid: number;
    totalPending: number;
    countPaid: number;
    countPending: number;
    invoicesCount: number;
    paidInvoicesRevenue: number;
    avgTicket: number;
    occupancyRate: number;
    lostRevenue: number;
    uniquePatients: number;
  };
  comparison: {
    revenueGrowthPct: number;
    appointmentsGrowthPct: number;
    priorRevenue: number;
    priorAppointments: number;
  };
  timeline: {
    granularity: 'hour' | 'day' | 'week' | 'month';
    points: Array<{
      key: string;
      label: string;
      revenue: number;
      appointments: number;
      completed: number;
      cancelled: number;
    }>;
  };
  departmentData: {
    poles: Array<{
      pole: 'kinesitherapie' | 'minceur' | 'bilan';
      name: string;
      color: string;
      count: number;
      revenue: number;
      percentage: number;
    }>;
    topServices: Array<{
      slug: string;
      name: string;
      pole: string;
      count: number;
      revenue: number;
      share: number;
    }>;
  };
  heatmap: {
    dowLabels: string[];
    hours: string[];
    matrix: number[][];
    maxCount: number;
    peakSlot: { dow: string; hour: string; count: number };
  };
  funnel: {
    stages: Array<{
      id: string;
      name: string;
      count: number;
      percentage: number;
    }>;
    cancellationsCount: number;
    noShowsCount: number;
    lostRevenue: number;
    retentionRate: number;
  };
  payments: {
    byMethod: Array<{ method: string; count: number; amount: number; percentage: number }>;
    byCoverage: Array<{ coverage: string; count: number; percentage: number }>;
    unpaidCount: number;
    unpaidAmount: number;
  };
  analyticsData: {
    dowLabels: string[];
    dowCounts: number[];
    topServices: [string, number][];
    peakHours: [string, number][];
    cancelRate: number;
    completionRate: number;
  };
  range: {
    type: string;
    startDate: string;
    endDate: string;
    pole: string;
  };
}

/**
 * Advanced real-time multi-dimensional analytics engine.
 * Computes live KPIs, time-series spline points, 2D occupancy heatmap,
 * patient conversion funnel, department matrix, and period-over-period growth deltas.
 */
export async function dbGetFilteredAnalyticsStats(
  options: FilteredAnalyticsOptions = {}
): Promise<FilteredAnalyticsResult> {
  const catalogue=await getTreatments();
  await dbAssertInvoiceAmountsReviewed();
  const lang: Lang = options.lang === 'pt' ? 'pt' : options.lang === 'en' ? 'en' : 'fr';
  const rangeType = options.range || '30d';
  const targetPole = options.pole && options.pole !== 'all' ? options.pole : 'all';

  const now = new Date(getLisbonDateTime().todayStr + 'T12:00:00');
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const todayStr = fmt(now);

  let start = todayStr;
  let end = todayStr;
  let priorStart = todayStr;
  let priorEnd = todayStr;
  let granularity: 'hour' | 'day' | 'week' | 'month' = 'day';

  if (rangeType === 'today') {
    start = todayStr;
    end = todayStr;
    const yest = new Date(now);
    yest.setDate(yest.getDate() - 1);
    priorStart = fmt(yest);
    priorEnd = fmt(yest);
    granularity = 'hour';
  } else if (rangeType === '7d') {
    end = todayStr;
    const d7 = new Date(now);
    d7.setDate(d7.getDate() - 6);
    start = fmt(d7);

    const pEnd = new Date(d7);
    pEnd.setDate(pEnd.getDate() - 1);
    priorEnd = fmt(pEnd);
    const pStart = new Date(pEnd);
    pStart.setDate(pStart.getDate() - 6);
    priorStart = fmt(pStart);
    granularity = 'day';
  } else if (rangeType === 'month') {
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    start = fmt(firstOfMonth);
    end = todayStr;

    const prevMonthFirst = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    priorStart = fmt(prevMonthFirst);
    const prevMonthEnd = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      Math.min(now.getDate(), new Date(now.getFullYear(), now.getMonth(), 0).getDate())
    );
    priorEnd = fmt(prevMonthEnd);
    granularity = 'day';
  } else if (rangeType === '30d') {
    end = todayStr;
    const d30 = new Date(now);
    d30.setDate(d30.getDate() - 29);
    start = fmt(d30);

    const pEnd = new Date(d30);
    pEnd.setDate(pEnd.getDate() - 1);
    priorEnd = fmt(pEnd);
    const pStart = new Date(pEnd);
    pStart.setDate(pStart.getDate() - 29);
    priorStart = fmt(pStart);
    granularity = 'day';
  } else if (rangeType === '90d') {
    end = todayStr;
    const d90 = new Date(now);
    d90.setDate(d90.getDate() - 89);
    start = fmt(d90);

    const pEnd = new Date(d90);
    pEnd.setDate(pEnd.getDate() - 1);
    priorEnd = fmt(pEnd);
    const pStart = new Date(pEnd);
    pStart.setDate(pStart.getDate() - 89);
    priorStart = fmt(pStart);
    granularity = 'week';
  } else if (rangeType === 'year') {
    start = `${now.getFullYear()}-01-01`;
    end = todayStr;

    priorStart = `${now.getFullYear() - 1}-01-01`;
    priorEnd = `${now.getFullYear() - 1}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    granularity = 'month';
  } else if (rangeType === 'all') {
    start = '2020-01-01';
    end = '2099-12-31';
    priorStart = '2020-01-01';
    priorEnd = '2020-01-01';
    granularity = 'month';
  } else if (rangeType === 'custom') {
    start = options.startDate || todayStr;
    end = options.endDate || todayStr;
    if (start > end) {
      const tmp = start;
      start = end;
      end = tmp;
    }
    const dStart = new Date(start + 'T12:00:00');
    const dEnd = new Date(end + 'T12:00:00');
    const diffDays = Math.max(1, Math.round((dEnd.getTime() - dStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    const pEnd = new Date(dStart);
    pEnd.setDate(pEnd.getDate() - 1);
    priorEnd = fmt(pEnd);
    const pStart = new Date(pEnd);
    pStart.setDate(pStart.getDate() - (diffDays - 1));
    priorStart = fmt(pStart);

    if (diffDays <= 2) granularity = 'hour';
    else if (diffDays <= 45) granularity = 'day';
    else if (diffDays <= 180) granularity = 'week';
    else granularity = 'month';
  }

  // Fast index-assisted SQL queries
  const isAllTime = rangeType === 'all';
  const endOfDay = (date: string) => {
    const next = new Date(date + 'T12:00:00Z');
    next.setUTCDate(next.getUTCDate() + 1);
    return new Date(Date.parse(lisbonDayStart(next.toISOString().slice(0, 10))) - 1).toISOString();
  };
  const startIso = lisbonDayStart(start);
  const endIso = endOfDay(end);
  const priorStartIso = lisbonDayStart(priorStart);
  const priorEndIso = endOfDay(priorEnd);

  const [currentAppts, priorAppts, currentInvoices, priorInvoices] = await Promise.all([
    isAllTime
      ? executeQuery<{
          id: string;
          patientName: string;
          patientId: string | null;
          phone: string;
          service: string;
          servicePriceCents: number|null;
          servicePole: string|null;
          date: string;
          startTime: string;
          practitionerId: string;
          durationMinutes: number;
          bufferBefore: number;
          bufferAfter: number;
          status: string;
          coverageType: string | null;
          createdAt: string;
        }>(
          `SELECT id, patientId, patientName, phone, service, servicePriceCents, servicePole, date, startTime, practitionerId, durationMinutes, bufferBefore, bufferAfter, status, coverageType, createdAt
           FROM appointments WHERE archivedAt IS NULL`
        )
      : executeQuery<{
          id: string;
          patientName: string;
          patientId: string | null;
          phone: string;
          service: string;
          servicePriceCents: number|null;
          servicePole: string|null;
          date: string;
          startTime: string;
          practitionerId: string;
          durationMinutes: number;
          bufferBefore: number;
          bufferAfter: number;
          status: string;
          coverageType: string | null;
          createdAt: string;
        }>(
          `SELECT id, patientId, patientName, phone, service, servicePriceCents, servicePole, date, startTime, practitionerId, durationMinutes, bufferBefore, bufferAfter, status, coverageType, createdAt
           FROM appointments
           WHERE archivedAt IS NULL AND date >= ? AND date <= ?`,
          [start, end]
        ),
    isAllTime
      ? Promise.resolve([])
      : executeQuery<{
          service: string;
          servicePriceCents: number|null;
          servicePole: string|null;
          status: string;
        }>(
          `SELECT service, status, servicePriceCents, servicePole
           FROM appointments
           WHERE archivedAt IS NULL AND date >= ? AND date <= ?`,
          [priorStart, priorEnd]
        ),
    isAllTime
      ? executeQuery<{
          id: string;
          invoiceNumber: string;
          amount: number;
          paymentStatus: string;
          paymentMethod: string;
          coverageType: string | null;
          serviceSlug: string;
          servicePole: string|null;
          createdAt: string;
          paidAt: string | null;
        }>(
          `SELECT id, invoiceNumber, amountCents / 100.0 AS amount, paymentStatus, paymentMethod, coverageType, serviceSlug, servicePole, createdAt, paidAt
           FROM invoices`
        )
      : executeQuery<{
          id: string;
          invoiceNumber: string;
          amount: number;
          paymentStatus: string;
          paymentMethod: string;
          coverageType: string | null;
          serviceSlug: string;
          servicePole: string|null;
          createdAt: string;
          paidAt: string | null;
        }>(
          `SELECT id, invoiceNumber, amountCents / 100.0 AS amount, paymentStatus, paymentMethod, coverageType, serviceSlug, servicePole, createdAt, paidAt
           FROM invoices
           WHERE COALESCE(paidAt, createdAt) >= ? AND COALESCE(paidAt, createdAt) <= ?`,
          [startIso, endIso]
        ),
    isAllTime
      ? Promise.resolve([])
      : executeQuery<{
          amount: number;
          paymentStatus: string;
          serviceSlug: string;
          servicePole: string|null;
        }>(
          `SELECT amountCents / 100.0 AS amount, paymentStatus, serviceSlug, servicePole
           FROM invoices
           WHERE COALESCE(paidAt, createdAt) >= ? AND COALESCE(paidAt, createdAt) <= ?`,
          [priorStartIso, priorEndIso]
        ),
  ]);

  // Convert once per distinct payment timestamp within this request.
  const paymentDates = new Map<string, ReturnType<typeof getLisbonDateTime>>();
  const paymentDate = (invoice: { paidAt?: string | null; createdAt: string }) => {
    const timestamp = invoice.paidAt || invoice.createdAt;
    let value = paymentDates.get(timestamp);
    if (!value) { value = getLisbonDateTime(new Date(timestamp)); paymentDates.set(timestamp, value); }
    return value;
  };
  if (isAllTime) {
    const dates = [...currentAppts.map(a => a.date), ...currentInvoices.map(i => paymentDate(i).todayStr)].filter(isCalendarDate).sort();
    start = dates[0] || todayStr;
    end = dates[dates.length - 1] || todayStr;
  }

  // Apply Pole Filter
  const appts = targetPole === 'all'
    ? currentAppts
    : currentAppts.filter(a => (a.servicePole as 'kinesitherapie'|'minceur'|'bilan' || getServicePole(a.service, catalogue)) === targetPole);

  const filteredPriorAppts = targetPole === 'all'
    ? priorAppts
    : priorAppts.filter(a => (a.servicePole as 'kinesitherapie'|'minceur'|'bilan' || getServicePole(a.service, catalogue)) === targetPole);

  const invoices = targetPole === 'all'
    ? currentInvoices
    : currentInvoices.filter(i => (i.servicePole as 'kinesitherapie'|'minceur'|'bilan' || getServicePole(i.serviceSlug, catalogue)) === targetPole);

  const filteredPriorInvoices = targetPole === 'all'
    ? priorInvoices
    : priorInvoices.filter(i => (i.servicePole as 'kinesitherapie'|'minceur'|'bilan' || getServicePole(i.serviceSlug, catalogue)) === targetPole);

  // Compute status metrics & revenue
  let total = 0;
  let confirmed = 0;
  let pending = 0;
  let completed = 0;
  let cancelled = 0;
  let noShow = 0;
  let lostRevenue = 0;
  let appointmentsRevenue = 0;
  const uniquePatientsSet = new Set<string>();
  const patientSessionCounts = new Map<string, number>();

  for (const a of appts) {
    total++;
    const s = (a.status || '').toUpperCase();
    const price = (a.servicePriceCents!=null?a.servicePriceCents/100:getServicePrice(a.service, catalogue));
    const pKey = a.patientId || a.phone || a.patientName;
    if (pKey) {
      uniquePatientsSet.add(pKey);
      patientSessionCounts.set(pKey, (patientSessionCounts.get(pKey) || 0) + 1);
    }

    if (s === 'CONFIRMED') confirmed++;
    else if (s === 'PENDING') pending++;
    else if (s === 'COMPLETED') {
      completed++;
      appointmentsRevenue += price;
    } else if (s === 'CANCELLED') {
      cancelled++;
      lostRevenue += price;
    } else if (s === 'NO_SHOW') {
      noShow++;
      lostRevenue += price;
    }
  }

  // Invoice calculations - Portuguese Statutory Accounting: exclude CANCELLED invoices
  let paidInvoicesRevenue = 0;
  let unpaidAmount = 0;
  let unpaidCount = 0;
  let paidCount = 0;
  let activeInvoicesCount = 0;
  const methodMap = new Map<string, { count: number; amount: number }>();
  const coverageMap = new Map<string, number>();

  for (const inv of invoices) {
    const status = (inv.paymentStatus || '').toUpperCase();
    if (status === 'CANCELLED' || status === 'REFUNDED') continue;
    activeInvoicesCount++;
    const amt = Number(inv.amount) || 0;
    const isPaid = status === 'PAID';
    if (isPaid) {
      paidInvoicesRevenue = sumMoney([paidInvoicesRevenue,amt]);
      paidCount++;
      const m = (inv.paymentMethod || 'MULTIBANCO').toUpperCase();
      const cur = methodMap.get(m) || { count: 0, amount: 0 };
      cur.count++;
      cur.amount = sumMoney([cur.amount,amt]);
      methodMap.set(m, cur);
    } else {
      unpaidCount++;
      unpaidAmount = sumMoney([unpaidAmount,amt]);
    }

    const c = (inv.coverageType || 'PARTICULAR').toUpperCase();
    coverageMap.set(c, (coverageMap.get(c) || 0) + 1);
  }

  const revenue = paidInvoicesRevenue;
  const totalBilled = sumMoney([paidInvoicesRevenue,unpaidAmount]);
  const avgTicket = paidCount > 0 ? Math.round(revenue / paidCount * 100) / 100 : 0;

  // Prior Period Deltas
  let priorCompletedRevenue = 0;
  let priorPaidInvoicesRevenue = 0;
  for (const a of filteredPriorAppts) {
    if ((a.status || '').toUpperCase() === 'COMPLETED') {
      priorCompletedRevenue += (a.servicePriceCents!=null?a.servicePriceCents/100:getServicePrice(a.service, catalogue));
    }
  }
  for (const inv of filteredPriorInvoices) {
    if ((inv.paymentStatus || '').toUpperCase() === 'PAID') {
      priorPaidInvoicesRevenue = sumMoney([priorPaidInvoicesRevenue,Number(inv.amount) || 0]);
    }
  }
  const priorRevenue = priorPaidInvoicesRevenue;
  const priorAppointments = filteredPriorAppts.length;

  const revenueGrowthPct = priorRevenue > 0
    ? Math.round(((revenue - priorRevenue) / priorRevenue) * 1000) / 10
    : revenue > 0 ? 100 : 0;

  const appointmentsGrowthPct = priorAppointments > 0
    ? Math.round(((total - priorAppointments) / priorAppointments) * 1000) / 10
    : total > 0 ? 100 : 0;

  // Dynamic Time-Series Spline Points
  type TimePoint = {
    key: string;
    label: string;
    revenue: number;
    appointments: number;
    completed: number;
    cancelled: number;
  };
  const pointsMap = new Map<string, TimePoint>();

  const locale = lang === 'pt' ? 'pt-PT' : lang === 'en' ? 'en-US' : 'fr-FR';

  if (granularity === 'hour') {
    const slots = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
    slots.forEach(slot => {
      pointsMap.set(slot, {
        key: slot,
        label: slot,
        revenue: 0,
        appointments: 0,
        completed: 0,
        cancelled: 0,
      });
    });

    for (const a of appts) {
      if (!a.startTime) continue;
      const h = parseInt(a.startTime.split(':')[0], 10);
      let targetSlot = '08:00';
      if (h >= 19) targetSlot = '20:00';
      else if (h >= 17) targetSlot = '18:00';
      else if (h >= 15) targetSlot = '16:00';
      else if (h >= 13) targetSlot = '14:00';
      else if (h >= 11) targetSlot = '12:00';
      else if (h >= 9) targetSlot = '10:00';

      const pt = pointsMap.get(targetSlot);
      if (pt) {
        pt.appointments++;
        const s = (a.status || '').toUpperCase();
        if (s === 'COMPLETED') {
          pt.completed++;

        } else if (s === 'CANCELLED' || s === 'NO_SHOW') {
          pt.cancelled++;
        }
      }
    }
  } else if (granularity === 'day') {
    const curDate = new Date(start + 'T12:00:00');
    const endDateObj = new Date(end + 'T12:00:00');
    while (curDate <= endDateObj) {
      const dKey = fmt(curDate);
      const label = curDate.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
      pointsMap.set(dKey, {
        key: dKey,
        label,
        revenue: 0,
        appointments: 0,
        completed: 0,
        cancelled: 0,
      });
      curDate.setDate(curDate.getDate() + 1);
    }

    for (const a of appts) {
      const pt = pointsMap.get(a.date);
      if (pt) {
        pt.appointments++;
        const s = (a.status || '').toUpperCase();
        if (s === 'COMPLETED') {
          pt.completed++;

        } else if (s === 'CANCELLED' || s === 'NO_SHOW') {
          pt.cancelled++;
        }
      }
    }

  } else if (granularity === 'week') {
    const curDate = new Date(start + 'T12:00:00');
    const endDateObj = new Date(end + 'T12:00:00');
    while (curDate <= endDateObj) {
      const weekStartStr = fmt(curDate);
      const label = `Sem. ${curDate.toLocaleDateString(locale, { day: 'numeric', month: 'numeric' })}`;
      pointsMap.set(weekStartStr, {
        key: weekStartStr,
        label,
        revenue: 0,
        appointments: 0,
        completed: 0,
        cancelled: 0,
      });
      curDate.setDate(curDate.getDate() + 7);
    }

    const weekKeys = Array.from(pointsMap.keys());
    for (const a of appts) {
      // find matching week
      let assignedKey = weekKeys[0];
      for (const wk of weekKeys) {
        if (a.date >= wk) assignedKey = wk;
      }
      const pt = pointsMap.get(assignedKey);
      if (pt) {
        pt.appointments++;
        const s = (a.status || '').toUpperCase();
        if (s === 'COMPLETED') {
          pt.completed++;
        } else if (s === 'CANCELLED' || s === 'NO_SHOW') {
          pt.cancelled++;
        }
      }
    }
  } else {
    // Start on day one so month increments cannot skip February.
    const curDate = new Date(start.slice(0, 7) + '-01T12:00:00');
    const endDateObj = new Date(end + 'T12:00:00');
    while (curDate <= endDateObj) {
      const mKey = `${curDate.getFullYear()}-${pad(curDate.getMonth() + 1)}`;
      const label = curDate.toLocaleDateString(locale, { month: 'short', year: '2-digit' });
      pointsMap.set(mKey, {
        key: mKey,
        label,
        revenue: 0,
        appointments: 0,
        completed: 0,
        cancelled: 0,
      });
      curDate.setMonth(curDate.getMonth() + 1);
    }

    for (const a of appts) {
      const mKey = a.date.slice(0, 7);
      const pt = pointsMap.get(mKey);
      if (pt) {
        pt.appointments++;
        const s = (a.status || '').toUpperCase();
        if (s === 'COMPLETED') {
          pt.completed++;
        } else if (s === 'CANCELLED' || s === 'NO_SHOW') {
          pt.cancelled++;
        }
      }
    }
  }

  // Revenue always comes from settled invoices, using the clinic's payment date.
  const bucketKeys = [...pointsMap.keys()];
  for (const inv of invoices) {
    if (inv.paymentStatus !== 'PAID') continue;
    const paid = paymentDate(inv);
    let key = paid.todayStr;
    if (granularity === 'month') key = key.slice(0, 7);
    else if (granularity === 'week') key = bucketKeys.filter(k => k <= paid.todayStr).pop() || bucketKeys[0];
    else if (granularity === 'hour') {
      const hour = Number(paid.currentHHMM.slice(0, 2));
      key = String(Math.max(8, Math.min(20, Math.ceil(hour / 2) * 2))).padStart(2, '0') + ':00';
    }
    const point = pointsMap.get(key);
    if (point) point.revenue = sumMoney([point.revenue,Number(inv.amount) || 0]);
  }

  const timelinePoints = Array.from(pointsMap.values()).map(pt => ({
    ...pt,
    revenue: Math.round(pt.revenue * 100) / 100,
  }));

  // Department & Pole Distribution
  const poleTotals = {
    kinesitherapie: { count: 0, revenue: 0 },
    minceur: { count: 0, revenue: 0 },
    bilan: { count: 0, revenue: 0 },
  };
  const serviceStats = new Map<string, { count: number; revenue: number }>();

  for (const a of appts) {
    const p = (a.servicePole as 'kinesitherapie'|'minceur'|'bilan' || getServicePole(a.service, catalogue));
    const pr = (a.servicePriceCents!=null?a.servicePriceCents/100:getServicePrice(a.service, catalogue));
    if (poleTotals[p]) {
      poleTotals[p].count++;

    }

    const cur = serviceStats.get(a.service) || { count: 0, revenue: 0 };
    cur.count++;

    serviceStats.set(a.service, cur);
  }

  for (const inv of invoices) {
    if (inv.paymentStatus !== 'PAID') continue;
    const amount = Number(inv.amount) || 0;
    poleTotals[(inv.servicePole as 'kinesitherapie'|'minceur'|'bilan' || getServicePole(inv.serviceSlug, catalogue))].revenue = sumMoney([poleTotals[(inv.servicePole as 'kinesitherapie'|'minceur'|'bilan' || getServicePole(inv.serviceSlug, catalogue))].revenue,amount]);
    const service = serviceStats.get(inv.serviceSlug) || { count: 0, revenue: 0 };
    service.revenue = sumMoney([service.revenue,amount]);
    serviceStats.set(inv.serviceSlug, service);
  }

  const poleRevenueTotal =
    poleTotals.kinesitherapie.revenue + poleTotals.minceur.revenue + poleTotals.bilan.revenue;

  const polesList: Array<{
    pole: 'kinesitherapie' | 'minceur' | 'bilan';
    name: string;
    color: string;
    count: number;
    revenue: number;
    percentage: number;
  }> = [
    {
      pole: 'kinesitherapie',
      name:
        lang === 'pt'
          ? 'Fisioterapia & Reabilitação'
          : lang === 'en'
          ? 'Physiotherapy & Rehab'
          : 'Kinésithérapie & Rééducation',
      color: '#3B82F6',
      count: poleTotals.kinesitherapie.count,
      revenue: poleTotals.kinesitherapie.revenue,
      percentage:
        poleRevenueTotal > 0
          ? Math.round((poleTotals.kinesitherapie.revenue / poleRevenueTotal) * 100)
          : 0,
    },
    {
      pole: 'minceur',
      name:
        lang === 'pt'
          ? 'Estética & Emagrecimento'
          : lang === 'en'
          ? 'Slimming & Esthetics'
          : 'Soins Minceur & Esthétique',
      color: '#C49A3C',
      count: poleTotals.minceur.count,
      revenue: poleTotals.minceur.revenue,
      percentage:
        poleRevenueTotal > 0
          ? Math.round((poleTotals.minceur.revenue / poleRevenueTotal) * 100)
          : 0,
    },
    {
      pole: 'bilan',
      name:
        lang === 'pt'
          ? 'Avaliações Iniciais'
          : lang === 'en'
          ? 'Initial Assessments'
          : 'Bilans & Consultations Initiales',
      color: '#10B981',
      count: poleTotals.bilan.count,
      revenue: poleTotals.bilan.revenue,
      percentage:
        poleRevenueTotal > 0
          ? Math.round((poleTotals.bilan.revenue / poleRevenueTotal) * 100)
          : 0,
    },
  ];

  const topServices = Array.from(serviceStats.entries())
    .map(([slug, data]) => ({
      slug,
      name: getServiceName(slug, lang, catalogue),
      pole: getServicePole(slug, catalogue),
      count: data.count,
      revenue: data.revenue,
      share: total > 0 ? Math.round((data.count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // 2D Occupancy Heatmap Matrix
  const hours = [
    '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
    '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
  ];
  const dowLabels =
    lang === 'pt'
      ? ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
      : lang === 'en'
      ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      : ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  const matrix: number[][] = Array.from({ length: 6 }, () => Array(12).fill(0));
  let maxCount = 0;
  let peakSlot = { dow: dowLabels[0], hour: '09:00', count: 0 };

  for (const a of appts) {
    if (!a.date || !a.startTime) continue;
    const d = new Date(a.date + 'T12:00:00');
    const dow = d.getDay(); // 0 Sun, 1 Mon ... 6 Sat
    if (dow === 0) continue;
    const dowIdx = dow - 1;

    const hourStr = a.startTime.slice(0, 2) + ':00';
    const hourIdx = hours.indexOf(hourStr);
    if (dowIdx >= 0 && dowIdx < 6 && hourIdx >= 0 && hourIdx < 12) {
      matrix[dowIdx][hourIdx]++;
      const cnt = matrix[dowIdx][hourIdx];
      if (cnt > maxCount) {
        maxCount = cnt;
        peakSlot = { dow: dowLabels[dowIdx], hour: a.startTime, count: cnt };
      }
    }
  }

  // Patient Funnel
  let multiCount = 0;
  patientSessionCounts.forEach(cnt => {
    if (cnt > 1) multiCount++;
  });
  const retentionRate =
    uniquePatientsSet.size > 0
      ? Math.round((multiCount / uniquePatientsSet.size) * 100)
      : 0;

  const funnelStages = [
    {
      id: 'booked',
      name:
        lang === 'pt'
          ? 'Consultas Agendadas'
          : lang === 'en'
          ? 'Booked Appointments'
          : 'Consultations Planifiées',
      count: total,
      percentage: 100,
    },
    {
      id: 'confirmed',
      name:
        lang === 'pt'
          ? 'Confirmadas pela Clínica'
          : lang === 'en'
          ? 'Confirmed by Clinic'
          : 'Confirmées par le Cabinet',
      count: confirmed + completed,
      percentage: total > 0 ? Math.round(((confirmed + completed) / total) * 100) : 0,
    },
    {
      id: 'completed',
      name:
        lang === 'pt'
          ? 'Sessões Concluídas'
          : lang === 'en'
          ? 'Completed Sessions'
          : 'Séances Honorées & Réalisées',
      count: completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    },
    {
      id: 'retained',
      name:
        lang === 'pt'
          ? 'Utentes Recorrentes'
          : lang === 'en'
          ? 'Multi-Session Patients'
          : 'Patients Fidélisés (> 1 séance)',
      count: multiCount,
      percentage: total > 0 ? Math.round((multiCount / total) * 100) : 0,
    },
  ];

  // Clinic Occupancy Rate
  const dStart = new Date(start + 'T12:00:00');
  const dEnd = new Date(end + 'T12:00:00');
  const daySpan = Math.max(
    1,
    Math.round((dEnd.getTime() - dStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );
  const configuration=await getSchedulingConfiguration();
  const blocked=await executeQuery<{date:string;time:string;practitionerId:string}>('SELECT date,time,practitionerId FROM blocked_slots WHERE date>=? AND date<=?',[start,end]);
  const providers=configuration.practitioners.filter(p=>(p.active || appts.some(a=>a.practitionerId===p.id)) && (targetPole==='all'||configuration.services.some(s=>s.practitionerId===p.id&&getServicePole(s.service, catalogue)===targetPole)));
  let capacityMinutes=0,occupiedMinutes=0;
  for(let i=0;i<daySpan;i++){
    const day=new Date(start+'T12:00:00Z');day.setUTCDate(day.getUTCDate()+i);const date=day.toISOString().slice(0,10);
    for(const p of providers){
      const free=new Uint8Array(1440);
      for(const [s,e] of practitionerIntervals(configuration,p.id,date))free.fill(1,s,e);
      for(const block of blocked.filter(b=>b.date===date&&(b.practitionerId==='*'||b.practitionerId===p.id)))free.fill(0,clockMinutes(block.time),Math.min(1440,clockMinutes(block.time)+30));
      capacityMinutes+=free.reduce((a,b)=>a+b,0);
      const used=new Uint8Array(1440);
      for(const a of appts.filter(a=>a.date===date&&a.practitionerId===p.id&&a.status!=='CANCELLED'))used.fill(1,Math.max(0,clockMinutes(a.startTime)-a.bufferBefore),Math.min(1440,clockMinutes(a.startTime)+a.durationMinutes+a.bufferAfter));
      occupiedMinutes+=used.reduce((sum,value,minute)=>sum+value*free[minute],0);
    }
  }
  // Historical schedules are not versioned; historical occupancy uses current configured hours.
  const occupancyRate=capacityMinutes?Math.round(occupiedMinutes/capacityMinutes*100):0;

  // Payments & Coverage
  const totalPaidCount = Array.from(methodMap.values()).reduce((sum, v) => sum + v.count, 0);
  const paymentsByMethod = Array.from(methodMap.entries()).map(([method, data]) => ({
    method,
    count: data.count,
    amount: toCents(data.amount)/100,
    percentage: totalPaidCount > 0 ? Math.round((data.count / totalPaidCount) * 100) : 0,
  }));

  const totalCoverageCount = Array.from(coverageMap.values()).reduce((sum, v) => sum + v, 0);
  const paymentsByCoverage = Array.from(coverageMap.entries()).map(([coverage, count]) => ({
    coverage,
    count,
    percentage: totalCoverageCount > 0 ? Math.round((count / totalCoverageCount) * 100) : 0,
  }));

  // Backwards-compatible legacy analyticsData
  const dowCounts = [0, 0, 0, 0, 0, 0, 0];
  for (const a of appts) {
    if (!a.date) continue;
    const d = new Date(a.date + 'T12:00:00');
    const dow = d.getDay();
    const idx = (dow + 6) % 7;
    dowCounts[idx]++;
  }

  const legacyPeakHours: [string, number][] = hours
    .map(h => {
      const sum = matrix.reduce((acc, row) => acc + (row[hours.indexOf(h)] || 0), 0);
      return [h, sum] as [string, number];
    })
    .filter(item => item[1] > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const cancelRate = total > 0 ? Math.round(((cancelled + noShow) / total) * 100) : 0;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    stats: {
      total,
      confirmed,
      pending,
      completed,
      cancelled,
      noShow,
      revenue,
      totalRevenue: totalBilled,
      totalBilled,
      totalPaid: paidInvoicesRevenue,
      totalPending: unpaidAmount,
      countPaid: totalPaidCount,
      countPending: unpaidCount,
      invoicesCount: activeInvoicesCount,
      paidInvoicesRevenue,
      avgTicket,
      occupancyRate,
      lostRevenue,
      uniquePatients: uniquePatientsSet.size,
    },
    comparison: {
      revenueGrowthPct,
      appointmentsGrowthPct,
      priorRevenue,
      priorAppointments,
    },
    timeline: {
      granularity,
      points: timelinePoints,
    },
    departmentData: {
      poles: polesList,
      topServices,
    },
    heatmap: {
      dowLabels,
      hours,
      matrix,
      maxCount,
      peakSlot,
    },
    funnel: {
      stages: funnelStages,
      cancellationsCount: cancelled,
      noShowsCount: noShow,
      lostRevenue,
      retentionRate,
    },
    payments: {
      byMethod: paymentsByMethod,
      byCoverage: paymentsByCoverage,
      unpaidCount,
      unpaidAmount,
    },
    analyticsData: {
      dowLabels:
        lang === 'pt'
          ? ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
          : lang === 'en'
          ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
          : ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
      dowCounts,
      topServices: topServices.map(s => [s.slug, s.count]),
      peakHours: legacyPeakHours,
      cancelRate,
      completionRate,
    },
    range: {
      type: rangeType,
      startDate: start,
      endDate: end,
      pole: targetPole,
    },
  };
}

/**
 * Health check validation verifying live read and write readiness
 */
export async function dbHealthCheck(): Promise<{
  status: 'connected';
  engine: 'turso_cloud' | 'local_sqlite';
  latencyMs: number;
  writable: boolean;
}> {
  const start = Date.now();
  await executeQuery('SELECT 1 as ok');
  const latencyMs = Date.now() - start;

  const engine = isTursoEnabled() ? 'turso_cloud' : 'local_sqlite';

  let writable = true;
  try {
    const now = Date.now();
    await executeQuery(
      'INSERT INTO rate_limit_log (ip, action, timestamp) VALUES (?, ?, ?)',
      ['health_check', 'ping', now]
    );
    await executeQuery(
      'DELETE FROM rate_limit_log WHERE ip = ? AND action = ? AND timestamp = ?',
      ['health_check', 'ping', now]
    );
  } catch {
    writable = false;
  }

  return {
    status: 'connected',
    engine,
    latencyMs,
    writable,
  };
}



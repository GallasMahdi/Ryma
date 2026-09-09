// better-sqlite3 is only imported lazily inside getDb() to avoid crashing on
// Vercel serverless where the native .node binary cannot be loaded.
// At module level we only declare the type.
import { createClient, type Client as LibSqlClient } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import { getServicePrice, type PatientRecord, type PatientSession, type Invoice, type CreateInvoiceInput, type InvoiceStats, type PatientPrescription, type PrescriptionItem, type Review, type ReviewStatus, type CreateReviewInput } from '@/types/admin';
import { TESTIMONIALS } from '@/data/testimonials';
import { SITE } from '@/lib/site';
import { phonesMatch } from '@/lib/phone';
import { broadcastAppointmentCreated, broadcastMultipleAppointmentsCreated } from '@/lib/events';
import { VALID_TIME_SLOTS, getLisbonDateTime } from '@/lib/validation';
import { env } from '@/lib/env';

// ─── Dual Storage Engine: Dynamic Turso (Cloud) with Local Fallback ───────────
let _tursoClient: LibSqlClient | null = null;
let _tursoInitialized = false;

function isTursoEnabled(): boolean {
  return Boolean(process.env.TURSO_DATABASE_URL);
}

async function ensureTursoSchema(client: LibSqlClient): Promise<void> {
  if (_tursoInitialized) return;

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
        serviceSlug  TEXT NOT NULL DEFAULT 'kinesitherapie-generale',
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
      `CREATE TRIGGER IF NOT EXISTS trg_prevent_blocked_booking
       BEFORE INSERT ON appointments
       FOR EACH ROW
       WHEN EXISTS (
         SELECT 1 FROM blocked_slots WHERE date = NEW.date AND time = NEW.startTime
       )
       BEGIN
         SELECT RAISE(ABORT, 'slot_blocked');
       END`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_active_slot ON appointments(date, startTime) WHERE status != 'CANCELLED'`,
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
          `CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_active_slot ON appointments(date, startTime) WHERE status != 'CANCELLED'`,
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

    _tursoInitialized = true;
    const isServerless = Boolean(
      process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY
    );
    if (!isServerless) {
      await syncTursoToLocalSqlite(client);
    }
  } catch (migErr) {
    console.warn('[Turso Migration Note]:', migErr);
  }
}

async function syncTursoToLocalSqlite(client: LibSqlClient): Promise<void> {
  try {
    const tursoAppts = await client.execute('SELECT * FROM appointments');
    const localDb = getDb();
    const countRes = localDb.prepare('SELECT COUNT(*) as cnt FROM appointments').get() as { cnt: number };

    if (tursoAppts.rows.length > 0 && countRes.cnt < tursoAppts.rows.length) {
      const insertStmt = localDb.prepare(`
        INSERT OR REPLACE INTO appointments
        (id, patientName, email, phone, service, date, startTime, status, notes, coverageType, coverageProvider, coverageNumber, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const row of tursoAppts.rows as any[]) {
        insertStmt.run(
          String(row.id),
          String(row.patientName),
          row.email ? String(row.email) : null,
          String(row.phone),
          String(row.service),
          String(row.date),
          String(row.startTime),
          String(row.status),
          row.notes ? String(row.notes) : null,
          row.coverageType ? String(row.coverageType) : 'PARTICULAR',
          row.coverageProvider ? String(row.coverageProvider) : null,
          row.coverageNumber ? String(row.coverageNumber) : null,
          String(row.createdAt),
          String(row.updatedAt)
        );
      }
    }
  } catch (syncErr) {
    console.warn('[Turso Initial Sync Warning]:', syncErr);
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
    return executeSqliteQuery<T>(sql, args);
  }

  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const client = getTursoClient();
      await ensureTursoSchema(client);
      const res = await client.execute({ sql, args });
      return res.rows as unknown as T[];
    } catch (err) {
      _tursoClient = null;
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
      serviceSlug  TEXT NOT NULL DEFAULT 'kinesitherapie-generale',
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

    CREATE TRIGGER IF NOT EXISTS trg_prevent_blocked_booking
    BEFORE INSERT ON appointments
    FOR EACH ROW
    WHEN EXISTS (
      SELECT 1 FROM blocked_slots WHERE date = NEW.date AND time = NEW.startTime
    )
    BEGIN
      SELECT RAISE(ABORT, 'slot_blocked');
    END;

    CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_active_slot ON appointments(date, startTime) WHERE status != 'CANCELLED';
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
        CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_active_slot ON appointments(date, startTime) WHERE status != 'CANCELLED';
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
}

// ─── Unified Async Query Abstraction with Automatic Fallback & Dual-Write ─────
export async function executeQuery<T = any>(sql: string, args: any[] = []): Promise<T[]> {
  const trimmed = sql.trim().toUpperCase();
  const isWrite = trimmed.startsWith('INSERT') || trimmed.startsWith('UPDATE') || trimmed.startsWith('DELETE');

  if (isTursoEnabled()) {
    let rows: T[] | null = null;
    let tursoSucceeded = false;

    // Retry up to 2 times to handle transient HTTP socket/keep-alive disconnects
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const client = getTursoClient();
        await ensureTursoSchema(client);
        const res = await client.execute({ sql, args });
        rows = res.rows as unknown as T[];
        tursoSucceeded = true;
        break;
      } catch (tursoErr) {
        console.warn(`[Turso Query Attempt ${attempt} Warning]:`, (tursoErr as Error).message);
        _tursoClient = null; // Reset client instance to force fresh HTTP socket
        if (attempt === 2) {
          console.error('[Turso Max Retries Exceeded - Falling back to local SQLite]:', tursoErr);
        }
      }
    }

    // Dual-write: Mirror write operations to local SQLite only in local non-serverless dev
    const isServerless = Boolean(
      process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY
    );
    if (isWrite && !isServerless) {
      try {
        executeSqliteQuery<T>(sql, args);
      } catch (sqliteErr) {
        console.warn('[Local SQLite Dual-Write Warning]:', sqliteErr);
      }
    }

    if (tursoSucceeded && rows !== null) {
      return rows;
    }

    // In production, never silently fall back to ephemeral SQLite unless explicitly configured
    if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_SQLITE_FALLBACK) {
      throw new Error('[CRITICAL DB SAFETY] Turso database query failed in production. Silent fallback to local ephemeral SQLite is blocked to prevent data loss.');
    }

    // On serverless, never fall back to SQLite — it will crash on a read-only filesystem.
    if (isServerless) {
      throw new Error('[DB] Turso query failed in serverless environment with no fallback available.');
    }

    return executeSqliteQuery<T>(sql, args);
  } else {
    if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_SQLITE_FALLBACK) {
      throw new Error('[FATAL DB CONFIG] TURSO_DATABASE_URL is not configured in production runtime. Cannot fall back to ephemeral SQLite.');
    }
    // Turso not configured — local dev only path
    return executeSqliteQuery<T>(sql, args);
  }
}

function executeSqliteQuery<T = any>(sql: string, args: any[] = []): T[] {
  const db = getDb();
  const trimmed = sql.trim().toUpperCase();
  if (trimmed.startsWith('SELECT') || trimmed.startsWith('PRAGMA')) {
    return db.prepare(sql).all(...args) as T[];
  } else {
    const res = db.prepare(sql).run(...args);
    return [{ changes: res.changes, lastInsertRowid: res.lastInsertRowid }] as unknown as T[];
  }
}

// ─── Public Export Types ──────────────────────────────────────────────────────
import { validateAndNormalizePhone } from '@/lib/phone';
export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';

export interface Appointment {
  id: string;
  patientName: string;
  email: string | null;
  phone: string;
  service: string;
  date: string;
  startTime: string;
  status: AppointmentStatus;
  notes: string | null;
  coverageType: string;
  coverageProvider: string | null;
  coverageNumber: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppointmentInput {
  patientName: string;
  email?: string;
  phone: string;
  service: string;
  date: string;
  startTime: string;
  status?: AppointmentStatus;
  notes?: string;
  coverageType?: string;
  coverageProvider?: string;
  coverageNumber?: string;
}

export type AddAppointmentResult =
  | { success: true; appointment: Appointment }
  | { success: false; error: 'slot_taken' | 'invalid_data' | 'slot_blocked' };

// ─── Slot Availability Checker (Unified Single Source of Truth) ───────────────
export interface SlotAvailabilityResult {
  available: boolean;
  reason?: 'sunday' | 'past' | 'booked' | 'blocked' | 'invalid_time' | 'invalid_date';
}

/**
 * Authoritative availability check used by ALL booking flows:
 * Client booking, Admin single booking, and Multiple Sessions scheduler.
 */
export async function dbCheckSlotAvailability(date: string, startTime: string): Promise<SlotAvailabilityResult> {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { available: false, reason: 'invalid_date' };
  }
  if (!startTime) {
    return { available: false, reason: 'invalid_time' };
  }

  // 1. Sunday check
  const dayOfWeek = new Date(date + 'T12:00:00').getDay();
  if (dayOfWeek === 0) {
    return { available: false, reason: 'sunday' };
  }

  // 2. Past slot check (strictly evaluated in Europe/Lisbon clinic timezone)
  const { todayStr, currentHHMM } = getLisbonDateTime();
  if (date < todayStr) {
    return { available: false, reason: 'past' };
  }
  if (date === todayStr) {
    if (startTime <= currentHHMM) {
      return { available: false, reason: 'past' };
    }
  }

  // 3. Blocked slots check (manual admin blocks)
  const blockedRows = await executeTursoDirectly(
    'SELECT 1 FROM blocked_slots WHERE date = ? AND time = ?',
    [date, startTime]
  );
  if (blockedRows.length > 0) {
    return { available: false, reason: 'blocked' };
  }

  // 4. Existing active appointments check (status != CANCELLED)
  const conflictRows = await executeTursoDirectly(
    "SELECT 1 FROM appointments WHERE date = ? AND startTime = ? AND status != 'CANCELLED'",
    [date, startTime]
  );
  if (conflictRows.length > 0) {
    return { available: false, reason: 'booked' };
  }

  return { available: true };
}

/**
 * High-performance batched availability checker across multiple dates.
 * Executes in a single parallel query batch instead of hundreds of sequential roundtrips.
 */
export async function dbCheckMultipleDatesAvailability(
  dates: string[],
  timeSlots: readonly string[] | string[] = VALID_TIME_SLOTS
): Promise<Map<string, { time: string; available: boolean; reason?: 'sunday' | 'past' | 'booked' | 'blocked' }[]>> {
  const uniqueDates = Array.from(new Set(dates.filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))));
  const resultMap = new Map<string, { time: string; available: boolean; reason?: 'sunday' | 'past' | 'booked' | 'blocked' }[]>();

  if (uniqueDates.length === 0) {
    return resultMap;
  }

  const placeholders = uniqueDates.map(() => '?').join(',');

  // Query booked and blocked slots for all dates in parallel
  const [bookedRows, blockedRows] = await Promise.all([
    executeTursoDirectly<{ date: string; startTime: string }>(
      `SELECT date, startTime FROM appointments WHERE date IN (${placeholders}) AND status != 'CANCELLED'`,
      uniqueDates
    ),
    executeTursoDirectly<{ date: string; time: string }>(
      `SELECT date, time FROM blocked_slots WHERE date IN (${placeholders})`,
      uniqueDates
    ),
  ]);

  const bookedSet = new Set(bookedRows.map(r => `${r.date}_${r.startTime}`));
  const blockedSet = new Set(blockedRows.map(r => `${r.date}_${r.time}`));

  const { todayStr, currentHHMM } = getLisbonDateTime();

  for (const date of uniqueDates) {
    const dayOfWeek = new Date(date + 'T12:00:00').getDay();
    const isSunday = dayOfWeek === 0;
    const isPastDate = date < todayStr;
    const isToday = date === todayStr;

    const daySlots: { time: string; available: boolean; reason?: 'sunday' | 'past' | 'booked' | 'blocked' }[] = [];

    for (const time of timeSlots) {
      if (isSunday) {
        daySlots.push({ time, available: false, reason: 'sunday' });
        continue;
      }
      if (isPastDate || (isToday && time <= currentHHMM)) {
        daySlots.push({ time, available: false, reason: 'past' });
        continue;
      }
      if (blockedSet.has(`${date}_${time}`)) {
        daySlots.push({ time, available: false, reason: 'blocked' });
        continue;
      }
      if (bookedSet.has(`${date}_${time}`)) {
        daySlots.push({ time, available: false, reason: 'booked' });
        continue;
      }

      daySlots.push({ time, available: true });
    }

    resultMap.set(date, daySlots);
  }

  return resultMap;
}

// ─── Appointment Helpers ──────────────────────────────────────────────────────
export async function dbCreateAppointment(input: CreateAppointmentInput): Promise<AddAppointmentResult> {
  const id = 'apt_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
  const now = new Date().toISOString();

  // Normalize phone number
  const phoneValidation = validateAndNormalizePhone(input.phone);
  const normalizedPhone = phoneValidation.isValid ? phoneValidation.normalized : input.phone.trim();

  // Use authoritative single source of truth availability check
  const availability = await dbCheckSlotAvailability(input.date, input.startTime);
  if (!availability.available) {
    if (availability.reason === 'blocked') return { success: false, error: 'slot_blocked' };
    return { success: false, error: 'slot_taken' };
  }

  const initialStatus = input.status ?? 'PENDING';

  try {
    await executeTursoDirectly(
      `INSERT INTO appointments
        (id, patientName, email, phone, service, date, startTime, status, notes, coverageType, coverageProvider, coverageNumber, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.patientName,
        input.email ?? null,
        normalizedPhone,
        input.service,
        input.date,
        input.startTime,
        initialStatus,
        input.notes ?? null,
        input.coverageType ?? 'PARTICULAR',
        input.coverageProvider ?? null,
        input.coverageNumber ?? null,
        now,
        now,
      ]
    );

    // Mirror the new appointment to local SQLite for consistency (only in local non-serverless dev)
    const isServerless = Boolean(
      process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY
    );
    if (!isServerless) {
      try {
        executeSqliteQuery(
          `INSERT OR REPLACE INTO appointments
            (id, patientName, email, phone, service, date, startTime, status, notes, coverageType, coverageProvider, coverageNumber, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, input.patientName, input.email ?? null, normalizedPhone, input.service, input.date, input.startTime, initialStatus, input.notes ?? null, input.coverageType ?? 'PARTICULAR', input.coverageProvider ?? null, input.coverageNumber ?? null, now, now]
        );
      } catch { /* silent — local SQLite is only a mirror */ }
    }

    const rows = await executeTursoDirectly<Appointment>('SELECT * FROM appointments WHERE id = ?', [id]);
    const appointment = rows[0];

    await dbUpsertPatient({
      patientName: input.patientName,
      phone: normalizedPhone,
      email: input.email ?? null,
      coverageType: (input.coverageType as any) ?? 'PARTICULAR',
      coverageProvider: input.coverageProvider ?? null,
      coverageNumber: input.coverageNumber ?? null,
      medicalHistory: input.notes ? `Marcação online: ${input.notes}` : '',
    });

    return { success: true, appointment };
  } catch (err: any) {
    if (err?.message?.includes('slot_blocked')) {
      return { success: false, error: 'slot_blocked' };
    }
    if (err?.message?.includes('UNIQUE') || err?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return { success: false, error: 'slot_taken' };
    }
    throw err;
  }
}

// ─── Multiple Sessions Creation (Atomic & Concurrency-Protected) ─────────────
export interface CreateMultipleAppointmentsInput {
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
    }
  | {
      success: false;
      error: 'slot_conflict' | 'empty_sessions' | 'invalid_input' | 'slot_taken';
      message: string;
      conflicts?: SessionConflictItem[];
    };

export async function dbCreateMultipleAppointments(
  input: CreateMultipleAppointmentsInput
): Promise<CreateMultipleAppointmentsResult> {
  if (!input.sessions || input.sessions.length === 0) {
    return { success: false, error: 'empty_sessions', message: 'Nenhuma sessão fornecida para marcação.' };
  }

  const phoneValidation = validateAndNormalizePhone(input.phone);
  const normalizedPhone = phoneValidation.isValid ? phoneValidation.normalized : input.phone.trim();

  // 1. Check for duplicates inside the requested batch itself
  const seenSlots = new Set<string>();
  const conflicts: SessionConflictItem[] = [];

  for (let i = 0; i < input.sessions.length; i++) {
    const s = input.sessions[i];
    const key = `${s.date}_${s.startTime}`;
    if (seenSlots.has(key)) {
      conflicts.push({
        date: s.date,
        startTime: s.startTime,
        reason: 'duplicate_in_request',
        sessionIndex: i + 1,
      });
    }
    seenSlots.add(key);
  }

  // 2. Validate EVERY session slot using high-performance batched availability engine
  const uniqueDates = Array.from(new Set(input.sessions.map(s => s.date)));
  const dayAvailabilityMap = await dbCheckMultipleDatesAvailability(uniqueDates);

  for (let i = 0; i < input.sessions.length; i++) {
    const s = input.sessions[i];
    const daySlots = dayAvailabilityMap.get(s.date) || [];
    const targetSlot = daySlots.find(slot => slot.time === s.startTime);
    const isAvailable = targetSlot ? targetSlot.available : false;
    const reason: string = (targetSlot && !targetSlot.available ? targetSlot.reason : 'booked') || 'booked';

    if (!isAvailable) {
      conflicts.push({
        date: s.date,
        startTime: s.startTime,
        reason,
        sessionIndex: i + 1,
      });
    }
  }

  // 3. If any conflict exists, abort immediately with full conflict report
  if (conflicts.length > 0) {
    return {
      success: false,
      error: 'slot_conflict',
      message: 'Foram detetados conflitos de horários em algumas sessões solicitadas.',
      conflicts,
    };
  }

  // 4. Ensure patient record exists
  const upsertRes = await dbUpsertPatient({
    patientName: input.patientName,
    phone: normalizedPhone,
    email: input.email ?? null,
    coverageType: (input.coverageType as any) ?? 'PARTICULAR',
    coverageProvider: input.coverageProvider ?? null,
    coverageNumber: input.coverageNumber ?? null,
  });

  const patientId = input.patientId || upsertRes.id || ('pat_' + Date.now().toString(36));
  const now = new Date().toISOString();
  const createdAppointments: Appointment[] = [];
  const createdSessions: PatientSession[] = [];

  const isServerless = Boolean(
    process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY
  );

  // 5. Build prepared objects for all appointments and sessions
  const appointmentInserts: { id: string; row: Appointment; args: any[] }[] = [];
  const sessionInserts: { id: string; row: PatientSession; args: any[] }[] = [];

  for (let i = 0; i < input.sessions.length; i++) {
    const s = input.sessions[i];
    const aptId = 'apt_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
    const sessId = 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
    const evaScore = typeof s.evaPainScore === 'number' ? s.evaPainScore : 5;
    const sessionNote = s.notes || `Sessão #${i + 1} • Plano de Tratamento`;

    const apptArgs = [
      aptId,
      input.patientName,
      input.email ?? null,
      normalizedPhone,
      input.service,
      s.date,
      s.startTime,
      'CONFIRMED',
      sessionNote,
      input.coverageType ?? 'PARTICULAR',
      input.coverageProvider ?? null,
      input.coverageNumber ?? null,
      now,
      now,
    ];

    const apptRow: Appointment = {
      id: aptId,
      patientName: input.patientName,
      email: input.email ?? null,
      phone: normalizedPhone,
      service: input.service,
      date: s.date,
      startTime: s.startTime,
      status: 'CONFIRMED',
      notes: sessionNote,
      coverageType: input.coverageType ?? 'PARTICULAR',
      coverageProvider: input.coverageProvider ?? null,
      coverageNumber: input.coverageNumber ?? null,
      createdAt: now,
      updatedAt: now,
    };

    const sessArgs = [
      sessId,
      patientId,
      s.date,
      s.startTime,
      input.service,
      evaScore,
      'MANUAL',
      sessionNote,
      input.practitioner ?? null,
      now,
    ];

    const sessRow: PatientSession = {
      id: sessId,
      patientId,
      date: s.date,
      time: s.startTime,
      serviceSlug: input.service,
      evaPainScore: evaScore,
      sessionType: 'MANUAL',
      notes: sessionNote,
      practitioner: input.practitioner ?? undefined,
      createdAt: now,
    };

    appointmentInserts.push({ id: aptId, row: apptRow, args: apptArgs });
    sessionInserts.push({ id: sessId, row: sessRow, args: sessArgs });
  }

  // 6. Execute atomic transaction batch
  try {
    if (isTursoEnabled()) {
      const client = getTursoClient();
      await ensureTursoSchema(client);

      const batchStatements: { sql: string; args: any[] }[] = [];

      for (const item of appointmentInserts) {
        batchStatements.push({
          sql: `INSERT INTO appointments
                (id, patientName, email, phone, service, date, startTime, status, notes, coverageType, coverageProvider, coverageNumber, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: item.args,
        });
      }

      for (const item of sessionInserts) {
        batchStatements.push({
          sql: `INSERT INTO patient_sessions
                (id, patientId, date, time, serviceSlug, evaPainScore, sessionType, notes, practitioner, createdAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: item.args,
        });
      }

      batchStatements.push({
        sql: `UPDATE patients SET totalPrescribedSessions = MAX(totalPrescribedSessions, ?), updatedAt = ? WHERE id = ?`,
        args: [input.sessions.length, now, patientId],
      });

      // LibSQL client.batch executes in a single transaction on Turso
      await client.batch(batchStatements, 'write');
    } else {
      // Local SQLite atomic transaction
      const db = getDb();
      const insertAppt = db.prepare(`
        INSERT INTO appointments
        (id, patientName, email, phone, service, date, startTime, status, notes, coverageType, coverageProvider, coverageNumber, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const insertSess = db.prepare(`
        INSERT INTO patient_sessions
        (id, patientId, date, time, serviceSlug, evaPainScore, sessionType, notes, practitioner, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const updatePat = db.prepare(`
        UPDATE patients SET totalPrescribedSessions = MAX(totalPrescribedSessions, ?), updatedAt = ? WHERE id = ?
      `);

      const runBatchTx = db.transaction(() => {
        for (const item of appointmentInserts) {
          insertAppt.run(...item.args);
        }
        for (const item of sessionInserts) {
          insertSess.run(...item.args);
        }
        updatePat.run(input.sessions.length, now, patientId);
      });

      runBatchTx();
    }

    createdAppointments.push(...appointmentInserts.map(i => i.row));
    createdSessions.push(...sessionInserts.map(i => i.row));
  } catch (err: any) {
    if (err?.message?.includes('UNIQUE') || err?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return {
        success: false,
        error: 'slot_taken',
        message: 'Um dos horários foi ocupado em simultâneo por outra marcação.',
      };
    }
    throw err;
  }

  // Update patient total prescribed sessions to reflect total planned sessions
  try {
    await executeTursoDirectly(
      `UPDATE patients SET totalPrescribedSessions = MAX(totalPrescribedSessions, ?), updatedAt = ? WHERE id = ?`,
      [input.sessions.length, now, patientId]
    );
  } catch { /* silent */ }

  // Broadcast real-time batch event to update all open admin tabs in a single notification
  try {
    broadcastMultipleAppointmentsCreated(createdAppointments);
  } catch { /* silent */ }

  return {
    success: true,
    appointments: createdAppointments,
    patientSessions: createdSessions,
    patientId,
  };
}

export async function dbGetAppointments(filters?: {
  status?: string;
  date?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<Appointment[]> {
  let sql = 'SELECT * FROM appointments WHERE 1=1';
  const params: (string | number)[] = [];

  if (filters?.status && filters.status !== 'all') {
    sql += ' AND status = ?';
    params.push(filters.status.toUpperCase());
  }
  if (filters?.date) {
    sql += ' AND date = ?';
    params.push(filters.date);
  }
  if (filters?.search) {
    sql += ' AND (patientName LIKE ? OR phone LIKE ? OR service LIKE ?)';
    const q = `%${filters.search}%`;
    params.push(q, q, q);
  }

  sql += ' ORDER BY date DESC, startTime ASC';

  if (typeof filters?.limit === 'number' && filters.limit > 0) {
    sql += ' LIMIT ?';
    params.push(filters.limit);
    if (typeof filters?.offset === 'number' && filters.offset >= 0) {
      sql += ' OFFSET ?';
      params.push(filters.offset);
    }
  }

  return executeQuery<Appointment>(sql, params);
}

export async function dbGetAppointmentsPaginated(options: {
  page?: number;
  limit?: number;
  status?: string;
  date?: string;
  search?: string;
}): Promise<{
  appointments: Appointment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(100, Math.max(1, options.limit ?? 50));
  const offset = (page - 1) * limit;

  let countSql = 'SELECT COUNT(*) as cnt FROM appointments WHERE 1=1';
  const countParams: (string | number)[] = [];

  if (options.status && options.status !== 'all') {
    countSql += ' AND status = ?';
    countParams.push(options.status.toUpperCase());
  }
  if (options.date) {
    countSql += ' AND date = ?';
    countParams.push(options.date);
  }
  if (options.search) {
    countSql += ' AND (patientName LIKE ? OR phone LIKE ? OR service LIKE ?)';
    const q = `%${options.search}%`;
    countParams.push(q, q, q);
  }

  const [countRes, appointments] = await Promise.all([
    executeQuery<{ cnt: number }>(countSql, countParams),
    dbGetAppointments({
      status: options.status,
      date: options.date,
      search: options.search,
      limit,
      offset,
    }),
  ]);

  const total = Number(countRes[0]?.cnt ?? 0);
  const totalPages = Math.ceil(total / limit) || 1;

  return {
    appointments,
    total,
    page,
    limit,
    totalPages,
  };
}

export async function dbGetAppointmentById(id: string): Promise<Appointment | null> {
  const rows = await executeQuery<Appointment>('SELECT * FROM appointments WHERE id = ?', [id]);
  return rows[0] ?? null;
}

export async function dbUpdateAppointment(
  id: string,
  fields: Partial<Pick<Appointment, 'status' | 'notes' | 'date' | 'startTime' | 'coverageType' | 'coverageProvider' | 'coverageNumber'>>
): Promise<Appointment | null> {
  const updates: string[] = [];
  const params: (string | number)[] = [];

  if (fields.status !== undefined)           { updates.push('status = ?');           params.push(fields.status); }
  if (fields.notes !== undefined)            { updates.push('notes = ?');            params.push(fields.notes ?? ''); }
  if (fields.date !== undefined)             { updates.push('date = ?');             params.push(fields.date); }
  if (fields.startTime !== undefined)        { updates.push('startTime = ?');        params.push(fields.startTime); }
  if (fields.coverageType !== undefined)     { updates.push('coverageType = ?');     params.push(fields.coverageType); }
  if (fields.coverageProvider !== undefined) { updates.push('coverageProvider = ?'); params.push(fields.coverageProvider ?? ''); }
  if (fields.coverageNumber !== undefined)   { updates.push('coverageNumber = ?');   params.push(fields.coverageNumber ?? ''); }

  if (updates.length === 0) return dbGetAppointmentById(id);

  updates.push('updatedAt = ?');
  params.push(new Date().toISOString());
  params.push(id);

  await executeQuery(`UPDATE appointments SET ${updates.join(', ')} WHERE id = ?`, params);
  return dbGetAppointmentById(id);
}

export async function dbDeleteAppointment(id: string): Promise<boolean> {
  const existing = await dbGetAppointmentById(id);
  if (!existing) return false;

  await executeQuery('DELETE FROM appointments WHERE id = ?', [id]);
  return true;
}

// ─── Blocked Slots Helpers ────────────────────────────────────────────────────
export async function dbGetBlockedSlots(): Promise<{ date: string; time: string }[]> {
  return executeQuery<{ date: string; time: string }>('SELECT date, time FROM blocked_slots');
}

export async function dbToggleBlockSlot(date: string, time: string): Promise<boolean> {
  const existing = await executeQuery('SELECT id FROM blocked_slots WHERE date = ? AND time = ?', [date, time]);
  if (existing.length > 0) {
    await executeQuery('DELETE FROM blocked_slots WHERE date = ? AND time = ?', [date, time]);
    return false;
  } else {
    const id = 'blk_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
    await executeQuery('INSERT INTO blocked_slots (id, date, time) VALUES (?, ?, ?)', [id, date, time]);
    return true;
  }
}

export async function dbIsSlotAvailable(date: string, time: string): Promise<boolean> {
  const res = await dbCheckSlotAvailability(date, time);
  return res.available;
}

// ─── Rate Limiting Helpers ────────────────────────────────────────────────────
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
  const oneHourAgo = Date.now() - 3600 * 1000;
  await executeQuery('DELETE FROM rate_limit_log WHERE timestamp < ?', [oneHourAgo]);
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
    console.warn('[Security Settings Query Warning]:', err);
  }
  return env.OWNER_ANALYTICS_PASSWORD_HASH;
}

export async function dbSetOwnerAnalyticsPasswordHash(newHash: string): Promise<void> {
  const now = new Date().toISOString();
  await executeQuery(
    `INSERT INTO security_settings (key, value, updatedAt)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt`,
    ['analytics_owner_password_hash', newHash, now]
  );
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
    return false;
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
  const phoneValidation = validateAndNormalizePhone(phone);
  const normalizedPhone = phoneValidation.isValid ? phoneValidation.normalized : phone.trim();
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
  const existing = await dbGetPatientNote(phone);
  if (existing) return existing;

  const now = new Date().toISOString();
  const phoneValidation = validateAndNormalizePhone(phone);
  const normalizedPhone = phoneValidation.isValid ? phoneValidation.normalized : phone.trim();
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

export async function dbUpsertPatient(input: {
  id?: string;
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
  const phoneValidation = validateAndNormalizePhone(input.phone);
  const normalizedPhone = phoneValidation.isValid ? phoneValidation.normalized : input.phone.trim();

  const existing = input.id ? await dbGetPatientById(input.id) : await dbGetPatientByPhone(normalizedPhone);
  const id = existing?.id ?? input.id ?? ('pat_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6));

  const covType = input.coverageType ?? (existing as any)?.coverageType ?? 'PARTICULAR';
  const covProv = input.coverageProvider ?? (existing as any)?.coverageProvider ?? null;
  const covNum = input.coverageNumber ?? (existing as any)?.coverageNumber ?? null;

  if (existing) {
    await executeQuery(
      `UPDATE patients SET
        patientName = ?, phone = ?, email = ?, gender = ?, dob = ?,
        coverageType = ?, coverageProvider = ?, coverageNumber = ?, referringDoctor = ?, pathologyTags = ?,
        medicalHistory = ?, totalPrescribedSessions = ?, updatedAt = ?
       WHERE id = ?`,
      [
        input.patientName,
        normalizedPhone,
        input.email ?? null,
        input.gender ?? null,
        input.dob ?? null,
        covType,
        covProv,
        covNum,
        input.referringDoctor ?? null,
        input.pathologyTags ?? '',
        input.medicalHistory ?? '',
        input.totalPrescribedSessions ?? 10,
        now,
        id,
      ]
    );
  } else {
    await executeQuery(
      `INSERT INTO patients (
        id, patientName, phone, email, gender, dob, coverageType, coverageProvider, coverageNumber,
        referringDoctor, pathologyTags, medicalHistory, totalPrescribedSessions, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
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
        input.pathologyTags ?? '',
        input.medicalHistory ?? '',
        input.totalPrescribedSessions ?? 10,
        now,
        now,
      ]
    );
  }

  await dbUpsertPatientNote(normalizedPhone, input.patientName, input.medicalHistory ?? '', input.pathologyTags ?? '');
  return (await dbGetPatientById(id))!;
}

export async function dbDeletePatientRecord(idOrPhone: string): Promise<void> {
  const p = (await dbGetPatientById(idOrPhone)) ?? (await dbGetPatientByPhone(idOrPhone));
  if (p) {
    const phoneValidation = validateAndNormalizePhone(p.phone);
    const normPhone = phoneValidation.isValid ? phoneValidation.normalized : p.phone.trim();
    
    // Clinical Governance & Audit Trail: Never delete past consultations.
    // Only cancel future pending appointments.
    const today = new Date().toISOString().split('T')[0];

    const queries: { sql: string; args: any[] }[] = [
      {
        sql: "UPDATE appointments SET status = 'CANCELLED', notes = COALESCE(notes || ' | ', '') || 'Paciente removido do sistema' WHERE (phone = ? OR phone = ?) AND date >= ? AND status = 'PENDING'",
        args: [p.phone, normPhone, today],
      },
      {
        sql: 'DELETE FROM patient_sessions WHERE patientId = ?',
        args: [p.id],
      },
      {
        sql: 'DELETE FROM prescriptions WHERE patientId = ? OR patientPhone = ? OR patientPhone = ?',
        args: [p.id, p.phone, normPhone],
      },
      {
        sql: 'DELETE FROM patient_notes WHERE phone = ? OR phone = ? OR phone = ?',
        args: [p.phone, normPhone, idOrPhone],
      },
      {
        // Preserve invoices for tax audit trail, but annotate them clearly
        sql: "UPDATE invoices SET notes = COALESCE(notes || ' | ', '') || 'Paciente removido do sistema' WHERE patientId = ? OR patientPhone = ? OR patientPhone = ?",
        args: [p.id, p.phone, normPhone],
      },
      {
        sql: 'DELETE FROM patients WHERE id = ?',
        args: [p.id],
      },
    ];

    if (isTursoEnabled()) {
      const client = getTursoClient();
      await ensureTursoSchema(client);
      await client.batch(queries, 'write');
    } else {
      const db = getDb();
      const runTx = db.transaction(() => {
        for (const q of queries) {
          db.prepare(q.sql).run(...q.args);
        }
      });
      runTx();
    }
  } else {
    const phoneValidation = validateAndNormalizePhone(idOrPhone);
    const normalizedPhone = phoneValidation.isValid ? phoneValidation.normalized : idOrPhone.trim();
    await executeQuery('DELETE FROM patient_notes WHERE phone = ? OR phone = ?', [idOrPhone, normalizedPhone]);
    await executeQuery('DELETE FROM prescriptions WHERE patientPhone = ? OR patientPhone = ?', [idOrPhone, normalizedPhone]);
  }
}

export async function dbAddPatientSession(input: {
  patientId: string;
  date: string;
  time?: string | null;
  serviceSlug?: string;
  evaPainScore?: number;
  sessionType?: 'ONLINE' | 'MANUAL' | 'PAPER';
  notes?: string | null;
  practitioner?: string | null;
}): Promise<PatientSession> {
  const id = 'sess_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString();

  await executeQuery(
    `INSERT INTO patient_sessions
      (id, patientId, date, time, serviceSlug, evaPainScore, sessionType, notes, practitioner, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.patientId,
      input.date,
      input.time ?? null,
      input.serviceSlug ?? 'kinesitherapie-generale',
      typeof input.evaPainScore === 'number' ? input.evaPainScore : 5,
      input.sessionType ?? 'MANUAL',
      input.notes ?? null,
      input.practitioner ?? null,
      now,
    ]
  );

  await executeQuery('UPDATE patients SET updatedAt = ? WHERE id = ?', [now, input.patientId]);
  const rows = await executeQuery<PatientSession>('SELECT * FROM patient_sessions WHERE id = ?', [id]);
  return rows[0];
}

export async function dbGetPatientSessionById(sessionId: string): Promise<PatientSession | null> {
  const rows = await executeQuery<PatientSession>('SELECT * FROM patient_sessions WHERE id = ?', [sessionId]);
  return rows[0] || null;
}

export async function dbDeletePatientSession(sessionId: string, patientId?: string): Promise<boolean> {
  if (patientId) {
    const existing = await dbGetPatientSessionById(sessionId);
    if (!existing || existing.patientId !== patientId) {
      return false;
    }
  }
  await executeQuery('DELETE FROM patient_sessions WHERE id = ?', [sessionId]);
  return true;
}

export async function dbUpdatePatientSession(
  sessionId: string,
  updates: {
    evaPainScore?: number;
    notes?: string | null;
  },
  patientId?: string
): Promise<PatientSession | null> {
  if (patientId) {
    const existing = await dbGetPatientSessionById(sessionId);
    if (!existing || existing.patientId !== patientId) {
      return null;
    }
  }
  if (typeof updates.evaPainScore === 'number') {
    await executeQuery('UPDATE patient_sessions SET evaPainScore = ? WHERE id = ?', [
      Math.min(10, Math.max(0, updates.evaPainScore)),
      sessionId,
    ]);
  }
  if (updates.notes !== undefined) {
    await executeQuery('UPDATE patient_sessions SET notes = ? WHERE id = ?', [
      updates.notes ? String(updates.notes).trim() : null,
      sessionId,
    ]);
  }
  const rows = await executeQuery<PatientSession>('SELECT * FROM patient_sessions WHERE id = ?', [sessionId]);
  return rows[0] || null;
}

export async function dbBulkBlockSlots(date: string, times: string[], action: 'block' | 'unblock'): Promise<void> {
  for (const time of times) {
    await executeQuery('DELETE FROM blocked_slots WHERE date = ? AND time = ?', [date, time]);
    if (action === 'block') {
      const id = 'blk_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
      await executeQuery('INSERT INTO blocked_slots (id, date, time) VALUES (?, ?, ?)', [id, date, time]);
    }
  }
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
  const rows = await executeQuery<{ phone: string; cnt: number }>(`
    SELECT phone, COUNT(*) as cnt
    FROM appointments
    WHERE status IN ('CANCELLED', 'NO_SHOW')
    GROUP BY phone
  `);

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

export async function dbCreateInvoice(input: CreateInvoiceInput): Promise<Invoice> {
  const phoneValidation = validateAndNormalizePhone(input.patientPhone);
  const normalizedPhone = phoneValidation.isValid ? phoneValidation.normalized : input.patientPhone.trim();

  const isKineService = !input.serviceSlug.includes('minceur') &&
                        !input.serviceSlug.includes('cryolipolyse') &&
                        !input.serviceSlug.includes('cavitation') &&
                        !input.serviceSlug.includes('radiofrequence');

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
      await executeQuery(
        `INSERT INTO invoices (
          id, invoiceNumber, appointmentId, patientId, patientName, patientNif,
          patientEmail, patientPhone, patientAddress, coverageType, coverageProvider, coverageNumber,
          serviceSlug, serviceName, practitioner, amount, vatRate, vatExemptionReason,
          paymentMethod, paymentStatus, paidAt, notes, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
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
          input.practitioner || 'Equipa Digital Clínica (Licenciada)',
          Number(input.amount),
          defaultVatRate,
          defaultExemption,
          input.paymentMethod || 'MULTIBANCO',
          paymentStatus,
          paidAt,
          input.notes || null,
          now,
          now,
        ]
      );

      const created = await dbGetInvoiceById(id);
      if (created) return created;
    } catch (err: any) {
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
  paymentMethod?: string;
  limit?: number;
  offset?: number;
}): Promise<Invoice[]> {
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
  if (filters?.patientPhone) {
    const phoneValidation = validateAndNormalizePhone(filters.patientPhone);
    const norm = phoneValidation.isValid ? phoneValidation.normalized : filters.patientPhone.trim();
    sql += ' AND (patientPhone = ? OR patientPhone = ?)';
    params.push(filters.patientPhone, norm);
  }
  if (filters?.dateFrom) {
    sql += ' AND createdAt >= ?';
    params.push(filters.dateFrom);
  }
  if (filters?.dateTo) {
    sql += ' AND createdAt <= ?';
    params.push(filters.dateTo + 'T23:59:59.999Z');
  }
  if (filters?.search) {
    sql += ' AND (patientName LIKE ? OR patientNif LIKE ? OR invoiceNumber LIKE ? OR serviceName LIKE ? OR patientPhone LIKE ?)';
    const q = `%${filters.search}%`;
    params.push(q, q, q, q, q);
  }

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
  paymentMethod?: string;
}): Promise<{
  invoices: Invoice[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(100, Math.max(1, options.limit ?? 50));
  const offset = (page - 1) * limit;

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
  if (options.patientPhone) {
    const phoneValidation = validateAndNormalizePhone(options.patientPhone);
    const norm = phoneValidation.isValid ? phoneValidation.normalized : options.patientPhone.trim();
    countSql += ' AND (patientPhone = ? OR patientPhone = ?)';
    countParams.push(options.patientPhone, norm);
  }
  if (options.dateFrom) {
    countSql += ' AND createdAt >= ?';
    countParams.push(options.dateFrom);
  }
  if (options.dateTo) {
    countSql += ' AND createdAt <= ?';
    countParams.push(options.dateTo + 'T23:59:59.999Z');
  }
  if (options.search) {
    countSql += ' AND (patientName LIKE ? OR patientNif LIKE ? OR invoiceNumber LIKE ? OR serviceName LIKE ? OR patientPhone LIKE ?)';
    const q = `%${options.search}%`;
    countParams.push(q, q, q, q, q);
  }

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
      updates.push('paidAt = ?');
      params.push(new Date().toISOString());
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

export async function dbGetInvoiceStats(): Promise<InvoiceStats> {
  const invoices = await executeQuery<Invoice>('SELECT * FROM invoices');
  
  let totalRevenue = 0;
  let totalPaid = 0;
  let totalPending = 0;
  let countPaid = 0;
  let countPending = 0;
  let insuranceCount = 0;

  for (const inv of invoices) {
    // Portuguese Accounting Rule: Cancelled / annulled invoices must not count toward clinic revenue
    if (inv.paymentStatus === 'CANCELLED') continue;

    totalRevenue += Number(inv.amount || 0);
    if (inv.paymentStatus === 'PAID') {
      totalPaid += Number(inv.amount || 0);
      countPaid++;
    } else if (inv.paymentStatus === 'PENDING') {
      totalPending += Number(inv.amount || 0);
      countPending++;
    }
    if (inv.coverageType === 'ADSE' || inv.coverageType === 'INSURANCE') {
      insuranceCount++;
    }
  }

  const activeInvoices = invoices.filter(i => i.paymentStatus !== 'CANCELLED');
  const countTotal = activeInvoices.length;
  const avgTicket = countTotal > 0 ? Math.round(totalRevenue / countTotal) : 0;
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

  await executeQuery(
    `INSERT INTO prescriptions (
      id, patientId, patientPhone, patientName, practitioner, date,
      diagnosisOrGoal, itemsJson, generalNotes, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.patientId ?? null,
      input.patientPhone.trim(),
      input.patientName.trim(),
      input.practitioner?.trim() || SITE.professionalName,
      dateStr,
      input.diagnosisOrGoal?.trim() || null,
      itemsJson,
      input.generalNotes?.trim() || null,
      now,
    ]
  );

  return {
    id,
    patientId: input.patientId,
    patientPhone: input.patientPhone.trim(),
    patientName: input.patientName.trim(),
    practitioner: input.practitioner?.trim() || SITE.professionalName,
    date: dateStr,
    diagnosisOrGoal: input.diagnosisOrGoal?.trim(),
    items: itemsWithIds,
    generalNotes: input.generalNotes?.trim(),
    createdAt: now,
  };
}

export async function dbGetPrescriptionsByPatientPhone(patientPhone: string): Promise<PatientPrescription[]> {
  const allRows = await executeQuery<{
    id: string;
    patientId?: string;
    patientPhone: string;
    patientName: string;
    practitioner: string;
    date: string;
    diagnosisOrGoal?: string;
    itemsJson: string;
    generalNotes?: string;
    createdAt: string;
  }>('SELECT * FROM prescriptions ORDER BY createdAt DESC');

  const filtered = allRows.filter(r => phonesMatch(r.patientPhone, patientPhone));

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
export async function dbExportFullDatabaseBackup(): Promise<{
  version: string;
  exportedAt: string;
  tables: {
    appointments: Appointment[];
    patients: any[];
    patient_sessions: any[];
    invoices: Invoice[];
    prescriptions: any[];
    blocked_slots: any[];
    patient_notes: any[];
    security_settings: any[];
    security_audit_logs: any[];
    reviews: any[];
  };
}> {
  const [
    appointments,
    patients,
    sessions,
    invoices,
    prescriptions,
    blockedSlots,
    notes,
    securitySettings,
    securityLogs,
    reviews,
  ] = await Promise.all([
    dbGetAppointments(),
    dbGetAllPatients(),
    executeQuery('SELECT * FROM patient_sessions ORDER BY createdAt DESC'),
    dbGetInvoices(),
    executeQuery('SELECT * FROM prescriptions ORDER BY createdAt DESC'),
    executeQuery('SELECT * FROM blocked_slots ORDER BY date, time'),
    executeQuery('SELECT * FROM patient_notes ORDER BY updatedAt DESC'),
    executeQuery('SELECT * FROM security_settings'),
    executeQuery('SELECT * FROM security_audit_logs ORDER BY createdAt DESC LIMIT 1000'),
    executeQuery('SELECT * FROM reviews ORDER BY createdAt DESC'),
  ]);

  return {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    tables: {
      appointments,
      patients,
      patient_sessions: sessions,
      invoices,
      prescriptions,
      blocked_slots: blockedSlots,
      patient_notes: notes,
      security_settings: securitySettings,
      security_audit_logs: securityLogs,
      reviews,
    },
  };
}

export async function dbRestoreFullDatabaseBackup(backupData: any): Promise<{
  success: boolean;
  restoredCounts: Record<string, number>;
}> {
  if (!backupData || !backupData.tables || typeof backupData.tables !== 'object') {
    throw new Error('Invalid backup data structure: missing tables object');
  }

  const {
    patients = [],
    patient_sessions = [],
    appointments = [],
    invoices = [],
    prescriptions = [],
    blocked_slots = [],
    patient_notes = [],
    security_settings = [],
    security_audit_logs = [],
    reviews = [],
  } = backupData.tables;

  const queries: { sql: string; args: any[] }[] = [];

  // Clear existing data in reverse dependency order
  queries.push({ sql: 'DELETE FROM patient_sessions', args: [] });
  queries.push({ sql: 'DELETE FROM prescriptions', args: [] });
  queries.push({ sql: 'DELETE FROM patient_notes', args: [] });
  queries.push({ sql: 'DELETE FROM appointments', args: [] });
  queries.push({ sql: 'DELETE FROM invoices', args: [] });
  queries.push({ sql: 'DELETE FROM blocked_slots', args: [] });
  queries.push({ sql: 'DELETE FROM patients', args: [] });
  if (reviews.length > 0) queries.push({ sql: 'DELETE FROM reviews', args: [] });

  // Insert patients
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

  // Insert appointments
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

  // Insert patient_sessions
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

  // Insert invoices
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

  // Insert prescriptions
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

  // Insert blocked_slots
  for (const b of blocked_slots) {
    queries.push({
      sql: `INSERT OR IGNORE INTO blocked_slots (id, date, time) VALUES (?, ?, ?)`,
      args: [b.id || ('blk_' + Math.random().toString(36).slice(2)), b.date, b.time],
    });
  }

  // Insert patient_notes
  for (const n of patient_notes) {
    queries.push({
      sql: `INSERT OR REPLACE INTO patient_notes (phone, patientName, content, tags, updatedAt) VALUES (?, ?, ?, ?, ?)`,
      args: [n.phone, n.patientName, n.content ?? '', n.tags ?? '', n.updatedAt],
    });
  }

  // Insert reviews if any
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

  // Execute in single transaction
  if (isTursoEnabled()) {
    const client = getTursoClient();
    await ensureTursoSchema(client);
    await client.batch(queries, 'write');
  } else {
    const db = getDb();
    const runTx = db.transaction(() => {
      for (const q of queries) {
        db.prepare(q.sql).run(...q.args);
      }
    });
    runTx();
  }

  return {
    success: true,
    restoredCounts: {
      patients: patients.length,
      appointments: appointments.length,
      patient_sessions: patient_sessions.length,
      invoices: invoices.length,
      prescriptions: prescriptions.length,
      blocked_slots: blocked_slots.length,
      patient_notes: patient_notes.length,
      reviews: reviews.length,
    },
  };
}

export async function dbDeletePrescription(id: string): Promise<void> {
  await executeQuery('DELETE FROM prescriptions WHERE id = ?', [id]);
}

// ─── Patient Reviews Engine ───────────────────────────────────────────────────

let _reviewsSeeded = false;

export async function dbEnsureReviewsSeeded(): Promise<void> {
  if (_reviewsSeeded) return;
  try {
    const existing = await executeQuery<{ cnt: number }>('SELECT COUNT(*) as cnt FROM reviews');
    const count = Number(existing[0]?.cnt ?? 0);
    if (count === 0) {
      // Seed default reviews from TESTIMONIALS
      for (const t of TESTIMONIALS) {
        const commentText = t.comment.pt || t.comment.fr || t.comment.en || '';
        await executeQuery(
          `INSERT OR IGNORE INTO reviews (id, patientName, patientEmail, rating, serviceSlug, comment, location, status, verified, isFeatured, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'APPROVED', ?, ?, ?, ?)`,
          [
            t.id,
            t.name,
            null,
            t.rating,
            t.serviceSlug,
            commentText,
            t.location || 'Lisboa',
            t.verified ? 1 : 0,
            1,
            t.date ? `${t.date}T10:00:00.000Z` : new Date().toISOString(),
            new Date().toISOString(),
          ]
        );
      }
    }
    _reviewsSeeded = true;
  } catch (err) {
    console.warn('[Reviews Seed Warning]:', err);
  }
}

export async function dbGetApprovedReviews(options?: {
  serviceSlug?: string;
  limit?: number;
}): Promise<Review[]> {
  await dbEnsureReviewsSeeded();
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
  await dbEnsureReviewsSeeded();
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
  await dbEnsureReviewsSeeded();
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
  const [
    statusCounts,
    invoiceAgg,
    serviceCounts,
    hourCounts,
    dowData,
    completedServiceCounts,
  ] = await Promise.all([
    executeQuery<{ status: string; cnt: number }>(
      'SELECT status, COUNT(*) as cnt FROM appointments GROUP BY status'
    ),
    executeQuery<{ totalInvoices: number; paidRevenue: number }>(
      `SELECT
         COUNT(*) as totalInvoices,
         COALESCE(SUM(CASE WHEN paymentStatus = 'PAID' THEN amount ELSE 0 END), 0) as paidRevenue
       FROM invoices`
    ),
    executeQuery<{ service: string; cnt: number }>(
      'SELECT service, COUNT(*) as cnt FROM appointments GROUP BY service ORDER BY cnt DESC LIMIT 6'
    ),
    executeQuery<{ startTime: string; cnt: number }>(
      'SELECT startTime, COUNT(*) as cnt FROM appointments GROUP BY startTime ORDER BY cnt DESC LIMIT 8'
    ),
    executeQuery<{ dow: number; cnt: number }>(
      `SELECT CAST(strftime('%w', date) AS INTEGER) as dow, COUNT(*) as cnt
       FROM appointments
       WHERE date IS NOT NULL AND date != ''
       GROUP BY dow`
    ),
    executeQuery<{ service: string; cnt: number }>(
      `SELECT service, COUNT(*) as cnt
       FROM appointments
       WHERE status IN ('CONFIRMED', 'COMPLETED')
       GROUP BY service`
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
    const price = getServicePrice(row.service);
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




// better-sqlite3 is only imported lazily inside getDb() to avoid crashing on
// Vercel serverless where the native .node binary cannot be loaded.
// At module level we only declare the type.
import { createClient, type Client as LibSqlClient } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import type { PatientRecord, PatientSession, Invoice, CreateInvoiceInput, InvoiceStats, PatientPrescription, PrescriptionItem } from '@/types/admin';
import { SITE } from '@/lib/site';
import { phonesMatch } from '@/lib/phone';

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
        updatedAt        TEXT NOT NULL,
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
      `CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date)`,
      `CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status)`,
      `CREATE INDEX IF NOT EXISTS idx_rate_limit ON rate_limit_log(ip, action, timestamp)`,
      `CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone)`,
      `CREATE INDEX IF NOT EXISTS idx_patient_sessions_patient ON patient_sessions(patientId)`,
      `CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoiceNumber)`,
      `CREATE INDEX IF NOT EXISTS idx_invoices_patient ON invoices(patientPhone)`,
      `CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(createdAt)`,
      `CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(paymentStatus)`,
      `CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patientPhone)`,
      `CREATE INDEX IF NOT EXISTS idx_prescriptions_date ON prescriptions(date)`,
    ]);

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
 * Executes a query ONLY against Turso, with a single retry on socket failure.
 * NEVER falls back to local SQLite. Used for critical booking conflict checks
 * and INSERTs that must be authoritative. Falls back only if Turso is not
 * configured (local dev without Turso credentials).
 */
async function executeTursoDirectly<T = any>(sql: string, args: any[] = []): Promise<T[]> {
  if (!isTursoEnabled()) {
    return executeSqliteQuery<T>(sql, args);
  }

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const client = getTursoClient();
      await ensureTursoSchema(client);
      const res = await client.execute({ sql, args });
      return res.rows as unknown as T[];
    } catch (err) {
      _tursoClient = null;
      if (attempt === 2) throw err;
    }
  }
  throw new Error('Turso unreachable after 2 attempts');
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
      updatedAt        TEXT NOT NULL,
      UNIQUE(date, startTime)
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

    CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
    CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
    CREATE INDEX IF NOT EXISTS idx_rate_limit ON rate_limit_log(ip, action, timestamp);
    CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
    CREATE INDEX IF NOT EXISTS idx_patient_sessions_patient ON patient_sessions(patientId);
    CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoiceNumber);
    CREATE INDEX IF NOT EXISTS idx_invoices_patient ON invoices(patientPhone);
    CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(createdAt);
    CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(paymentStatus);
    CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patientPhone);
    CREATE INDEX IF NOT EXISTS idx_prescriptions_date ON prescriptions(date);
  `);

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

    // On serverless, never fall back to SQLite — it will crash on a read-only filesystem.
    // Turso failures on Vercel should surface as actual errors.
    if (isServerless) {
      throw new Error('[DB] Turso query failed in serverless environment with no fallback available.');
    }

    return executeSqliteQuery<T>(sql, args);
  } else {
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
  notes?: string;
  coverageType?: string;
  coverageProvider?: string;
  coverageNumber?: string;
}

export type AddAppointmentResult =
  | { success: true; appointment: Appointment }
  | { success: false; error: 'slot_taken' | 'invalid_data' | 'slot_blocked' };

// ─── Appointment Helpers ──────────────────────────────────────────────────────
export async function dbCreateAppointment(input: CreateAppointmentInput): Promise<AddAppointmentResult> {
  const id = 'apt_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
  const now = new Date().toISOString();

  // Normalize phone number
  const phoneValidation = validateAndNormalizePhone(input.phone);
  const normalizedPhone = phoneValidation.isValid ? phoneValidation.normalized : input.phone.trim();

  // Use executeTursoDirectly for ALL booking-critical reads/writes.
  // This guarantees we always query the authoritative Turso database and never
  // a stale or empty local SQLite (which would cause false 'slot_taken' errors
  // in Vercel serverless where local SQLite is ephemeral and empty).
  const blockedRows = await executeTursoDirectly('SELECT 1 FROM blocked_slots WHERE date = ? AND time = ?', [
    input.date,
    input.startTime,
  ]);
  if (blockedRows.length > 0) return { success: false, error: 'slot_blocked' };

  const conflictRows = await executeTursoDirectly(
    "SELECT 1 FROM appointments WHERE date = ? AND startTime = ? AND status != 'CANCELLED'",
    [input.date, input.startTime]
  );
  if (conflictRows.length > 0) return { success: false, error: 'slot_taken' };

  try {
    await executeTursoDirectly(
      `INSERT INTO appointments
        (id, patientName, email, phone, service, date, startTime, status, notes, coverageType, coverageProvider, coverageNumber, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.patientName,
        input.email ?? null,
        normalizedPhone,
        input.service,
        input.date,
        input.startTime,
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
           VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, ?, ?)`,
          [id, input.patientName, input.email ?? null, normalizedPhone, input.service, input.date, input.startTime, input.notes ?? null, input.coverageType ?? 'PARTICULAR', input.coverageProvider ?? null, input.coverageNumber ?? null, now, now]
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
    if (err?.message?.includes('UNIQUE') || err?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return { success: false, error: 'slot_taken' };
    }
    throw err;
  }
}

export async function dbGetAppointments(filters?: {
  status?: string;
  date?: string;
  search?: string;
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
  return executeQuery<Appointment>(sql, params);
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
    const id = 'blk_' + Date.now().toString(36);
    await executeQuery('INSERT INTO blocked_slots (id, date, time) VALUES (?, ?, ?)', [id, date, time]);
    return true;
  }
}

export async function dbIsSlotAvailable(date: string, time: string): Promise<boolean> {
  const isBlocked = await executeQuery('SELECT 1 FROM blocked_slots WHERE date = ? AND time = ?', [date, time]);
  if (isBlocked.length > 0) return false;

  const isBooked = await executeQuery(
    "SELECT 1 FROM appointments WHERE date = ? AND startTime = ? AND status != 'CANCELLED'",
    [date, time]
  );
  return isBooked.length === 0;
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
    await executeQuery('DELETE FROM patient_sessions WHERE patientId = ?', [p.id]);
    await executeQuery("DELETE FROM appointments WHERE id LIKE 'apt_sess_%' AND phone = ?", [p.phone]);
    await executeQuery('DELETE FROM patients WHERE id = ?', [p.id]);
    await executeQuery('DELETE FROM patient_notes WHERE phone = ? OR phone = ?', [p.phone, idOrPhone]);
  } else {
    const phoneValidation = validateAndNormalizePhone(idOrPhone);
    const normalizedPhone = phoneValidation.isValid ? phoneValidation.normalized : idOrPhone.trim();
    await executeQuery('DELETE FROM patient_notes WHERE phone = ? OR phone = ?', [idOrPhone, normalizedPhone]);
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

export async function dbDeletePatientSession(sessionId: string): Promise<void> {
  await executeQuery('DELETE FROM patient_sessions WHERE id = ?', [sessionId]);
}

export async function dbBulkBlockSlots(date: string, times: string[], action: 'block' | 'unblock'): Promise<void> {
  for (const time of times) {
    if (action === 'unblock') {
      await executeQuery('DELETE FROM blocked_slots WHERE date = ? AND time = ?', [date, time]);
    } else {
      const id = 'blk_' + Date.now().toString(36);
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
  const prefix = `FR ${currentYear}/`;
  
  const rows = await executeQuery<{ invoiceNumber: string }>(
    `SELECT invoiceNumber FROM invoices WHERE invoiceNumber LIKE ? ORDER BY invoiceNumber DESC LIMIT 1`,
    [`${prefix}%`]
  );

  let nextSequence = 1;
  if (rows.length > 0 && rows[0]?.invoiceNumber) {
    const parts = rows[0].invoiceNumber.split('/');
    if (parts[1]) {
      const parsed = parseInt(parts[1], 10);
      if (!isNaN(parsed)) {
        nextSequence = parsed + 1;
      }
    }
  }

  const padded = String(nextSequence).padStart(4, '0');
  return `${prefix}${padded}`;
}

export async function dbCreateInvoice(input: CreateInvoiceInput): Promise<Invoice> {
  const id = 'inv_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
  const now = new Date().toISOString();
  const invoiceNumber = await dbGenerateInvoiceNumber();

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
  const paidAt = paymentStatus === 'PAID' ? now : null;

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
  return created!;
}

export async function dbGetInvoices(filters?: {
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  patientPhone?: string;
  paymentMethod?: string;
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
  return executeQuery<Invoice>(sql, params);
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
  await executeQuery('DELETE FROM invoices WHERE id = ?', [id]);
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

  const countTotal = invoices.length;
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
      items,
      generalNotes: r.generalNotes,
      createdAt: r.createdAt,
    };
  });
}

export async function dbDeletePrescription(id: string): Promise<void> {
  await executeQuery('DELETE FROM prescriptions WHERE id = ?', [id]);
}



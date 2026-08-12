import Database from 'better-sqlite3';
import { createClient, type Client as LibSqlClient } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import type { PatientRecord, PatientSession } from '@/types/admin';

// ─── Dual Storage Engine: Dynamic Turso (Cloud) vs local SQLite ─────────────
let _tursoClient: LibSqlClient | null = null;

function isTursoEnabled(): boolean {
  return Boolean(process.env.TURSO_DATABASE_URL);
}

function getTursoClient(): LibSqlClient {
  if (!_tursoClient) {
    const rawUrl = process.env.TURSO_DATABASE_URL ?? '';
    const httpUrl = rawUrl.replace(/^libsql:\/\//, 'https://');
    _tursoClient = createClient({
      url: httpUrl,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return _tursoClient;
}

// ─── Local SQLite Fallback Engine ─────────────────────────────────────────────
function resolveDbPath(): string {
  if (process.env.DATABASE_PATH) {
    return path.resolve(process.env.DATABASE_PATH);
  }

  const isServerless = Boolean(
    process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY
  );
  const defaultLocalPath = path.join(process.cwd(), 'data', 'ryma.db');

  if (isServerless) {
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
  } catch {
    return path.join('/tmp', 'ryma.db');
  }
}

let _sqliteDb: Database.Database | null = null;

export function getDb(): Database.Database {
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

function initSchemaSync(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS appointments (
      id          TEXT PRIMARY KEY,
      patientName TEXT NOT NULL,
      email       TEXT,
      phone       TEXT NOT NULL,
      service     TEXT NOT NULL,
      date        TEXT NOT NULL,
      startTime   TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'PENDING'
                  CHECK (status IN ('PENDING','CONFIRMED','CANCELLED','COMPLETED','NO_SHOW')),
      notes       TEXT,
      createdAt   TEXT NOT NULL,
      updatedAt   TEXT NOT NULL,
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
      cnamStatus              TEXT DEFAULT 'NON',
      cnamNumber              TEXT,
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

    CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
    CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
    CREATE INDEX IF NOT EXISTS idx_rate_limit ON rate_limit_log(ip, action, timestamp);
    CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
    CREATE INDEX IF NOT EXISTS idx_patient_sessions_patient ON patient_sessions(patientId);
  `);
}

// ─── Unified Async Query Abstraction ──────────────────────────────────────────
async function executeQuery<T = any>(sql: string, args: any[] = []): Promise<T[]> {
  if (isTursoEnabled()) {
    const client = getTursoClient();
    const res = await client.execute({ sql, args });
    return res.rows as unknown as T[];
  } else {
    const db = getDb();
    const trimmed = sql.trim().toUpperCase();
    if (trimmed.startsWith('SELECT') || trimmed.startsWith('PRAGMA')) {
      return db.prepare(sql).all(...args) as T[];
    } else {
      const res = db.prepare(sql).run(...args);
      return [{ changes: res.changes, lastInsertRowid: res.lastInsertRowid }] as unknown as T[];
    }
  }
}

// ─── Public Export Types ──────────────────────────────────────────────────────
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
  createdAt: string;
  updatedAt: string;
}

export type CreateAppointmentInput = {
  patientName: string;
  email?: string;
  phone: string;
  service: string;
  date: string;
  startTime: string;
  notes?: string;
};

export type AddAppointmentResult =
  | { success: true; appointment: Appointment }
  | { success: false; error: 'slot_taken' | 'invalid_data' | 'slot_blocked' };

// ─── Appointment Helpers ──────────────────────────────────────────────────────
export async function dbCreateAppointment(input: CreateAppointmentInput): Promise<AddAppointmentResult> {
  const id = 'apt_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
  const now = new Date().toISOString();

  const blockedRows = await executeQuery('SELECT 1 FROM blocked_slots WHERE date = ? AND time = ?', [
    input.date,
    input.startTime,
  ]);
  if (blockedRows.length > 0) return { success: false, error: 'slot_blocked' };

  const conflictRows = await executeQuery(
    "SELECT 1 FROM appointments WHERE date = ? AND startTime = ? AND status != 'CANCELLED'",
    [input.date, input.startTime]
  );
  if (conflictRows.length > 0) return { success: false, error: 'slot_taken' };

  try {
    await executeQuery(
      `INSERT INTO appointments
        (id, patientName, email, phone, service, date, startTime, status, notes, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)`,
      [
        id,
        input.patientName,
        input.email ?? null,
        input.phone,
        input.service,
        input.date,
        input.startTime,
        input.notes ?? null,
        now,
        now,
      ]
    );

    const rows = await executeQuery<Appointment>('SELECT * FROM appointments WHERE id = ?', [id]);
    const appointment = rows[0];

    await dbUpsertPatient({
      patientName: input.patientName,
      phone: input.phone,
      email: input.email ?? null,
      medicalHistory: input.notes ? `Réservation en ligne: ${input.notes}` : '',
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
  fields: Partial<Pick<Appointment, 'status' | 'notes' | 'date' | 'startTime'>>
): Promise<Appointment | null> {
  const updates: string[] = [];
  const params: (string | number)[] = [];

  if (fields.status !== undefined)    { updates.push('status = ?'); params.push(fields.status); }
  if (fields.notes !== undefined)     { updates.push('notes = ?');  params.push(fields.notes ?? ''); }
  if (fields.date !== undefined)      { updates.push('date = ?');   params.push(fields.date); }
  if (fields.startTime !== undefined) { updates.push('startTime = ?'); params.push(fields.startTime); }

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
  const blocked = await executeQuery('SELECT 1 FROM blocked_slots WHERE date = ? AND time = ?', [date, time]);
  if (blocked.length > 0) return false;

  const booked = await executeQuery(
    "SELECT 1 FROM appointments WHERE date = ? AND startTime = ? AND status != 'CANCELLED'",
    [date, time]
  );
  return booked.length === 0;
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
  const rows = await executeQuery<PatientNote>('SELECT * FROM patient_notes WHERE phone = ?', [phone]);
  return rows[0] ?? null;
}

export async function dbUpsertPatientNote(
  phone: string,
  patientName: string,
  content: string,
  tags: string
): Promise<PatientNote> {
  const now = new Date().toISOString();
  const existing = await dbGetPatientNote(phone);

  if (existing) {
    await executeQuery(
      'UPDATE patient_notes SET patientName = ?, content = ?, tags = ?, updatedAt = ? WHERE phone = ?',
      [patientName, content, tags, now, phone]
    );
  } else {
    await executeQuery(
      'INSERT INTO patient_notes (phone, patientName, content, tags, updatedAt) VALUES (?, ?, ?, ?, ?)',
      [phone, patientName, content, tags, now]
    );
  }

  const updated = await dbGetPatientNote(phone);
  return updated!;
}

export async function dbEnsurePatientNote(phone: string, patientName: string): Promise<PatientNote> {
  const existing = await dbGetPatientNote(phone);
  if (existing) return existing;

  const now = new Date().toISOString();
  await executeQuery(
    'INSERT INTO patient_notes (phone, patientName, content, tags, updatedAt) VALUES (?, ?, \'\', \'\', ?)',
    [phone, patientName, now]
  );
  return (await dbGetPatientNote(phone))!;
}

export async function dbDeletePatientNote(phone: string): Promise<void> {
  await executeQuery('DELETE FROM patient_notes WHERE phone = ?', [phone]);
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
  const rows = await executeQuery<PatientRecord>('SELECT * FROM patients WHERE phone = ?', [phone]);
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
  cnamStatus?: string | null;
  cnamNumber?: string | null;
  referringDoctor?: string | null;
  pathologyTags?: string;
  medicalHistory?: string;
  totalPrescribedSessions?: number;
}): Promise<PatientRecord> {
  const now = new Date().toISOString();
  const existing = input.id ? await dbGetPatientById(input.id) : await dbGetPatientByPhone(input.phone);
  const id = existing?.id ?? input.id ?? ('pat_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6));

  if (existing) {
    await executeQuery(
      `UPDATE patients SET
        patientName = ?, phone = ?, email = ?, gender = ?, dob = ?,
        cnamStatus = ?, cnamNumber = ?, referringDoctor = ?, pathologyTags = ?,
        medicalHistory = ?, totalPrescribedSessions = ?, updatedAt = ?
       WHERE id = ?`,
      [
        input.patientName,
        input.phone,
        input.email ?? null,
        input.gender ?? null,
        input.dob ?? null,
        input.cnamStatus ?? 'NON',
        input.cnamNumber ?? null,
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
        id, patientName, phone, email, gender, dob, cnamStatus, cnamNumber,
        referringDoctor, pathologyTags, medicalHistory, totalPrescribedSessions, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.patientName,
        input.phone,
        input.email ?? null,
        input.gender ?? null,
        input.dob ?? null,
        input.cnamStatus ?? 'NON',
        input.cnamNumber ?? null,
        input.referringDoctor ?? null,
        input.pathologyTags ?? '',
        input.medicalHistory ?? '',
        input.totalPrescribedSessions ?? 10,
        now,
        now,
      ]
    );
  }

  await dbUpsertPatientNote(input.phone, input.patientName, input.medicalHistory ?? '', input.pathologyTags ?? '');
  return (await dbGetPatientById(id))!;
}

export async function dbDeletePatientRecord(idOrPhone: string): Promise<void> {
  const p = (await dbGetPatientById(idOrPhone)) ?? (await dbGetPatientByPhone(idOrPhone));
  if (p) {
    await executeQuery('DELETE FROM patient_sessions WHERE patientId = ?', [p.id]);
    await executeQuery('DELETE FROM patients WHERE id = ?', [p.id]);
    await executeQuery('DELETE FROM patient_notes WHERE phone = ?', [p.phone]);
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

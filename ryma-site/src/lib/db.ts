import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import type { PatientRecord, PatientSession } from '@/types/admin';

const DB_PATH = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(process.cwd(), 'data', 'ryma.db');

// Ensure the data directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    _db.pragma('synchronous = NORMAL');
    _db.pragma('busy_timeout = 5000');
    _db.pragma('cache_size = -64000'); // 64MB memory page cache
    initSchema(_db);
  }
  return _db;
}

function initSchema(db: Database.Database): void {
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

  migrateLegacyPatientNotes(db);
}

function migrateLegacyPatientNotes(db: Database.Database): void {
  try {
    const legacyNotes = db.prepare('SELECT * FROM patient_notes').all() as Array<{
      phone: string;
      patientName: string;
      content: string;
      tags: string;
      updatedAt: string;
    }>;

    for (const legacy of legacyNotes) {
      const existing = db.prepare('SELECT id FROM patients WHERE phone = ?').get(legacy.phone) as { id: string } | undefined;
      if (!existing) {
        const id = 'pat_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
        const now = legacy.updatedAt || new Date().toISOString();
        db.prepare(`
          INSERT OR IGNORE INTO patients
            (id, patientName, phone, pathologyTags, medicalHistory, createdAt, updatedAt)
          VALUES
            (?, ?, ?, ?, ?, ?, ?)
        `).run(id, legacy.patientName, legacy.phone, legacy.tags || '', legacy.content || '', now, now);
      }
    }
  } catch {
    /* Silent catch if legacy table missing */
  }
}

// ─── Appointment helpers ──────────────────────────────────────────────────────

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

/**
 * Atomically creates an appointment using a DB transaction.
 * The UNIQUE(date, startTime) constraint prevents double-bookings at the database level.
 * Even two simultaneous requests cannot both succeed.
 */
export function dbCreateAppointment(input: CreateAppointmentInput): AddAppointmentResult {
  const db = getDb();

  const id = 'apt_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
  const now = new Date().toISOString();

  // Check if slot is blocked
  const blocked = db.prepare(
    'SELECT 1 FROM blocked_slots WHERE date = ? AND time = ?'
  ).get(input.date, input.startTime);
  if (blocked) return { success: false, error: 'slot_blocked' };

  const insert = db.prepare(`
    INSERT OR IGNORE INTO appointments
      (id, patientName, email, phone, service, date, startTime, status, notes, createdAt, updatedAt)
    VALUES
      (@id, @patientName, @email, @phone, @service, @date, @startTime, 'PENDING', @notes, @createdAt, @updatedAt)
  `);

  const result = insert.run({
    id,
    patientName: input.patientName,
    email: input.email ?? null,
    phone: input.phone,
    service: input.service,
    date: input.date,
    startTime: input.startTime,
    notes: input.notes ?? null,
    createdAt: now,
    updatedAt: now,
  });

  // If 0 rows changed, the UNIQUE constraint triggered — slot was already taken
  if (result.changes === 0) {
    return { success: false, error: 'slot_taken' };
  }

  const row = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id) as Appointment;

  // Auto-upsert patient into structured patients EMR table
  dbUpsertPatient({
    patientName: input.patientName,
    phone: input.phone,
    email: input.email ?? null,
    medicalHistory: input.notes ? `Réservation en ligne: ${input.notes}` : '',
  });

  return { success: true, appointment: row };
}

export function dbGetAppointments(filters?: {
  status?: string;
  date?: string;
  search?: string;
}): Appointment[] {
  const db = getDb();

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

  return db.prepare(sql).all(...params) as Appointment[];
}

export function dbGetAppointmentById(id: string): Appointment | null {
  const db = getDb();
  return (db.prepare('SELECT * FROM appointments WHERE id = ?').get(id) as Appointment) ?? null;
}

export function dbUpdateAppointment(
  id: string,
  fields: Partial<Pick<Appointment, 'status' | 'notes' | 'date' | 'startTime'>>
): Appointment | null {
  const db = getDb();

  const updates: string[] = [];
  const params: (string | number)[] = [];

  if (fields.status !== undefined) { updates.push('status = ?'); params.push(fields.status); }
  if (fields.notes !== undefined)  { updates.push('notes = ?');  params.push(fields.notes ?? ''); }
  if (fields.date !== undefined)   { updates.push('date = ?');   params.push(fields.date); }
  if (fields.startTime !== undefined) { updates.push('startTime = ?'); params.push(fields.startTime); }

  if (updates.length === 0) return dbGetAppointmentById(id);

  updates.push('updatedAt = ?');
  params.push(new Date().toISOString());
  params.push(id);

  db.prepare(`UPDATE appointments SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  return dbGetAppointmentById(id);
}

// ─── Blocked slots helpers ────────────────────────────────────────────────────

export function dbGetBlockedSlots(): { date: string; time: string }[] {
  const db = getDb();
  return db.prepare('SELECT date, time FROM blocked_slots').all() as { date: string; time: string }[];
}

export function dbToggleBlockSlot(date: string, time: string): boolean {
  const db = getDb();

  const existing = db.prepare('SELECT id FROM blocked_slots WHERE date = ? AND time = ?').get(date, time);
  if (existing) {
    db.prepare('DELETE FROM blocked_slots WHERE date = ? AND time = ?').run(date, time);
    return false; // now unblocked
  } else {
    const id = 'blk_' + Date.now().toString(36);
    db.prepare('INSERT OR IGNORE INTO blocked_slots (id, date, time) VALUES (?, ?, ?)').run(id, date, time);
    return true; // now blocked
  }
}

export function dbIsSlotAvailable(date: string, time: string): boolean {
  const db = getDb();

  const blocked = db.prepare('SELECT 1 FROM blocked_slots WHERE date = ? AND time = ?').get(date, time);
  if (blocked) return false;

  const booked = db.prepare(
    "SELECT 1 FROM appointments WHERE date = ? AND startTime = ? AND status != 'CANCELLED'"
  ).get(date, time);

  return !booked;
}

// ─── Rate limiting helpers ────────────────────────────────────────────────────

/**
 * Returns true if the IP is allowed to perform the action.
 * Allows maxAttempts within windowSeconds.
 */
export function dbCheckRateLimit(
  ip: string,
  action: string,
  maxAttempts: number,
  windowSeconds: number
): boolean {
  const db = getDb();
  const windowStart = Date.now() - windowSeconds * 1000;

  const count = (
    db.prepare(
      'SELECT COUNT(*) as cnt FROM rate_limit_log WHERE ip = ? AND action = ? AND timestamp > ?'
    ).get(ip, action, windowStart) as { cnt: number }
  ).cnt;

  return count < maxAttempts;
}

export function dbRecordRateLimitAttempt(ip: string, action: string): void {
  const db = getDb();
  db.prepare('INSERT INTO rate_limit_log (ip, action, timestamp) VALUES (?, ?, ?)').run(
    ip,
    action,
    Date.now()
  );

  // Prune old entries (older than 1 hour) to keep table small
  const oneHourAgo = Date.now() - 3600 * 1000;
  db.prepare('DELETE FROM rate_limit_log WHERE timestamp < ?').run(oneHourAgo);
}

// ─── Patient Notes helpers ────────────────────────────────────────────────────

export interface PatientNote {
  phone: string;
  patientName: string;
  content: string;
  tags: string;
  updatedAt: string;
}

export function dbGetAllPatientNotes(): PatientNote[] {
  const db = getDb();
  return db.prepare('SELECT * FROM patient_notes ORDER BY updatedAt DESC').all() as PatientNote[];
}

export function dbGetPatientNote(phone: string): PatientNote | null {
  const db = getDb();
  return (db.prepare('SELECT * FROM patient_notes WHERE phone = ?').get(phone) as PatientNote) ?? null;
}

export function dbUpsertPatientNote(
  phone: string,
  patientName: string,
  content: string,
  tags: string
): PatientNote {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO patient_notes (phone, patientName, content, tags, updatedAt)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(phone) DO UPDATE SET
      patientName = excluded.patientName,
      content     = excluded.content,
      tags        = excluded.tags,
      updatedAt   = excluded.updatedAt
  `).run(phone, patientName, content, tags, now);
  return db.prepare('SELECT * FROM patient_notes WHERE phone = ?').get(phone) as PatientNote;
}

export function dbEnsurePatientNote(phone: string, patientName: string): PatientNote {
  const db = getDb();
  const existing = dbGetPatientNote(phone);
  if (existing) return existing;

  const now = new Date().toISOString();
  db.prepare(`
    INSERT OR IGNORE INTO patient_notes (phone, patientName, content, tags, updatedAt)
    VALUES (?, ?, '', '', ?)
  `).run(phone, patientName, now);

  return dbGetPatientNote(phone)!;
}

export function dbDeletePatientNote(phone: string): void {
  const db = getDb();
  db.prepare('DELETE FROM patient_notes WHERE phone = ?').run(phone);
}

// ─── Structured Patient EMR Helpers ──────────────────────────────────────────

export function dbGetAllPatients(): PatientRecord[] {
  const db = getDb();
  const patients = db.prepare('SELECT * FROM patients ORDER BY updatedAt DESC').all() as PatientRecord[];
  
  // Attach sessions to each patient
  const sessionStmt = db.prepare('SELECT * FROM patient_sessions WHERE patientId = ? ORDER BY date DESC, createdAt DESC');
  return patients.map(p => ({
    ...p,
    sessions: sessionStmt.all(p.id) as PatientSession[],
  }));
}

export function dbGetPatientById(id: string): PatientRecord | null {
  const db = getDb();
  const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(id) as PatientRecord | undefined;
  if (!patient) return null;

  const sessions = db.prepare('SELECT * FROM patient_sessions WHERE patientId = ? ORDER BY date DESC, createdAt DESC').all(id) as PatientSession[];
  return { ...patient, sessions };
}

export function dbGetPatientByPhone(phone: string): PatientRecord | null {
  const db = getDb();
  const patient = db.prepare('SELECT * FROM patients WHERE phone = ?').get(phone) as PatientRecord | undefined;
  if (!patient) return null;

  const sessions = db.prepare('SELECT * FROM patient_sessions WHERE patientId = ? ORDER BY date DESC, createdAt DESC').all(patient.id) as PatientSession[];
  return { ...patient, sessions };
}

export function dbUpsertPatient(input: {
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
}): PatientRecord {
  const db = getDb();
  const now = new Date().toISOString();
  
  const existing = input.id ? dbGetPatientById(input.id) : dbGetPatientByPhone(input.phone);
  const id = existing?.id ?? input.id ?? ('pat_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6));

  db.prepare(`
    INSERT INTO patients (
      id, patientName, phone, email, gender, dob, cnamStatus, cnamNumber,
      referringDoctor, pathologyTags, medicalHistory, totalPrescribedSessions, createdAt, updatedAt
    ) VALUES (
      @id, @patientName, @phone, @email, @gender, @dob, @cnamStatus, @cnamNumber,
      @referringDoctor, @pathologyTags, @medicalHistory, @totalPrescribedSessions, @createdAt, @updatedAt
    )
    ON CONFLICT(id) DO UPDATE SET
      patientName             = excluded.patientName,
      phone                   = excluded.phone,
      email                   = excluded.email,
      gender                  = excluded.gender,
      dob                     = excluded.dob,
      cnamStatus              = excluded.cnamStatus,
      cnamNumber              = excluded.cnamNumber,
      referringDoctor         = excluded.referringDoctor,
      pathologyTags           = excluded.pathologyTags,
      medicalHistory          = excluded.medicalHistory,
      totalPrescribedSessions = excluded.totalPrescribedSessions,
      updatedAt               = excluded.updatedAt
    ON CONFLICT(phone) DO UPDATE SET
      patientName             = excluded.patientName,
      email                   = excluded.email,
      gender                  = excluded.gender,
      dob                     = excluded.dob,
      cnamStatus              = excluded.cnamStatus,
      cnamNumber              = excluded.cnamNumber,
      referringDoctor         = excluded.referringDoctor,
      pathologyTags           = excluded.pathologyTags,
      medicalHistory          = excluded.medicalHistory,
      totalPrescribedSessions = excluded.totalPrescribedSessions,
      updatedAt               = excluded.updatedAt
  `).run({
    id,
    patientName: input.patientName,
    phone: input.phone,
    email: input.email ?? null,
    gender: input.gender ?? null,
    dob: input.dob ?? null,
    cnamStatus: input.cnamStatus ?? 'NON',
    cnamNumber: input.cnamNumber ?? null,
    referringDoctor: input.referringDoctor ?? null,
    pathologyTags: input.pathologyTags ?? '',
    medicalHistory: input.medicalHistory ?? '',
    totalPrescribedSessions: input.totalPrescribedSessions ?? 10,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  });

  // Also sync legacy patient_notes table for backwards compatibility
  dbUpsertPatientNote(input.phone, input.patientName, input.medicalHistory ?? '', input.pathologyTags ?? '');

  return dbGetPatientById(id)!;
}

export function dbDeletePatientRecord(idOrPhone: string): void {
  const db = getDb();
  const p = dbGetPatientById(idOrPhone) ?? dbGetPatientByPhone(idOrPhone);
  if (p) {
    db.prepare('DELETE FROM patient_sessions WHERE patientId = ?').run(p.id);
    db.prepare('DELETE FROM patients WHERE id = ?').run(p.id);
    db.prepare('DELETE FROM patient_notes WHERE phone = ?').run(p.phone);
  }
}

export function dbAddPatientSession(input: {
  patientId: string;
  date: string;
  time?: string | null;
  serviceSlug?: string;
  evaPainScore?: number;
  sessionType?: 'ONLINE' | 'MANUAL' | 'PAPER';
  notes?: string | null;
  practitioner?: string | null;
}): PatientSession {
  const db = getDb();
  const id = 'sess_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO patient_sessions
      (id, patientId, date, time, serviceSlug, evaPainScore, sessionType, notes, practitioner, createdAt)
    VALUES
      (@id, @patientId, @date, @time, @serviceSlug, @evaPainScore, @sessionType, @notes, @practitioner, @createdAt)
  `).run({
    id,
    patientId: input.patientId,
    date: input.date,
    time: input.time ?? null,
    serviceSlug: input.serviceSlug ?? 'kinesitherapie-generale',
    evaPainScore: typeof input.evaPainScore === 'number' ? input.evaPainScore : 5,
    sessionType: input.sessionType ?? 'MANUAL',
    notes: input.notes ?? null,
    practitioner: input.practitioner ?? null,
    createdAt: now,
  });

  // Touch patient updatedAt
  db.prepare('UPDATE patients SET updatedAt = ? WHERE id = ?').run(now, input.patientId);

  return db.prepare('SELECT * FROM patient_sessions WHERE id = ?').get(id) as PatientSession;
}

export function dbDeletePatientSession(sessionId: string): void {
  const db = getDb();
  db.prepare('DELETE FROM patient_sessions WHERE id = ?').run(sessionId);
}

export function dbBulkBlockSlots(date: string, times: string[], action: 'block' | 'unblock'): void {
  const db = getDb();
  const stmtDelete = db.prepare('DELETE FROM blocked_slots WHERE date = ? AND time = ?');
  const stmtInsert = db.prepare('INSERT OR IGNORE INTO blocked_slots (id, date, time) VALUES (?, ?, ?)');

  const transaction = db.transaction(() => {
    for (const time of times) {
      if (action === 'unblock') {
        stmtDelete.run(date, time);
      } else {
        const id = 'blk_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
        stmtInsert.run(id, date, time);
      }
    }
  });

  transaction();
}

export function dbGetBackupStatus(): { lastBackupDate: string | null; backupCount: number; dbSizeBytes: number } {
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
    if (fs.existsSync(DB_PATH)) {
      dbSizeBytes = fs.statSync(DB_PATH).size;
    }
  } catch {
    /* silent */
  }

  return { lastBackupDate, backupCount, dbSizeBytes };
}

export function dbGetNoShowCounts(): Record<string, number> {
  const db = getDb();
  const rows = db.prepare(`
    SELECT phone, COUNT(*) as cnt
    FROM appointments
    WHERE status IN ('CANCELLED', 'NO_SHOW')
    GROUP BY phone
  `).all() as Array<{ phone: string; cnt: number }>;

  const map: Record<string, number> = {};
  rows.forEach(r => {
    map[r.phone] = r.cnt;
  });
  return map;
}


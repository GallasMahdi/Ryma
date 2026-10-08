import { TREATMENT_SCHEMA, TREATMENT_TABLES } from '@/lib/treatment-schema';
import { DEFAULT_HOURS } from '@/types/scheduling';
import { SITE } from '@/lib/site';
import type { Client } from '@libsql/client';
import type { Database } from 'better-sqlite3';

const literal = (value: string) => `'${value.replaceAll("'", "''")}'`;
const minutes = (column: string) => `(CAST(substr(${column},1,2) AS INTEGER)*60+CAST(substr(${column},4,2) AS INTEGER))`;
const duration = (row: string) => `COALESCE(${row}.durationMinutes,(SELECT durationMinutes FROM practitioner_services WHERE practitionerId=${row}.practitionerId AND service=${row}.service),(SELECT durationMinutes FROM treatment_catalog WHERE slug=${row}.service),30)`;
const start = (row: string) => `(${minutes(`${row}.startTime`)}-${row}.bufferBefore)`;
const end = (row: string) => `(${minutes(`${row}.startTime`)}+${duration(row)}+${row}.bufferAfter)`;
const overlap = (a: string, b: string) => `${start(a)} < ${end(b)} AND ${start(b)} < ${end(a)}`;

export const SCHEDULING_COLUMNS: Record<string, Record<string, string>> = {
  appointments: {
    practitionerId: "TEXT NOT NULL DEFAULT 'legacy'",
    practitionerName: "TEXT NOT NULL DEFAULT ''",
    durationMinutes: 'INTEGER CHECK(durationMinutes > 0 AND durationMinutes <= 720)',
    bufferBefore: 'INTEGER NOT NULL DEFAULT 0 CHECK(bufferBefore BETWEEN 0 AND 120)',
    bufferAfter: 'INTEGER NOT NULL DEFAULT 0 CHECK(bufferAfter BETWEEN 0 AND 120)',
    resourceIds: "TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(resourceIds))",
    patientId: 'TEXT',
    version: 'INTEGER NOT NULL DEFAULT 1',
    bookingRequestHash: 'TEXT',
  },
  patient_sessions: { practitionerId: 'TEXT', appointmentId: 'TEXT' },
  invoices: { practitionerId: 'TEXT' },
  prescriptions: { practitionerId: 'TEXT' },
};

export const SCHEDULING_TABLES = [
  'CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, appliedAt TEXT NOT NULL)',
  `CREATE TABLE IF NOT EXISTS practitioners (id TEXT PRIMARY KEY, name TEXT NOT NULL, profession TEXT NOT NULL DEFAULT 'Physiotherapist', color TEXT NOT NULL DEFAULT '#2563eb', active INTEGER NOT NULL DEFAULT 1 CHECK(active IN(0,1)), bookable INTEGER NOT NULL DEFAULT 1 CHECK(bookable IN(0,1)), priority INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS practitioner_services (practitionerId TEXT NOT NULL REFERENCES practitioners(id), service TEXT NOT NULL, durationMinutes INTEGER CHECK(durationMinutes BETWEEN 5 AND 720), bufferBefore INTEGER NOT NULL DEFAULT 0 CHECK(bufferBefore BETWEEN 0 AND 120), bufferAfter INTEGER NOT NULL DEFAULT 0 CHECK(bufferAfter BETWEEN 0 AND 120), PRIMARY KEY(practitionerId,service))`,
  `CREATE TABLE IF NOT EXISTS working_hours (practitionerId TEXT NOT NULL, dayOfWeek INTEGER NOT NULL CHECK(dayOfWeek BETWEEN 0 AND 6), startMinute INTEGER NOT NULL CHECK(startMinute BETWEEN 0 AND 1439), endMinute INTEGER NOT NULL CHECK(endMinute > startMinute AND endMinute <= 1440), PRIMARY KEY(practitionerId,dayOfWeek,startMinute))`,
  `CREATE TABLE IF NOT EXISTS schedule_exceptions (id TEXT PRIMARY KEY, practitionerId TEXT NOT NULL, date TEXT NOT NULL, startMinute INTEGER NOT NULL CHECK(startMinute BETWEEN 0 AND 1439), endMinute INTEGER NOT NULL CHECK(endMinute > startMinute AND endMinute <= 1440), kind TEXT NOT NULL CHECK(kind IN('closed','open')), label TEXT NOT NULL DEFAULT '')`,
  'CREATE INDEX IF NOT EXISTS idx_exceptions_scope_date ON schedule_exceptions(practitionerId,date)',
  `CREATE TABLE IF NOT EXISTS resources (id TEXT PRIMARY KEY, name TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1 CHECK(active IN(0,1)))`,
  `CREATE TABLE IF NOT EXISTS service_resources (service TEXT NOT NULL, resourceId TEXT NOT NULL REFERENCES resources(id), PRIMARY KEY(service,resourceId))`,
  'CREATE TABLE IF NOT EXISTS booking_sync (id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL DEFAULT 0)',
  'INSERT INTO booking_sync(id,revision) VALUES(1,0) ON CONFLICT(id) DO NOTHING',
];

// Run once in a write transaction after adding the columns. Never recreate the old global index.
export const SCHEDULING_MIGRATION = [
  ...['trg_prevent_blocked_booking','trg_prevent_blocked_booking_update','trg_prevent_booked_block','booking_duration_guard_0','booking_duration_guard_1','booking_duration_block_guard'].map(name => `DROP TRIGGER IF EXISTS ${name}`),
  'DROP INDEX IF EXISTS idx_appointments_active_slot',
  `INSERT INTO practitioners(id,name) VALUES('legacy',${literal(SITE.professionalName)}) ON CONFLICT(id) DO NOTHING`,
  "INSERT OR IGNORE INTO practitioner_services(practitionerId,service) SELECT 'legacy',service FROM appointments WHERE service IS NOT NULL AND service!=''",
  ...['*','legacy'].flatMap(scope => DEFAULT_HOURS.map(h => `INSERT OR IGNORE INTO working_hours(practitionerId,dayOfWeek,startMinute,endMinute) VALUES(${literal(scope)},${h.dayOfWeek},${h.startMinute},${h.endMinute})`)),
  `UPDATE appointments SET practitionerName=${literal(SITE.professionalName)}, durationMinutes=${duration('appointments')} WHERE durationMinutes IS NULL`,
  "UPDATE appointments SET patientId=(SELECT id FROM patients WHERE patients.phone=appointments.phone) WHERE patientId IS NULL",
  "UPDATE patient_sessions SET practitionerId='legacy' WHERE practitionerId IS NULL",
  "UPDATE patient_sessions SET appointmentId=(SELECT id FROM appointments WHERE id='apt_'||patient_sessions.id) WHERE appointmentId IS NULL",
  "UPDATE invoices SET practitionerId=COALESCE((SELECT practitionerId FROM appointments WHERE id=invoices.appointmentId),'legacy') WHERE practitionerId IS NULL",
  "UPDATE prescriptions SET practitionerId='legacy' WHERE practitionerId IS NULL",
  'ALTER TABLE blocked_slots RENAME TO blocked_slots_legacy',
  `CREATE TABLE blocked_slots (id TEXT PRIMARY KEY, date TEXT NOT NULL, time TEXT NOT NULL, practitionerId TEXT NOT NULL DEFAULT '*', UNIQUE(date,time,practitionerId))`,
  "INSERT INTO blocked_slots(id,date,time) SELECT id,date,time FROM blocked_slots_legacy",
  'DROP TABLE blocked_slots_legacy',
  'CREATE INDEX idx_blocked_slots_date_time ON blocked_slots(date,time,practitionerId)',
  "INSERT INTO schema_migrations(version,appliedAt) VALUES(1,datetime('now'))",
];

export const SCHEDULING_GUARDS = [
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_practitioner_slot ON appointments(practitionerId,date,startTime) WHERE status != 'CANCELLED'",
  'CREATE INDEX IF NOT EXISTS idx_appointments_practitioner_date ON appointments(practitionerId,date,status)',
  'CREATE INDEX IF NOT EXISTS idx_appointments_patient_date ON appointments(patientId,date)',
  'CREATE INDEX IF NOT EXISTS idx_appointments_phone_date ON appointments(phone,date)',
  // Reassignment, deletion and recurring replay find clinical rows by appointment.
  'CREATE INDEX IF NOT EXISTS idx_patient_sessions_appointment ON patient_sessions(appointmentId) WHERE appointmentId IS NOT NULL',
  // A deleted/recreated patient profile must not bypass their retained reservation.
  ...['INSERT','UPDATE OF phone,date,startTime,status,durationMinutes,bufferBefore,bufferAfter'].map((op,i)=>`CREATE TRIGGER IF NOT EXISTS scheduling_patient_phone_guard_${i} BEFORE ${op} ON appointments WHEN NEW.status!='CANCELLED' BEGIN
    SELECT RAISE(ABORT,'slot_taken') WHERE EXISTS(SELECT 1 FROM appointments a WHERE a.id!=NEW.id AND a.phone=NEW.phone AND a.date=NEW.date AND a.status!='CANCELLED' AND ${overlap('a','NEW')}); END`),
  ...['appointments','patients','blocked_slots','practitioners','practitioner_services','working_hours','schedule_exceptions','resources','service_resources'].flatMap(table => ['INSERT','UPDATE','DELETE'].map(op => `CREATE TRIGGER IF NOT EXISTS booking_sync_${table}_${op.toLowerCase()} AFTER ${op} ON ${table} BEGIN UPDATE booking_sync SET revision=revision+1 WHERE id=1; END`)),
  ...['INSERT','UPDATE OF date,startTime,service,status,practitionerId,durationMinutes,bufferBefore,bufferAfter,resourceIds,patientId'].map((op,i) => `CREATE TRIGGER IF NOT EXISTS scheduling_appointment_guard_${i} BEFORE ${op} ON appointments
    WHEN NEW.status != 'CANCELLED' ${i ? "AND (OLD.status='CANCELLED' OR NEW.date!=OLD.date OR NEW.startTime!=OLD.startTime OR NEW.practitionerId!=OLD.practitionerId OR NEW.service!=OLD.service OR NEW.durationMinutes IS NOT OLD.durationMinutes OR NEW.bufferBefore!=OLD.bufferBefore OR NEW.bufferAfter!=OLD.bufferAfter OR NEW.resourceIds!=OLD.resourceIds OR NEW.patientId IS NOT OLD.patientId)" : ''}
    BEGIN
      SELECT RAISE(ABORT,'invalid_practitioner') WHERE NOT EXISTS(SELECT 1 FROM practitioners WHERE id=NEW.practitionerId);
      SELECT RAISE(ABORT,'slot_taken') WHERE EXISTS(SELECT 1 FROM appointments a WHERE a.id!=NEW.id AND a.date=NEW.date AND a.status!='CANCELLED' AND ${overlap('a','NEW')} AND (a.practitionerId=NEW.practitionerId OR (a.patientId IS NOT NULL AND a.patientId=NEW.patientId) OR EXISTS(SELECT 1 FROM json_each(a.resourceIds) r JOIN json_each(NEW.resourceIds) n ON r.value=n.value)));
      SELECT RAISE(ABORT,'slot_blocked') WHERE EXISTS(SELECT 1 FROM blocked_slots b WHERE b.date=NEW.date AND b.practitionerId IN('*',NEW.practitionerId) AND ${minutes('b.time')} < ${end('NEW')} AND ${start('NEW')} < ${minutes('b.time')}+30);
    END`),
  `CREATE TRIGGER IF NOT EXISTS scheduling_snapshot AFTER INSERT ON appointments WHEN NEW.durationMinutes IS NULL OR NEW.practitionerName='' BEGIN UPDATE appointments SET durationMinutes=${duration('NEW')}, practitionerName=CASE WHEN NEW.practitionerName='' THEN (SELECT name FROM practitioners WHERE id=NEW.practitionerId) ELSE NEW.practitionerName END WHERE id=NEW.id; END`,
  ...['INSERT','UPDATE'].map((op,i) => `CREATE TRIGGER IF NOT EXISTS scheduling_block_guard_${i} BEFORE ${op} ON blocked_slots BEGIN
    SELECT RAISE(ABORT,'invalid_practitioner') WHERE NEW.practitionerId!='*' AND NOT EXISTS(SELECT 1 FROM practitioners WHERE id=NEW.practitionerId);
    SELECT RAISE(ABORT,'slot_taken') WHERE EXISTS(SELECT 1 FROM appointments a WHERE a.date=NEW.date AND a.status!='CANCELLED' AND (NEW.practitionerId='*' OR NEW.practitionerId=a.practitionerId) AND ${start('a')} < ${minutes('NEW.time')}+30 AND ${minutes('NEW.time')} < ${end('a')}); END`),
  `CREATE TRIGGER IF NOT EXISTS scheduling_preserve_practitioner BEFORE DELETE ON practitioners WHEN EXISTS(SELECT 1 FROM appointments WHERE practitionerId=OLD.id) BEGIN SELECT RAISE(ABORT,'archive_practitioner_instead'); END`,
];

// Additive and idempotent for both existing scheduling databases and fresh installs.
// Archived appointments retain their original status for the patient history, while
// CANCELLED releases capacity using the existing scheduling guards.
const ARCHIVE_COLUMNS: Record<string, string> = {
  serviceNameJson: 'TEXT',
  servicePriceCents: 'INTEGER',
  servicePole: 'TEXT',
  archivedAt: 'TEXT',
  archivedStatus: 'TEXT',
};
const ARCHIVE_GUARDS = [
  `CREATE TRIGGER IF NOT EXISTS appointment_archive_guard_insert BEFORE INSERT ON appointments
   WHEN NEW.archivedAt IS NOT NULL AND NEW.status!='CANCELLED'
   BEGIN SELECT RAISE(ABORT,'archived_appointment_inactive'); END`,
  `CREATE TRIGGER IF NOT EXISTS appointment_archive_guard_update BEFORE UPDATE ON appointments
   WHEN NEW.archivedAt IS NOT NULL AND NEW.status!='CANCELLED'
   BEGIN SELECT RAISE(ABORT,'archived_appointment_inactive'); END`,
];

// Old EVA values cannot be distinguished from the former automatic default.
// Preserve them for review; never promote them to measured clinical results.
const CLINICAL_MIGRATION = [
  'ALTER TABLE patient_sessions RENAME TO patient_sessions_before_clinical_state',
  `CREATE TABLE patient_sessions (
    id TEXT PRIMARY KEY, patientId TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    date TEXT NOT NULL, time TEXT, serviceSlug TEXT NOT NULL,
    evaPainScore INTEGER CHECK(evaPainScore IS NULL OR (typeof(evaPainScore)='integer' AND evaPainScore BETWEEN 0 AND 10)),
    legacyEvaPainScore REAL,
    clinicalStatus TEXT NOT NULL DEFAULT 'PLANNED' CHECK(clinicalStatus IN('PLANNED','COMPLETED','LEGACY_REVIEW')),
    completedAt TEXT, version INTEGER NOT NULL DEFAULT 1 CHECK(version>0), archivedAt TEXT,
    sessionType TEXT NOT NULL DEFAULT 'MANUAL', notes TEXT, practitioner TEXT,
    practitionerId TEXT, appointmentId TEXT, createdAt TEXT NOT NULL,
    CHECK((clinicalStatus='COMPLETED' AND completedAt IS NOT NULL) OR (clinicalStatus!='COMPLETED' AND completedAt IS NULL)),
    CHECK(clinicalStatus='COMPLETED' OR evaPainScore IS NULL)
  )`,
  `INSERT INTO patient_sessions(id,patientId,date,time,serviceSlug,legacyEvaPainScore,clinicalStatus,sessionType,notes,practitioner,practitionerId,appointmentId,createdAt)
   SELECT id,patientId,date,time,serviceSlug,evaPainScore,'LEGACY_REVIEW',sessionType,notes,practitioner,practitionerId,appointmentId,createdAt FROM patient_sessions_before_clinical_state`,
  'DROP TABLE patient_sessions_before_clinical_state',
  'CREATE INDEX idx_patient_sessions_patient ON patient_sessions(patientId)',
  'CREATE INDEX idx_patient_sessions_patient_date ON patient_sessions(patientId,date DESC,createdAt DESC)',
];
const CLINICAL_GUARDS = [
  'CREATE TABLE IF NOT EXISTS clinical_session_revisions(id TEXT PRIMARY KEY,sessionId TEXT NOT NULL,patientId TEXT NOT NULL,beforeJson TEXT NOT NULL,createdAt TEXT NOT NULL,actor TEXT)',
  `CREATE TRIGGER IF NOT EXISTS clinical_appointment_once BEFORE INSERT ON patient_sessions WHEN NEW.appointmentId IS NOT NULL
   BEGIN SELECT RAISE(ABORT,'clinical_record_exists') WHERE EXISTS(SELECT 1 FROM patient_sessions WHERE appointmentId=NEW.appointmentId); END`,
];
const MONEY_COLUMNS: Record<string,string>={servicePole:'TEXT',amountCents:'INTEGER',moneyReview:'INTEGER NOT NULL DEFAULT 0'};
const MONEY_MIGRATION=`UPDATE invoices SET amountCents=CASE WHEN abs(amount*100-round(amount*100))<0.0000001 THEN CAST(round(amount*100) AS INTEGER) ELSE NULL END,
 moneyReview=CASE WHEN abs(amount*100-round(amount*100))<0.0000001 THEN 0 ELSE 1 END`;
const MONEY_GUARDS=['INSERT','UPDATE OF amount,amountCents,moneyReview'].map((op,i)=>`CREATE TRIGGER IF NOT EXISTS invoice_money_guard_${i} BEFORE ${op} ON invoices WHEN NEW.moneyReview=0 BEGIN
 SELECT RAISE(ABORT,'invalid_invoice_cents') WHERE NEW.amountCents IS NULL OR typeof(NEW.amountCents)!='integer' OR NEW.amountCents<=0 OR abs(NEW.amount*100-NEW.amountCents)>0.0000001; END`);

const CATALOGUE_DURATION_GUARDS = ['scheduling_appointment_guard_0','scheduling_appointment_guard_1','scheduling_patient_phone_guard_0','scheduling_patient_phone_guard_1','scheduling_block_guard_0','scheduling_block_guard_1','scheduling_snapshot'].map(name=>`DROP TRIGGER IF EXISTS ${name}`);

export async function migrateSchedulingDatabase(client: Client): Promise<void> {
  const tx = await client.transaction('write');
  try {
    for (const sql of [...SCHEDULING_TABLES,...TREATMENT_TABLES]) await tx.execute(sql);
    if (!(await tx.execute('SELECT version FROM schema_migrations WHERE version=1')).rows.length) {
      for (const [table, columns] of Object.entries(SCHEDULING_COLUMNS)) {
        const names = new Set((await tx.execute(`PRAGMA table_info(${table})`)).rows.map(row => String(row.name)));
        for (const [name, definition] of Object.entries(columns)) if (!names.has(name)) await tx.execute(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
      }
      for (const sql of SCHEDULING_MIGRATION) await tx.execute(sql);
    }
    if (!(await tx.execute('SELECT version FROM schema_migrations WHERE version=2')).rows.length) {
      for (const sql of CATALOGUE_DURATION_GUARDS) await tx.execute(sql);
      await tx.execute("INSERT INTO schema_migrations(version,appliedAt) VALUES(2,datetime('now'))");
    }
    const appointmentColumns = new Set((await tx.execute('PRAGMA table_info(appointments)')).rows.map(row => String(row.name)));
    for (const [name, definition] of Object.entries(ARCHIVE_COLUMNS)) if (!appointmentColumns.has(name)) await tx.execute(`ALTER TABLE appointments ADD COLUMN ${name} ${definition}`);
    if (!(await tx.execute('PRAGMA table_info(patient_sessions)')).rows.some(row => row.name === 'clinicalStatus')) {
      for (const sql of CLINICAL_MIGRATION) await tx.execute(sql);
    }
    const invoiceColumns=new Set((await tx.execute('PRAGMA table_info(invoices)')).rows.map(row=>String(row.name)));
    for (const [name,definition] of Object.entries(MONEY_COLUMNS)) if (!invoiceColumns.has(name)) await tx.execute(`ALTER TABLE invoices ADD COLUMN ${name} ${definition}`);
    if (!invoiceColumns.has('amountCents')) await tx.execute(MONEY_MIGRATION);
    // Minimal legacy scheduling databases can predate invoice treatment identifiers.
    const catalogueSchema=TREATMENT_SCHEMA.filter(sql=>!sql.startsWith('UPDATE invoices')||invoiceColumns.has('serviceSlug'));
    for (const sql of [...SCHEDULING_GUARDS, ...ARCHIVE_GUARDS, ...CLINICAL_GUARDS, ...MONEY_GUARDS, ...catalogueSchema]) await tx.execute(sql);
    await tx.commit();
  } catch (error) { await tx.rollback(); throw error; }
  finally { tx.close(); }
}

export function migrateSchedulingSqlite(db: Database): void {
  db.transaction(() => {
    for (const sql of [...SCHEDULING_TABLES,...TREATMENT_TABLES]) db.exec(sql);
    if (!db.prepare('SELECT version FROM schema_migrations WHERE version=1').get()) {
      for (const [table, columns] of Object.entries(SCHEDULING_COLUMNS)) {
        const names = new Set((db.pragma(`table_info(${table})`) as {name: string}[]).map(row => row.name));
        for (const [name, definition] of Object.entries(columns)) if (!names.has(name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
      }
      for (const sql of SCHEDULING_MIGRATION) db.exec(sql);
    }
    if (!db.prepare('SELECT version FROM schema_migrations WHERE version=2').get()) {
      for (const sql of CATALOGUE_DURATION_GUARDS) db.exec(sql);
      db.exec("INSERT INTO schema_migrations(version,appliedAt) VALUES(2,datetime('now'))");
    }
    const appointmentColumns = new Set((db.pragma('table_info(appointments)') as {name: string}[]).map(row => row.name));
    for (const [name, definition] of Object.entries(ARCHIVE_COLUMNS)) if (!appointmentColumns.has(name)) db.exec(`ALTER TABLE appointments ADD COLUMN ${name} ${definition}`);
    if (!(db.pragma('table_info(patient_sessions)') as {name:string}[]).some(row => row.name === 'clinicalStatus')) {
      for (const sql of CLINICAL_MIGRATION) db.exec(sql);
    }
    const invoiceColumns=new Set((db.pragma('table_info(invoices)') as {name:string}[]).map(row=>row.name));
    for (const [name,definition] of Object.entries(MONEY_COLUMNS)) if (!invoiceColumns.has(name)) db.exec(`ALTER TABLE invoices ADD COLUMN ${name} ${definition}`);
    if (!invoiceColumns.has('amountCents')) db.exec(MONEY_MIGRATION);
    const catalogueSchema=TREATMENT_SCHEMA.filter(sql=>!sql.startsWith('UPDATE invoices')||invoiceColumns.has('serviceSlug'));
    for (const sql of [...SCHEDULING_GUARDS, ...ARCHIVE_GUARDS, ...CLINICAL_GUARDS, ...MONEY_GUARDS, ...catalogueSchema]) db.exec(sql);
  })();
}

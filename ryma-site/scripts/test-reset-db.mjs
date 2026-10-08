import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import Database from 'better-sqlite3';
import { resetDatabases, CLEAR_TABLES } from './reset-db.mjs';

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ryma-reset-test-'));
let serial = 0;
function fixture({ legacy = false, failDelete = false, corruptPreserved = false } = {}) {
  const file = path.join(temp, `${++serial}.db`), db = new Database(file);
  db.exec(`
    PRAGMA foreign_keys=ON;
    CREATE TABLE patients(id TEXT PRIMARY KEY);
    CREATE TABLE appointments(id TEXT PRIMARY KEY, patientId TEXT REFERENCES patients(id));
    CREATE TABLE patient_sessions(id TEXT PRIMARY KEY, appointmentId TEXT REFERENCES appointments(id));
    CREATE TABLE invoices(id TEXT PRIMARY KEY, appointmentId TEXT REFERENCES appointments(id));
    CREATE TABLE reviews(id TEXT PRIMARY KEY);
    CREATE TABLE security_settings(key TEXT PRIMARY KEY,value TEXT,updatedAt TEXT);
    CREATE TABLE blocked_slots(id TEXT PRIMARY KEY,date TEXT);
    CREATE TABLE invoice_sequences(id TEXT PRIMARY KEY,value INTEGER);
    INSERT INTO patients VALUES('patient');
    INSERT INTO appointments VALUES('appointment','patient');
    INSERT INTO patient_sessions VALUES('session','appointment');
    INSERT INTO invoices VALUES('invoice','appointment');
    INSERT INTO reviews VALUES('review');
    INSERT INTO security_settings VALUES('auth','preserve','today');
    INSERT INTO blocked_slots VALUES('block','2030-01-01');
    INSERT INTO invoice_sequences VALUES('2030',42);
  `);
  for (const table of CLEAR_TABLES.filter(t => !['patients','appointments','patient_sessions','invoices','reviews'].includes(t))) {
    db.exec(`CREATE TABLE ${table}(id TEXT PRIMARY KEY); INSERT INTO ${table} VALUES('record');`);
  }
  if (!legacy) for (const table of ['practitioners','practitioner_services','working_hours','schedule_exceptions','resources','service_resources','schema_migrations','security_audit_logs','revoked_sessions','owner_step_up_grants']) {
    db.exec(`CREATE TABLE ${table}(id TEXT PRIMARY KEY); INSERT INTO ${table} VALUES('keep');`);
  }
  if (!legacy) db.exec('CREATE TABLE booking_sync(id INTEGER PRIMARY KEY,revision INTEGER); INSERT INTO booking_sync VALUES(1,3)');
  if (failDelete) db.exec("CREATE TRIGGER failure BEFORE DELETE ON patients BEGIN SELECT RAISE(ABORT,'injected reset failure'); END");
  if (corruptPreserved) db.exec('CREATE TRIGGER corruption AFTER DELETE ON reviews BEGIN DELETE FROM blocked_slots; END');
  db.close(); return file;
}
const inspect = file => { const db = new Database(file, { readonly: true }); try { return Object.fromEntries(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => [r.name, db.prepare(`SELECT * FROM ${r.name}`).all()])); } finally { db.close(); } };
for (const adapter of ['sqlite','libsql']) {
  const options = file => ({ ...(adapter === 'sqlite' ? { locals: [file] } : { cloud: { url: pathToFileURL(file).href } }), backupDir: path.join(temp, 'backups') });
  for (const legacy of [false, true]) await test(`${adapter}: ${legacy ? 'legacy' : 'team'} reset preserves schedules and auth, verifies backup and is repeatable`, async () => {
    const file = fixture({ legacy }), before = inspect(file), report = await resetDatabases(options(file)), after = inspect(file);
    assert.equal(report.status, 'complete');
    for (const table of CLEAR_TABLES) assert.equal(after[table].length, 0, table);
    for (const table of Object.keys(before).filter(t => !CLEAR_TABLES.includes(t) && !['booking_sync','security_settings'].includes(t))) assert.deepEqual(after[table], before[table], table);
    assert.equal(after.security_settings.find(r => r.key === 'reviews_seed_disabled').value, '1');
    assert.deepEqual(after.security_settings.find(r => r.key === 'auth'), before.security_settings[0]);
    if (!legacy) assert.equal(after.booking_sync[0].revision, 4);
    const backup = report.targets[0].backup;
    const copied = adapter === 'sqlite' ? inspect(backup) : JSON.parse(fs.readFileSync(backup, 'utf8')).tables;
    assert.deepEqual(copied, before);
    assert.equal((await resetDatabases(options(file))).status, 'complete');
  });
  await test(`${adapter}: dry-run changes nothing and creates no backup`, async () => {
    const file = fixture(), before = inspect(file), backupDir = path.join(temp, `dry-${serial}`);
    assert.equal((await resetDatabases({ ...options(file), backupDir, dryRun: true })).status, 'dry-run');
    assert.deepEqual(inspect(file), before); assert(!fs.existsSync(backupDir));
  });
  for (const failure of ['failDelete', 'corruptPreserved']) await test(`${adapter}: ${failure} rolls back all changes`, async () => {
    const file = fixture({ [failure]: true }), before = inspect(file);
    await assert.rejects(resetDatabases(options(file)), failure === 'failDelete' ? /injected reset failure/ : /Preserved table changed/);
    assert.deepEqual(inspect(file), before);
  });
  await test(`${adapter}: unavailable backup destination prevents deletion`, async () => {
    const file = fixture(), before = inspect(file), blocked = path.join(temp, `blocked-${serial}`);
    fs.writeFileSync(blocked, 'file');
    await assert.rejects(resetDatabases({ ...options(file), backupDir: blocked }));
    assert.deepEqual(inspect(file), before);
  });
}
await test('missing target prevents changes to every other target', async () => {
  const file = fixture(), before = inspect(file);
  await assert.rejects(resetDatabases({ locals: [file, path.join(temp, 'missing.db')], backupDir: path.join(temp, 'backups') }));
  assert.deepEqual(inspect(file), before);
});
await test('all target backups exist before a deletion failure; statuses are truthful', async () => {
  const first = fixture({ failDelete: true }), second = fixture(), before = inspect(second);
  try { await resetDatabases({ locals: [first, second], backupDir: path.join(temp, 'backups') }); assert.fail('must fail'); }
  catch (error) {
    const report = JSON.parse(fs.readFileSync(error.reportFile, 'utf8'));
    assert.equal(report.status, 'failed');
    assert(report.targets.every(t => t.status === 'backed-up' && fs.existsSync(t.backup)));
  }
  assert.deepEqual(inspect(second), before);
});
await test('partial cross-database completion is reported accurately', async () => {
  const first = fixture(), second = fixture({ failDelete: true });
  try { await resetDatabases({ locals: [first, second], backupDir: path.join(temp, 'backups') }); assert.fail('must fail'); }
  catch (error) {
    const report = JSON.parse(fs.readFileSync(error.reportFile, 'utf8'));
    assert.equal(report.status, 'failed');
    assert.equal(report.targets[0].status, 'verified'); assert.equal(report.targets[1].status, 'backed-up');
  }
  assert.equal(inspect(first).appointments.length, 0); assert.equal(inspect(second).appointments.length, 1);
});
test.after(async () => {
  assert.equal(path.dirname(path.resolve(temp)), path.resolve(os.tmpdir()));
  assert(path.basename(temp).startsWith('ryma-reset-test-'));
  try { await fs.promises.rm(temp, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); }
  catch (error) { if (!['EBUSY','EPERM'].includes(error.code)) throw error; }
});

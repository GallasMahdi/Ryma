const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomBytes } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const Database = require('better-sqlite3');
const { ROOT, demoPaths, acquireLock, demoEnvironment, createAppLoader } = require('./demo/runtime.cjs');

const name = `test-${process.pid}-${randomBytes(4).toString('hex')}`;
const paths = demoPaths(name), unknown = demoPaths(name + '-unknown');
const hash = file => fs.existsSync(file) ? createHash('sha256').update(fs.readFileSync(file)).digest('hex') : null;
const realDatabase = path.join(ROOT, 'data/ryma.db'), realHash = hash(realDatabase);
const localEnv = path.join(ROOT, '.env.local'), envHash = hash(localEnv);
const run = (...args) => spawnSync(process.execPath, [path.join(__dirname, 'seed-demo.cjs'), '--name', name, ...args], {
  cwd: ROOT, encoding: 'utf8', timeout: 120000, windowsHide: true,
  env: { ...process.env, DATABASE_PATH: realDatabase, TURSO_DATABASE_URL: 'libsql://must-not-connect.invalid', TURSO_AUTH_TOKEN: 'must-not-use', SMTP_USER: 'must-not-send@example.invalid', SMTP_PASS: 'must-not-use', WHATSAPP_ENABLED: 'true' },
});
let app;

test.after(() => {
  if (app?.getDb().open) app.getDb().close();
  assert.equal(hash(realDatabase), realHash, 'Working patient database must not change');
  assert.equal(hash(localEnv), envHash, 'Real environment configuration must not change');
  // Only these test-created directories inside .demo may be removed.
  for (const dir of [paths.dir, unknown.dir]) {
    assert.equal(path.dirname(dir), path.join(ROOT, '.demo'));
    assert(path.basename(dir).startsWith(name));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('complete demo fixture and safety boundaries', async t => {
  const seeded = run();
  assert.equal(seeded.status, 0, seeded.stderr + seeded.stdout);
  Object.assign(process.env, demoEnvironment(paths.db, 'test'));
  const load = createAppLoader(); app = load('@/lib/db');
  const sql = app.getDb(), rows = query => sql.prepare(query).all();
  const report = JSON.parse(fs.readFileSync(paths.report, 'utf8'));

  await t.test('current schema contains every intended module with valid foreign keys', () => {
    assert.equal(sql.pragma('integrity_check', { simple: true }), 'ok');
    assert.deepEqual(sql.pragma('foreign_key_check'), []);
    assert.deepEqual(report.totals, { patients: 100, practitioners: 4, treatment_catalog: 15, appointments: 431, patient_sessions: 421, invoices: 287, prescriptions: 50, reviews: 36, resources: 3, schedule_exceptions: 3, blocked_slots: 3, clinical_session_revisions: 9, treatment_revisions: 17, whatsapp_conversations: 6 });
    assert.deepEqual(rows('SELECT DISTINCT status FROM appointments ORDER BY status').map(r => r.status), ['CANCELLED', 'COMPLETED', 'CONFIRMED', 'NO_SHOW', 'PENDING']);
    assert.equal(rows('SELECT DISTINCT coverageType FROM patients').length, 4);
    for (const p of rows('SELECT * FROM patients')) {
      assert.match(p.patientName, /\[DEMO\]/); assert.match(p.email, /@example\.invalid$/);
      assert(load('@/lib/phone').validateAndNormalizePhone(p.phone).isValid);
    }
  });
  await t.test('linked clinical history matches the appointment, patient and practitioner', () => {
    assert.deepEqual(rows(`SELECT s.id FROM patient_sessions s JOIN appointments a ON a.id=s.appointmentId WHERE
      s.patientId!=a.patientId OR s.date!=a.date OR s.time!=a.startTime OR s.practitionerId!=a.practitionerId OR s.serviceSlug!=a.service`), []);
    assert.deepEqual(rows("SELECT id FROM patient_sessions WHERE clinicalStatus!='COMPLETED' AND (evaPainScore IS NOT NULL OR completedAt IS NOT NULL)"), []);
    assert.equal(rows("SELECT * FROM patient_sessions WHERE clinicalStatus='LEGACY_REVIEW'").length, 3);
    assert.equal(rows('SELECT * FROM patient_sessions WHERE archivedAt IS NOT NULL').length, 3);
    assert.equal(rows("SELECT * FROM patient_sessions WHERE clinicalStatus='PLANNED'").length, 130);
    assert(rows("SELECT * FROM patient_sessions WHERE clinicalStatus='COMPLETED' AND evaPainScore IS NULL").length > 0);
    assert.deepEqual(rows("SELECT s.id FROM patient_sessions s JOIN appointments a ON a.id=s.appointmentId WHERE s.archivedAt IS NULL AND s.clinicalStatus='COMPLETED' AND a.status!='COMPLETED'"), []);
  });
  await t.test('catalogue publication, translations and historical price snapshots work', async () => {
    const published = await load('@/lib/treatments').getPublicServices();
    assert.equal(published.length, 13);
    assert(published.every(s => ['pt', 'en', 'fr'].every(lang => s.name[lang] && s.shortDesc[lang] && s.sessionFlow[lang].length)));
    assert(!published.some(s => ['avaliacao-desportiva', 'mobilidade-funcional'].includes(s.slug)));
    assert.equal(published.find(s => s.slug === 'reeducation-posturale').price, 67.5);
    assert(rows("SELECT * FROM appointments WHERE service='reeducation-posturale' AND servicePriceCents=6500").length > 0);
    assert(rows("SELECT * FROM appointments WHERE service='reeducation-posturale' AND servicePriceCents=6750").length > 0);
    assert.equal(rows("SELECT * FROM appointments WHERE service='mobilidade-funcional'").length, 1);
  });
  await t.test('money, document identities and all payment states remain consistent', async () => {
    assert.deepEqual(rows('SELECT id FROM invoices WHERE abs(amount*100-amountCents)>0.000001 OR moneyReview!=0'), []);
    assert.deepEqual(rows('SELECT i.id FROM invoices i JOIN appointments a ON a.id=i.appointmentId WHERE i.patientId!=a.patientId OR i.practitionerId!=a.practitionerId OR i.amountCents!=a.servicePriceCents'), []);
    assert.deepEqual(rows('SELECT DISTINCT paymentStatus FROM invoices ORDER BY paymentStatus').map(r => r.paymentStatus), ['CANCELLED', 'PAID', 'PENDING', 'REFUNDED']);
    assert.equal(rows('SELECT DISTINCT paymentMethod FROM invoices').length, 5);
    const expected = rows("SELECT coalesce(sum(amountCents),0) AS cents FROM invoices WHERE paymentStatus='PAID'")[0].cents / 100;
    assert.equal((await app.dbGetInvoiceStats()).totalPaid, expected);
    for (const rx of rows('SELECT * FROM prescriptions')) {
      assert.match(rx.generalNotes, /DEMO/); assert.equal(JSON.parse(rx.itemsJson).length, 3);
    }
  });
  await t.test('all reservations obey hours, patient, practitioner, buffer and equipment conflicts', async () => {
    const scheduling = load('@/lib/scheduling');
    const state = await scheduling.loadScheduleState(rows('SELECT DISTINCT date FROM appointments').map(r => r.date));
    for (const a of state.appointments) assert(scheduling.evaluateSlot(state, a.date, a.startTime, a.service, { includePast: true, excludeId: a.id, practitionerId: a.practitionerId, patientId: a.patientId, patientPhone: a.phone, snapshot: a }).available, a.id);
    const closure = await app.dbCheckSlotAvailability(report.scenarios.clinicClosure, '09:00', 'reeducation-posturale');
    assert.equal(closure.available, false);
    const blocked = await app.dbCheckSlotAvailability(report.scenarios.blockedSlots.date, '11:00', 'reeducation-posturale');
    assert.equal(blocked.available, false);
    const resourceAppointments = rows("SELECT * FROM appointments WHERE resourceIds!='[]' AND archivedAt IS NULL AND status!='CANCELLED'");
    assert(resourceAppointments.length > 20);
    assert(state.services.some(s => s.durationMinutes === 60));
    assert(state.services.some(s => s.bufferBefore > 0 && s.bufferAfter > 0));
  });
  await t.test('recurring plans, patient directory, reviews and owner analytics consume the fixture', async () => {
    assert.equal(rows("SELECT * FROM idempotency_keys WHERE scope='booking_series'").length, 10);
    const directory = await app.dbGetPatientDirectory({ page: 1, limit: 20, search: '', coverageType: 'ALL' });
    assert.equal(directory.total, 100); assert.equal(directory.totalPages, 5);
    assert.equal((await app.dbGetPatientDirectory({ page: 1, limit: 20, search: 'patient001@example.invalid', coverageType: 'ALL' })).total, 1);
    const reviews = await app.dbGetApprovedReviews({ limit: 100 });
    assert.equal(reviews.length, 18); assert(reviews.every(r => r.comment.includes('DEMO') && !r.verified));
    for (const range of ['today', '7d', '30d', '90d', 'year', 'all']) assert((await app.dbGetFilteredAnalyticsStats({ range })).stats);
    const backup = await app.dbExportFullDatabaseBackup(); assert.equal(backup.version, '3.0.0');
    assert.equal(backup.tables.treatment_catalog.length, 15); assert.equal(backup.tables.patients.length, 100);
  });
  await t.test('demo communications are inert and inherited credentials are cleared', () => {
    assert.deepEqual(rows("SELECT id FROM whatsapp_outbox WHERE status='pending'"), []);
    assert.deepEqual(rows('SELECT id FROM whatsapp_inbox WHERE processedAt IS NULL'), []);
    const env = demoEnvironment(paths.db);
    for (const key of ['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN', 'SMTP_USER', 'SMTP_PASS', 'WHATSAPP_ACCESS_TOKEN', 'ADMIN_NOTIFICATION_EMAIL', 'RECAPTCHA_SECRET_KEY']) assert.equal(env[key], '');
    assert.equal(env.WHATSAPP_ENABLED, 'false'); assert.equal(env.__NEXT_PROCESSED_ENV, 'true');
    assert.equal(load('@/lib/whatsapp/config').whatsappConfig().ready, false);
    assert.throws(() => load('@libsql/client').createClient({ url: 'https://example.invalid' }), /disabled/);
  });
  await t.test('normal reruns preserve test edits without duplicating the fixture', () => {
    sql.prepare("UPDATE patients SET medicalHistory=medicalHistory || ' Test edit' WHERE id=?").run(report.scenarios.patientWithHistory.id);
    sql.pragma('wal_checkpoint(TRUNCATE)'); sql.pragma('journal_mode = DELETE'); sql.close();
    const before = hash(paths.db), replay = run();
    assert.equal(replay.status, 0, replay.stderr); assert.match(replay.stdout, /already exists/); assert.equal(hash(paths.db), before);
  });
  await t.test('active demos cannot be reset; named paths cannot escape .demo', () => {
    const release = acquireLock(paths);
    try { const result = run('--reset'); assert.equal(result.status, 1); assert.match(result.stderr, /already in use/); }
    finally { release(); }
    for (const invalid of ['../data', '.', 'C:\\data', 'default/../../data']) assert.throws(() => demoPaths(invalid), /Demo name/);
    assert.equal(run('--db', realDatabase).status, 1);
  });
  await t.test('unknown existing databases are refused even with --reset', () => {
    const database = new Database(unknown.db); database.exec('CREATE TABLE keep_me(value TEXT); INSERT INTO keep_me VALUES(\'preserve\')'); database.close();
    const before = hash(unknown.db), result = run('--name', path.basename(unknown.dir), '--reset');
    assert.equal(result.status, 1); assert.match(result.stderr, /not owned/); assert.equal(hash(unknown.db), before);
  });
  await t.test('explicit reset rebuilds the full fixture and leaves real data untouched', () => {
    const result = run('--reset'); assert.equal(result.status, 0, result.stderr + result.stdout);
    const fresh = new Database(paths.db, { readonly: true });
    try { assert.equal(fresh.prepare('SELECT count(*) AS n FROM patients').get().n, 100); assert.equal(fresh.prepare("SELECT count(*) AS n FROM patients WHERE medicalHistory LIKE '%Test edit%'").get().n, 0); }
    finally { fresh.close(); }
    assert.equal(hash(realDatabase), realHash); assert.equal(hash(localEnv), envHash);
  });
});

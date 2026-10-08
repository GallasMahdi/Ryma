const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { randomBytes } = require('node:crypto');
const { pathToFileURL } = require('node:url');
const { createClient } = require('@libsql/client');
const Database = require('better-sqlite3');
const { seedDemo } = require('./seed-demo.cjs');
const { ROOT, demoPaths, demoEnvironment, createAppLoader } = require('./demo/runtime.cjs');
const { readSource, snapshot, importDemo } = require('./demo/cloud-import.cjs');

test('cloud importer tested against an isolated libSQL database', async t => {
  const name = `test-cloud-${process.pid}-${randomBytes(3).toString('hex')}`;
  const paths = demoPaths(name), target = path.join(paths.dir, 'target.db');
  let client;
  try {
    seedDemo({ name });
    const sqlite = new Database(paths.db, { readonly: true });
    let source; try { source = readSource(sqlite); } finally { sqlite.close(); }
    Object.assign(process.env, demoEnvironment(target, 'test'));
    const db = createAppLoader()('@/lib/db');
    await db.executeQuery("UPDATE practitioners SET name='Existing clinic' WHERE id='legacy'");
    await db.dbSetOwnerAnalyticsPasswordHash('unchanged-owner-fixture');
    await db.dbCreateReview({ patientName: 'Existing reviewer', serviceSlug: 'legacy-review-service', comment: 'Preserve this existing review.', rating: 4 });
    const originalAppointment = source.tables.appointments.find(a => a.status === 'COMPLETED');
    await db.dbBulkBlockSlots(originalAppointment.date, [originalAppointment.startTime], 'block', '*');
    db.getDb().pragma('wal_checkpoint(TRUNCATE)'); db.getDb().pragma('journal_mode = DELETE'); db.getDb().close();
    client = createClient({ url: pathToFileURL(target).href });
    const before = await snapshot(client);
    const counts = async () => Number((await client.execute('SELECT count(*) AS n FROM patients')).rows[0].n);
    await t.test('dry run previews counts without changing any table', async () => {
      const result = await importDemo(client, source); assert(result.dryRun); assert.equal(result.report.totals.patients, 100);
      assert.deepEqual((await snapshot(client)).tables, before.tables);
    });
    await t.test('a failure after all inserts rolls back the entire import', async () => {
      await assert.rejects(() => importDemo(client, source, { execute: true, beforeCommit() { throw Error('simulated commit failure'); } }), /simulated commit failure/);
      assert.deepEqual((await snapshot(client)).tables, before.tables); assert.equal(await counts(), 0);
    });
    await t.test('an existing clinical record prevents an import', async () => {
      await client.execute("INSERT INTO patients(id,patientName,phone,createdAt,updatedAt) VALUES('existing-patient','Preserve patient','+442079460099','2026-01-01','2026-01-01')");
      await assert.rejects(() => importDemo(client, source, { execute: true }), /patients is not empty/);
      assert.equal(await counts(), 1);
      await client.execute("DELETE FROM patients WHERE id='existing-patient'");
    });
    await t.test('import remaps identities and retains settings, clinic hours and existing reviews', async () => {
      const result = await importDemo(client, source, { execute: true }); assert(result.imported); assert.equal(await counts(), 100);
      assert(result.report.adjustedAppointments.length > 0, 'Demo bookings must move around existing clinic blocks');
      const after = await snapshot(client);
      assert.deepEqual(after.tables.security_settings, before.tables.security_settings);
      assert.deepEqual(after.tables.working_hours.filter(h => h.practitionerId === '*' || h.practitionerId === 'legacy'), before.tables.working_hours);
      assert.deepEqual(after.tables.practitioners.find(p => p.id === 'legacy'), before.tables.practitioners[0]);
      assert(after.tables.blocked_slots.some(b => b.id === before.tables.blocked_slots[0].id));
      assert(after.tables.reviews.some(r => r.id === before.tables.reviews[0].id)); assert.equal(after.tables.reviews.length, 37);
      assert(after.tables.invoices.every(i => i.invoiceNumber.startsWith('DEMO-FT-') && i.patientId.startsWith('demo_') && !i.invoiceNumber.includes('/')));
      assert(after.tables.appointments.every(a => a.practitionerId.startsWith('demo_') && a.patientId.startsWith('demo_')));
      assert.equal((await client.execute('PRAGMA foreign_key_check')).rows.length, 0);
      assert.equal((await client.execute('SELECT s.id FROM patient_sessions s LEFT JOIN appointments a ON a.id=s.appointmentId WHERE s.appointmentId IS NOT NULL AND a.id IS NULL')).rows.length, 0);
      for (const entry of after.tables.clinical_session_revisions) assert(JSON.parse(entry.beforeJson).patientId.startsWith('demo_'));
      for (const entry of after.tables.idempotency_keys) assert(JSON.parse(entry.responseBody).ids.every(id => id.startsWith('demo_')));
      assert(after.tables.whatsapp_outbox.every(m => m.status === 'expired'));
    });
    await t.test('repeated import preserves later edits and adds no duplicate data', async () => {
      const beforeRepeat = (await snapshot(client)).tables;
      const result = await importDemo(client, source, { execute: true }); assert(result.reused);
      assert.deepEqual((await snapshot(client)).tables, beforeRepeat);
    });
  } finally {
    client?.close();
    assert.equal(path.dirname(paths.dir), path.join(ROOT, '.demo')); assert.equal(path.basename(paths.dir), name);
    // libSQL may release Windows file handles shortly after close().
    await fs.promises.rm(paths.dir, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 });
  }
});

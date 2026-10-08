const { createHash } = require('node:crypto');
const { createAppLoader } = require('./runtime.cjs');
const IMPORT_ID = 'ryma-professional-demo-v1';
const TABLES = ['practitioners', 'resources', 'treatment_catalog', 'practitioner_services', 'working_hours', 'schedule_exceptions',
  'service_resources', 'patients', 'patient_notes', 'appointments', 'patient_sessions', 'invoices', 'prescriptions',
  'clinical_session_revisions', 'treatment_revisions', 'reviews', 'blocked_slots', 'idempotency_keys',
  'whatsapp_conversations', 'whatsapp_inbox', 'whatsapp_outbox'];
const EMPTY_REQUIRED = ['patients', 'patient_notes', 'appointments', 'patient_sessions', 'invoices', 'prescriptions', 'treatment_catalog'];
const quote = value => '"' + value.replace(/"/g, '""') + '"';

function readSource(sqlite) {
  const marker = sqlite.prepare('SELECT version,report FROM ryma_demo_seed WHERE id=1').get();
  if (!marker || marker.version !== 1) throw Error('Use a current generated demo database.');
  const report = JSON.parse(marker.report);
  if (!report.synthetic || report.totals.patients !== 100) throw Error('The source must be the full synthetic demo.');
  const tables = Object.fromEntries(TABLES.map(table => [table, sqlite.prepare(`SELECT * FROM ${quote(table)}`).all()]));
  for (const [table, expected] of Object.entries(report.totals)) {
    if (tables[table] && tables[table].length !== expected) throw Error(`Source ${table} was changed. Rebuild the demo before publishing.`);
  }
  if (tables.patients.some(p => !p.patientName.includes('[DEMO]') || !p.email.endsWith('@example.invalid'))) throw Error('Only labelled fictional patients may be published.');
  if (tables.whatsapp_outbox.some(m => m.status !== 'expired') || tables.whatsapp_inbox.some(m => m.processedAt === null)) throw Error('Source contains pending communications.');
  return { report, tables, whatsappSchema: ['whatsapp_conversations', 'whatsapp_inbox', 'whatsapp_outbox'].map(table => sqlite.prepare('SELECT sql FROM sqlite_master WHERE type=\'table\' AND name=?').get(table).sql) };
}

async function existingImport(client) {
  if (!(await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='ryma_demo_imports'")).rows.length) return null;
  const row = (await client.execute({ sql: 'SELECT report FROM ryma_demo_imports WHERE id=?', args: [IMPORT_ID] })).rows[0];
  return row ? JSON.parse(row.report) : null;
}

async function assertEmptyClinic(client, source) {
  for (const table of EMPTY_REQUIRED) {
    if (Number((await client.execute(`SELECT count(*) AS n FROM ${quote(table)}`)).rows[0].n) !== 0) throw Error(`Live ${table} is not empty. Import stopped to preserve existing clinical data/catalogue. Use a separate demo deployment.`);
  }
  const normalizeHours = rows => rows.map(h => [Number(h.dayOfWeek), Number(h.startMinute), Number(h.endMinute)].join(':')).sort();
  const hours = (await client.execute("SELECT * FROM working_hours WHERE practitionerId='*'")).rows;
  if (JSON.stringify(normalizeHours(hours)) !== JSON.stringify(normalizeHours(source.tables.working_hours.filter(h => h.practitionerId === '*')))) throw Error('Live clinic hours differ from the tested demo. Import stopped; existing hours were not changed.');
}

function prepareRows(source) {
  const ids = new Map();
  for (const rows of Object.values(source.tables)) for (const row of rows) if (typeof row.id === 'string') ids.set(row.id, 'demo_' + createHash('sha256').update(IMPORT_ID + ':' + row.id).digest('hex').slice(0, 32));
  const remap = value => {
    if (Array.isArray(value)) return value.map(remap);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, remap(entry)]));
    return typeof value === 'string' ? ids.get(value) || value : value;
  };
  const jsonColumns = new Set(['resourceIds', 'beforeJson', 'afterJson', 'responseBody', 'state']);
  const tables = Object.fromEntries(TABLES.map(table => [table, source.tables[table].filter(row => table !== 'working_hours' || row.practitionerId !== '*').map(original => {
    const row = remap(original);
    for (const column of jsonColumns) if (typeof row[column] === 'string') row[column] = JSON.stringify(remap(JSON.parse(row[column])));
    // Avoid the normal year/sequence pattern, including the legacy MAX fallback.
    if (table === 'invoices') row.invoiceNumber = 'DEMO-' + row.invoiceNumber.replace(/[ /]+/g, '-');
    if (table === 'idempotency_keys') row.key = 'demo:' + row.key;
    return row;
  })]));
  return { tables, scenarios: remap(source.report.scenarios) };
}

async function respectExistingSchedule(client, prepared, baseDate) {
  const tables = prepared.tables, load = createAppLoader();
  const { evaluateSlot } = load('@/lib/scheduling');
  const { treatmentFromRow } = load('@/lib/treatments');
  const { TIME_GRID } = load('@/types/scheduling');
  const existingBlocks = (await client.execute('SELECT * FROM blocked_slots')).rows;
  const existingExceptions = (await client.execute('SELECT * FROM schedule_exceptions')).rows;
  const clinicHours = (await client.execute("SELECT * FROM working_hours WHERE practitionerId='*'")).rows;
  const state = { revision: 0, practitioners: tables.practitioners, services: tables.practitioner_services,
    hours: [...tables.working_hours, ...clinicHours], exceptions: [...tables.schedule_exceptions, ...existingExceptions],
    resources: tables.resources, serviceResources: tables.service_resources, treatments: tables.treatment_catalog.map(treatmentFromRow),
    appointments: tables.appointments.filter(a => a.status !== 'CANCELLED'), blocks: [...tables.blocked_slots, ...existingBlocks] };
  const valid = (a, date = a.date, time = a.startTime) => evaluateSlot(state, date, time, a.service, {
    includePast: true, snapshot: a, practitionerId: a.practitionerId, patientId: a.patientId, patientPhone: a.phone, excludeId: a.id,
  }).available;
  const adjusted = [];
  for (const a of state.appointments) {
    if (valid(a)) continue;
    const original = { date: a.date, startTime: a.startTime };
    let found;
    for (let offset = 0; offset <= 28 && !found; offset++) {
      // Keep historical visits in the past and upcoming visits on/after their date.
      const date = new Date(Date.parse(original.date + 'T12:00:00Z') + offset * (original.date < baseDate ? -1 : 1) * 86400000).toISOString().slice(0, 10);
      for (const time of TIME_GRID) if (valid(a, date, time)) { found = { date, startTime: time }; break; }
    }
    if (!found) throw Error('Existing calendar restrictions leave no space for the demo. Nothing was imported.');
    Object.assign(a, found);
    const shiftTimestamp = value => typeof value === 'string' && value.startsWith(original.date + 'T') ? found.date + value.slice(10) : value;
    for (const session of tables.patient_sessions.filter(s => s.appointmentId === a.id)) {
      session.date = found.date; session.time = found.startTime;
      session.createdAt = shiftTimestamp(session.createdAt); session.completedAt = shiftTimestamp(session.completedAt);
      for (const revision of tables.clinical_session_revisions.filter(r => r.sessionId === session.id)) {
        const before = JSON.parse(revision.beforeJson); before.date = found.date; before.time = found.startTime;
        before.createdAt = shiftTimestamp(before.createdAt); before.completedAt = shiftTimestamp(before.completedAt);
        revision.beforeJson = JSON.stringify(before);
      }
    }
    for (const invoice of tables.invoices.filter(i => i.appointmentId === a.id)) for (const key of ['createdAt', 'updatedAt', 'paidAt']) invoice[key] = shiftTimestamp(invoice[key]);
    for (const conversation of tables.whatsapp_conversations) {
      const bot = JSON.parse(conversation.state);
      if (conversation.phone === a.phone.slice(1) && bot.date === original.date && bot.time === original.startTime && bot.practitionerId === a.practitionerId) {
        Object.assign(bot, { date: found.date, time: found.startTime }); conversation.state = JSON.stringify(bot);
      }
    }
    adjusted.push({ id: a.id, from: original, to: found });
  }
  if (state.appointments.some(a => !valid(a))) throw Error('The merged calendar failed validation. Nothing was imported.');
  return adjusted;
}

async function snapshot(client) {
  const tx = await client.transaction('read');
  try {
    const schema = (await tx.execute("SELECT name,sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")).rows;
    const tables = {};
    for (const { name } of schema) tables[name] = (await tx.execute(`SELECT * FROM ${quote(name)}`)).rows.map(row => ({ ...row }));
    await tx.commit();
    return { version: '3.0.0', exportedAt: new Date().toISOString(), tables, schema };
  } finally { tx.close(); }
}

async function importDemo(client, source, { execute = false, beforeCommit } = {}) {
  const previous = await existingImport(client);
  if (previous) return { reused: true, report: previous };
  await assertEmptyClinic(client, source);
  let prepared = prepareRows(source);
  const adjustedAppointments = await respectExistingSchedule(client, prepared, source.report.baseDate);
  const report = { importId: IMPORT_ID, importedAt: new Date().toISOString(), baseDate: source.report.baseDate,
    totals: Object.fromEntries(Object.entries(prepared.tables).map(([table, rows]) => [table, rows.length])), scenarios: prepared.scenarios,
    adjustedAppointments,
    notifications: 'No pending inbox/outbox messages imported', invoicePrefix: 'DEMO-', preservedExistingSettings: true };
  if (!execute) return { dryRun: true, report };
  const tx = await client.transaction('write');
  try {
    // Recheck after taking the write lock: a new real patient prevents this bootstrap.
    const concurrent = await existingImport(tx);
    if (concurrent) { await tx.rollback(); return { reused: true, report: concurrent }; }
    await assertEmptyClinic(tx, source);
    prepared = prepareRows(source);
    report.adjustedAppointments = await respectExistingSchedule(tx, prepared, source.report.baseDate);
    const preserved = {};
    for (const table of ['security_settings', 'practitioners', 'working_hours', 'reviews', 'invoice_sequences', 'blocked_slots', 'schedule_exceptions']) preserved[table] = (await tx.execute(`SELECT * FROM ${quote(table)}`)).rows.map(row => ({ ...row }));
    for (const sql of source.whatsappSchema) await tx.execute(sql.replace('CREATE TABLE', 'CREATE TABLE IF NOT EXISTS'));
    const statements = [];
    for (const [table, rows] of Object.entries(prepared.tables)) {
      const columns = new Set((await tx.execute(`PRAGMA table_info(${quote(table)})`)).rows.map(c => c.name));
      for (const row of rows) {
        const keys = Object.keys(row);
        if (keys.some(key => !columns.has(key))) throw Error(`Live ${table} schema is outdated. Deploy current code first.`);
        statements.push({ sql: `INSERT INTO ${quote(table)}(${keys.map(quote).join(',')}) VALUES(${keys.map(() => '?').join(',')})`, args: keys.map(key => row[key]) });
      }
    }
    for (let index = 0; index < statements.length; index += 100) await tx.batch(statements.slice(index, index + 100));
    if ((await tx.execute('PRAGMA foreign_key_check')).rows.length) throw Error('Imported demo has invalid foreign keys.');
    const invalidLinks = await tx.execute(`SELECT s.id FROM patient_sessions s JOIN appointments a ON a.id=s.appointmentId WHERE s.patientId!=a.patientId OR s.practitionerId!=a.practitionerId OR s.serviceSlug!=a.service OR s.date!=a.date OR s.time!=a.startTime LIMIT 1`);
    if (invalidLinks.rows.length) throw Error('Imported demo has invalid clinical links.');
    for (const [table, before] of Object.entries(preserved)) {
      const after = (await tx.execute(`SELECT * FROM ${quote(table)}`)).rows.map(row => ({ ...row }));
      const stable = row => JSON.stringify(Object.keys(row).sort().map(key => [key, row[key]]));
      const remaining = new Set(after.map(stable));
      if (before.some(row => !remaining.has(stable(row)))) throw Error(`Existing ${table} records changed unexpectedly.`);
    }
    if (beforeCommit) await beforeCommit(tx); // Integration-test fault injection; not exposed by the CLI.
    await tx.execute('CREATE TABLE IF NOT EXISTS ryma_demo_imports(id TEXT PRIMARY KEY, report TEXT NOT NULL)');
    await tx.execute({ sql: 'INSERT INTO ryma_demo_imports(id,report) VALUES(?,?)', args: [IMPORT_ID, JSON.stringify(report)] });
    await tx.commit();
    return { report, imported: true };
  } catch (error) { await tx.rollback(); throw error; }
  finally { tx.close(); }
}

module.exports = { IMPORT_ID, readSource, existingImport, snapshot, importDemo };

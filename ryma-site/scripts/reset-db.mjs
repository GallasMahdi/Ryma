/**
 * Clear records, preserving team, services, schedules and authentication.
 * Stop servers/workers first. Backups of ALL targets precede ANY deletion.
 * Each target commits atomically; separate databases cannot share a commit.
 * npm run db:reset -- --dry-run
 * npm run db:reset -- --local data/ryma.db --local <preview.db>
 * --local replaces the default path and may be repeated. --local-only skips Turso.
 * --no-env prevents loading project credentials (for isolated tests).
 */
import Database from 'better-sqlite3';
import { createClient } from '@libsql/client';
import nextEnv from '@next/env';
import path from 'node:path';
import fs from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const CLEAR_TABLES = [
  'whatsapp_inbox', 'whatsapp_outbox', 'whatsapp_conversations',
  'patient_sessions', 'invoices', 'prescriptions', 'patient_notes',
  'appointments', 'patients', 'reviews', 'idempotency_keys', 'rate_limit_log',
];
const SEED_KEY = 'reviews_seed_disabled';
const quote = name => '"' + name.replaceAll('"', '""') + '"';
const json = value => JSON.stringify(value, (_, v) => {
  if (typeof v === 'bigint') return { $bigint: String(v) };
  if (v instanceof ArrayBuffer || ArrayBuffer.isView(v)) return { $blob: Buffer.from(v instanceof ArrayBuffer ? v : v.buffer, v.byteOffset || 0, v.byteLength).toString('base64') };
  return v;
});
const hash = value => createHash('sha256').update(json(value)).digest('hex');
const digestRows = rows => hash(rows.map(row => json(Object.fromEntries(Object.keys(row).sort().map(k => [k, row[k]])))).sort());
const counts = snapshot => Object.fromEntries(Object.entries(snapshot.tables).map(([name, rows]) => [name, rows.length]));

async function snapshot(query) {
  const schema = await query("SELECT type,name,tbl_name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name");
  const tables = {};
  for (const { name } of schema.filter(s => s.type === 'table')) tables[name] = await query(`SELECT * FROM ${quote(name)}`);
  return { schema, tables };
}
function sameData(a, b) {
  return hash(a.schema) === hash(b.schema) && Object.keys(a.tables).every(t => digestRows(a.tables[t]) === digestRows(b.tables[t]));
}
async function check(query) {
  const integrity = await query('PRAGMA quick_check');
  if (integrity.length !== 1 || Object.values(integrity[0])[0] !== 'ok') throw Error('Database integrity check failed');
  if ((await query('PRAGMA foreign_key_check')).length) throw Error('Database has foreign-key violations');
}
async function openLocal(file) {
  const db = new Database(file, { fileMustExist: true, timeout: 10000 });
  db.pragma('foreign_keys = ON');
  const query = async (sql, args = []) => { const stmt = db.prepare(sql); return stmt.reader ? stmt.all(...args) : (stmt.run(...args), []); };
  return {
    target: file, kind: 'sqlite', query, close: () => db.close(),
    begin: async () => { db.exec('BEGIN IMMEDIATE'); return { query, commit: async () => db.exec('COMMIT'), rollback: async () => db.exec('ROLLBACK'), close() {} }; },
    backup: async destination => {
      await db.backup(destination);
      const copy = new Database(destination, { readonly: true });
      try { const read = async sql => copy.prepare(sql).all(); await check(read); return await snapshot(read); }
      finally { copy.close(); }
    },
  };
}
async function openCloud(config) {
  const client = createClient(config);
  const query = async (sql, args = []) => (await client.execute({ sql, args })).rows.map(row => Object.fromEntries(Object.entries(row)));
  try { await query('PRAGMA foreign_keys = ON'); } catch (error) { client.close(); throw error; }
  return {
    target: new URL(config.url).hostname || 'file-backed-libsql', kind: 'libsql', query, close: () => client.close(),
    begin: async () => {
      const tx = await client.transaction('write');
      return { query: async (sql, args = []) => (await tx.execute({ sql, args })).rows.map(row => Object.fromEntries(Object.entries(row))), commit: () => tx.commit(), rollback: () => tx.rollback(), close: () => tx.close() };
    },
    backup: async destination => {
      const tx = await client.transaction('read');
      try {
        const read = async sql => (await tx.execute(sql)).rows.map(row => Object.fromEntries(Object.entries(row)));
        await check(read);
        const data = await snapshot(read);
        const serialized = json({ format: 'ryma-reset-snapshot-v1', createdAt: new Date().toISOString(), ...data });
        fs.writeFileSync(destination, serialized, { flag: 'wx', mode: 0o600 });
        if (fs.readFileSync(destination, 'utf8') !== serialized) throw Error('Backup verification failed');
        await tx.commit();
        return data;
      } finally { tx.close(); }
    },
  };
}

async function clearTarget(store, before) {
  const tx = await store.begin();
  try {
    if (!sameData(before, await snapshot(tx.query))) throw Error('Database changed since its backup; stop writers and retry');
    for (const table of CLEAR_TABLES) if (before.tables[table]) await tx.query(`DELETE FROM ${quote(table)}`);
    if (before.tables.reviews) {
      if (!before.tables.security_settings) throw Error('Missing security_settings; cannot suppress review reseeding');
      await tx.query('INSERT INTO security_settings(key,value,updatedAt) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updatedAt=excluded.updatedAt', [SEED_KEY, '1', new Date().toISOString()]);
    }
    if (before.tables.booking_sync) await tx.query('UPDATE booking_sync SET revision=revision+1 WHERE id=1');
    const after = await snapshot(tx.query);
    for (const [table, rows] of Object.entries(before.tables)) {
      if (CLEAR_TABLES.includes(table)) {
        if (after.tables[table].length) throw Error(`Records remain in ${table}`);
      } else if (table !== 'booking_sync') {
        const keep = values => table === 'security_settings' ? values.filter(v => v.key !== SEED_KEY) : values;
        if (digestRows(keep(rows)) !== digestRows(keep(after.tables[table]))) throw Error(`Preserved table changed: ${table}`);
      }
    }
    await check(tx.query);
    await tx.commit();
    return counts(after);
  } catch (error) { await tx.rollback(); throw error; }
  finally { tx.close(); }
}

export async function resetDatabases({ locals = [], cloud, backupDir, dryRun = false }) {
  const stores = [], report = { startedAt: new Date().toISOString(), dryRun, status: 'preflight', targets: [] };
  let reportFile;
  try {
    for (const file of [...new Set(locals.map(p => fs.realpathSync(path.resolve(p))))]) stores.push(await openLocal(file));
    if (cloud) stores.push(await openCloud(cloud));
    if (!stores.length) throw Error('No database targets');
    for (const store of stores) {
      await check(store.query);
      const data = await snapshot(store.query);
      if (!data.tables.appointments || !data.tables.patients) throw Error('Target is not a Ryma database');
      if (data.tables.reviews && !data.tables.security_settings) throw Error('Target has no review reset marker storage');
      report.targets.push({ target: store.target, kind: store.kind, status: 'inspected', before: counts(data) });
    }
    if (dryRun) { report.status = 'dry-run'; return report; }
    const directory = path.join(backupDir, `reset-${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`);
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    reportFile = path.join(directory, 'report.json');
    const save = () => fs.writeFileSync(reportFile, JSON.stringify(report, null, 2), { mode: 0o600 });
    save();
    // No target is modified until every backup is complete and verified.
    const backups = [];
    for (const [i, store] of stores.entries()) {
      const destination = path.join(directory, `${i + 1}-${store.kind}.${store.kind === 'sqlite' ? 'db' : 'json'}`);
      backups.push(await store.backup(destination));
      Object.assign(report.targets[i], { backup: destination, backupSha256: createHash('sha256').update(fs.readFileSync(destination)).digest('hex'), before: counts(backups[i]), status: 'backed-up' });
      save();
    }
    report.status = 'resetting'; save();
    for (const [i, store] of stores.entries()) {
      report.targets[i].after = await clearTarget(store, backups[i]);
      report.targets[i].status = 'committed'; save();
      const final = counts(await snapshot(store.query));
      if (CLEAR_TABLES.some(t => final[t] > 0)) throw Error('Records reappeared after commit; stop concurrent writers');
      await check(store.query);
      report.targets[i].status = 'verified'; save();
    }
    report.status = 'complete'; report.completedAt = new Date().toISOString(); save();
    return { ...report, reportFile };
  } catch (error) {
    report.status = 'failed';
    if (reportFile) fs.writeFileSync(reportFile, JSON.stringify(report, null, 2), { mode: 0o600 });
    error.reportFile = reportFile;
    throw error;
  } finally { for (const store of stores) store.close(); }
}

async function main() {
  const args = process.argv.slice(2), locals = [];
  let dryRun = false, localOnly = false, noEnv = false, backupDir = path.resolve('data/backups');
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dry-run') dryRun = true;
    else if (arg === '--local-only') localOnly = true;
    else if (arg === '--no-env') noEnv = true;
    else if (['--local', '--backup-dir'].includes(arg)) {
      const value = args[++i];
      if (!value || value.startsWith('--')) throw Error(`Missing value for ${arg}`);
      if (arg === '--local') locals.push(path.resolve(value)); else backupDir = path.resolve(value);
    } else throw Error(`Unknown argument: ${arg}`);
  }
  if (!noEnv) nextEnv.loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
  if (!locals.length) locals.push(path.resolve(process.env.DATABASE_PATH || 'data/ryma.db'));
  const cloud = !localOnly && process.env.TURSO_DATABASE_URL ? { url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN } : undefined;
  console.log(JSON.stringify(await resetDatabases({ locals, cloud, backupDir, dryRun }), null, 2));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error('[RESET FAILED]', error.message); if (error.reportFile) console.error('Per-target status:', error.reportFile); process.exitCode = 1; });
}

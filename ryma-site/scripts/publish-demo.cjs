const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
const { createClient } = require('@libsql/client');
const { ROOT, demoPaths, acquireLock } = require('./demo/runtime.cjs');
const { readSource, existingImport, snapshot, importDemo } = require('./demo/cloud-import.cjs');

async function main() {
  let name = 'default', execute = false;
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--execute') execute = true;
    else if (args[i] === '--name' && args[i + 1]) name = args[++i];
    else if (args[i] === '--help') { console.log('Usage: npm run demo:publish -- [--name default] [--execute]\nRead-only plan by default. --execute imports into the Turso database configured in your environment/.env.local.\nRequires an empty clinical database/catalogue with compatible hours. Preserves existing settings/team/reviews.\nAlways saves a private backup first; imports atomically, adds no pending messages and never replaces data.'); return; }
    else throw Error(`Unknown option: ${args[i]}`);
  }
  const paths = demoPaths(name), release = acquireLock(paths);
  let client;
  try {
    const sqlite = new Database(paths.db, { readonly: true, fileMustExist: true });
    let source; try { source = readSource(sqlite); } finally { sqlite.close(); }
    require('@next/env').loadEnvConfig(ROOT, false);
    const url = process.env.TURSO_DATABASE_URL, authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url || !authToken || !/^libsql:\/\//.test(url)) throw Error('Set TURSO_DATABASE_URL (libsql://) and TURSO_AUTH_TOKEN for the intended demo deployment.');
    client = createClient({ url, authToken });
    console.log(`Target database: ${new URL(url).hostname}`);
    const previous = await existingImport(client);
    if (previous) { console.log('This demo was already imported; no data changed.'); return; }
    const plan = await importDemo(client, source);
    console.log(JSON.stringify({ dryRun: true, totals: plan.report.totals,
      appointmentsAdjustedForExistingCalendar: plan.report.adjustedAppointments.length,
      invoicePrefix: plan.report.invoicePrefix, notifications: plan.report.notifications }, null, 2));
    if (!execute) { console.log('Read-only plan complete. Use --execute to back up and import into this database.'); return; }
    const backups = demoPaths('cloud-backups').dir;
    const backupFile = path.join(backups, new Date().toISOString().replace(/[:.]/g, '-') + '-before.json');
    const backup = await snapshot(client);
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(`Private backup saved: ${backupFile}`);
    const result = await importDemo(client, source, { execute: true });
    const reportFile = path.join(backups, 'last-import.json');
    fs.writeFileSync(reportFile, JSON.stringify({ ...result, backupFile }, null, 2) + '\n');
    console.log(result.imported ? `Demo imported successfully. Report: ${reportFile}` : 'Demo was already imported; no duplicate rows added.');
  } finally { client?.close(); release(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });

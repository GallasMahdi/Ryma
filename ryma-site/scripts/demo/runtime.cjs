const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');

const ROOT = path.resolve(__dirname, '../..');
const VERSION = 1;

function demoPaths(name = 'default') {
  if (!/^[a-z0-9][a-z0-9-]{0,39}$/.test(name)) throw Error('Demo name must contain only lowercase letters, numbers and hyphens (1–40 characters).');
  const base = path.join(ROOT, '.demo');
  const dir = path.join(base, name);
  // Never follow a junction/symlink into a working or production database.
  for (const entry of [base, dir]) {
    if (fs.existsSync(entry) && fs.lstatSync(entry).isSymbolicLink()) throw Error('Demo directories must not be symbolic links or junctions.');
    fs.mkdirSync(entry, { recursive: true });
  }
  const db = path.join(dir, 'ryma-demo.db');
  if (fs.existsSync(db) && fs.lstatSync(db).isSymbolicLink()) throw Error('Demo database must not be a symbolic link.');
  return { dir, db, lock: path.join(dir, 'demo.lock'), report: path.join(dir, 'report.json') };
}

function acquireLock(paths) {
  let fd;
  try { fd = fs.openSync(paths.lock, 'wx'); }
  catch (error) {
    if (error.code === 'EEXIST') throw Error(`This demo is already in use. Stop its server before seeding or resetting. If a previous process crashed, verify it has stopped before removing ${paths.lock}`);
    throw error;
  }
  fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
  let released = false;
  return () => { if (!released) { released = true; fs.closeSync(fd); fs.unlinkSync(paths.lock); } };
}

function demoEnvironment(database, mode = 'development') {
  const env = { ...process.env };
  // Do not load .env.local or inherit any external database/messaging credentials.
  for (const key of Object.keys(env)) {
    if (/^(TURSO_|SMTP_|WHATSAPP_|RECAPTCHA_|NEXT_PUBLIC_|VERCEL|AWS_LAMBDA_FUNCTION_NAME|NETLIFY)/.test(key)) env[key] = '';
  }
  const bcrypt = require('bcryptjs');
  return { ...env, __NEXT_PROCESSED_ENV: 'true', NODE_ENV: mode,
    DATABASE_PATH: database, TURSO_DATABASE_URL: '', TURSO_AUTH_TOKEN: '', ALLOW_SQLITE_FALLBACK: 'true',
    SESSION_SECRET: randomBytes(32).toString('hex'),
    ADMIN_PASSWORD_HASH: bcrypt.hashSync('ryma2024admin', 10),
    OWNER_ANALYTICS_PASSWORD_HASH: bcrypt.hashSync('ryma2024owner', 10),
    SMTP_HOST: '', SMTP_USER: '', SMTP_PASS: '', ADMIN_NOTIFICATION_EMAIL: '',
    WHATSAPP_ENABLED: 'false', WHATSAPP_ACCESS_TOKEN: '', WHATSAPP_JOB_SECRET: '',
    RECAPTCHA_SECRET_KEY: '', NEXT_PUBLIC_RECAPTCHA_SITE_KEY: '', NEXT_TELEMETRY_DISABLED: '1' };
}

function readManifest(database) {
  const db = new (require('better-sqlite3'))(database, { readonly: true, fileMustExist: true });
  try {
    const row = db.prepare('SELECT version, report FROM ryma_demo_seed WHERE id=1').get();
    if (!row) throw Error('Missing marker');
    return { version: row.version, ...JSON.parse(row.report) };
  } catch { throw Error('This database is not owned by the demo generator. It will not be changed.'); }
  finally { db.close(); }
}

// Use the actual application schema, validators and services, as the integration tests do.
function createAppLoader() {
  const ts = require('typescript'), vm = require('node:vm'), cache = new Map();
  function load(id, parent = ROOT) {
    if (id === '@libsql/client') return { createClient() { throw Error('Cloud database access is disabled in the demo generator.'); } };
    if (!id.startsWith('@/') && !id.startsWith('.')) return require(id);
    const base = id.startsWith('@/') ? path.join(ROOT, 'src', id.slice(2)) : path.resolve(parent, id);
    const file = ['.ts', '.tsx', ''].map(ext => base + ext).find(f => fs.existsSync(f) && fs.statSync(f).isFile());
    if (!file) throw Error(`Cannot load application module: ${id}`);
    if (cache.has(file)) return cache.get(file).exports;
    const mod = { exports: {} }; cache.set(file, mod);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true,
    } }).outputText;
    vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(child => load(child, path.dirname(file)), mod, mod.exports);
    return mod.exports;
  }
  return load;
}

module.exports = { ROOT, VERSION, demoPaths, acquireLock, demoEnvironment, readManifest, createAppLoader };

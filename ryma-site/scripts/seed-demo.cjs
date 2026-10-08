const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { ROOT, VERSION, demoPaths, acquireLock, demoEnvironment, readManifest } = require('./demo/runtime.cjs');

function seedDemo({ name = 'default', reset = false } = {}) {
  const paths = demoPaths(name), release = acquireLock(paths);
  const stage = path.join(paths.dir, `seed-${randomUUID()}.db`);
  try {
    if (fs.existsSync(paths.db)) {
      const previous = readManifest(paths.db);
      if (!reset) {
        if (previous.version !== VERSION) throw Error('Demo format changed. Stop the demo and run npm run demo:seed -- --reset.');
        console.log(`Demo already exists (based on ${previous.baseDate}). Kept your test edits. Use --reset to rebuild it.`);
        return { paths, report: previous, reused: true };
      }
      for (const suffix of ['-wal', '-shm', '-journal']) {
        if (fs.existsSync(paths.db + suffix)) throw Error('Database sidecar found. Stop all processes using this demo database before resetting.');
      }
    }
    console.log('Building isolated demo with the current application schema and booking rules...');
    const result = spawnSync(process.execPath, [path.join(__dirname, 'demo/seed-worker.cjs')], {
      cwd: ROOT, env: demoEnvironment(stage, 'test'), encoding: 'utf8', windowsHide: true, maxBuffer: 4 * 1024 * 1024,
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw Error(`Demo generation failed; the existing database was preserved.\n${result.stderr || result.stdout}`);
    const report = readManifest(stage);
    // Publish only a complete, validated, closed database. Never append partial data.
    fs.renameSync(stage, paths.db);
    fs.writeFileSync(paths.report, JSON.stringify(report, null, 2) + '\n');
    console.log(`Demo ready: ${paths.db}\n${JSON.stringify(report.totals, null, 2)}\nScenario guide: ${paths.report}`);
    return { paths, report, reused: false };
  } finally {
    for (const file of [stage, stage + '-wal', stage + '-shm', stage + '-journal']) if (fs.existsSync(file)) fs.unlinkSync(file);
    release();
  }
}

function parseArgs(args) {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--reset') options.reset = true;
    else if (args[i] === '--name' && args[i + 1]) options.name = args[++i];
    else if (args[i] === '--help') options.help = true;
    else throw Error(`Unknown option: ${args[i]}. Use --help.`);
  }
  return options;
}

function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) console.log('Usage: npm run demo:seed -- [--name default] [--reset]\nCreates 100 fictional patients and complete linked test scenarios in .demo/<name>/ryma-demo.db.\nExisting demos are preserved unless --reset is supplied. Never reads .env.local or writes to Turso/data/ryma.db.\nStart it with npm run demo:dev. See docs/DEMO-DATA.md.');
    else seedDemo(options);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}

if (require.main === module) main();
module.exports = { seedDemo, parseArgs, main };

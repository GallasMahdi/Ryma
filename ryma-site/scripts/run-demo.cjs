const { spawn } = require('node:child_process');
const { seedDemo } = require('./seed-demo.cjs');
const { ROOT, acquireLock, demoEnvironment } = require('./demo/runtime.cjs');

async function main() {
  const args = process.argv.slice(2), mode = args.shift() || 'dev';
  if (!['dev', 'build', 'start'].includes(mode)) throw Error('Use dev, build or start.');
  let name = 'default', port = '3007';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--name' && args[i + 1]) name = args[++i];
    else if (args[i] === '--port' && args[i + 1]) port = args[++i];
    else throw Error(`Unknown option: ${args[i]}`);
  }
  if (!/^\d+$/.test(port) || +port < 1024 || +port > 65535) throw Error('Choose a port between 1024 and 65535.');
  const { paths } = seedDemo({ name });
  const release = acquireLock(paths);
  console.log(`\nLOCAL DEMO — fictional data · email/WhatsApp delivery disabled\nhttp://127.0.0.1:${port}/admin\nAdmin: ryma2024admin · Owner analytics: ryma2024owner\nStop this server before resetting.\n`);
  try {
    const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), mode, ...(mode === 'build' ? [] : ['--hostname', '127.0.0.1', '--port', port])], {
      cwd: ROOT, env: demoEnvironment(paths.db, mode === 'dev' ? 'development' : 'production'), stdio: 'inherit', windowsHide: true,
    });
    const stop = () => child.kill('SIGTERM');
    process.on('SIGINT', stop); process.on('SIGTERM', stop);
    await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', (code, signal) => { process.exitCode = code ?? (signal ? 130 : 1); resolve(); }); });
    process.removeListener('SIGINT', stop); process.removeListener('SIGTERM', stop);
  } finally { release(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });

import { spawn } from 'child_process';
import path from 'path';

const testVars = [
  { name: 'SESSION_SECRET', remove: ['SESSION_SECRET'] },
  { name: 'TURSO_DATABASE_URL', remove: ['TURSO_DATABASE_URL'] },
  { name: 'TURSO_AUTH_TOKEN', remove: ['TURSO_AUTH_TOKEN'] },
  { name: 'ADMIN_PASSWORD_HASH', remove: ['ADMIN_PASSWORD_HASH'] },
  { name: 'OWNER_ANALYTICS_PASSWORD_HASH', remove: ['OWNER_ANALYTICS_PASSWORD_HASH'] },
  { name: 'SMTP_USER', remove: ['SMTP_USER', 'SMTP_PASS'] },
  { name: 'RECAPTCHA_SECRET_KEY', remove: ['RECAPTCHA_SECRET_KEY'] },
];

async function testEnvVar(targetVar, mode) {
  return new Promise((resolve) => {
    const envCopy = { ...process.env, NODE_ENV: mode };
    // Ensure baseline required vars exist except the sabotaged ones
    if (!envCopy.SESSION_SECRET) envCopy.SESSION_SECRET = 'a'.repeat(32);
    if (!envCopy.ADMIN_PASSWORD_HASH) envCopy.ADMIN_PASSWORD_HASH = '$2a$12$e8nO6dsmbT5W9mE9t257U.k0e8zHhD0wYc2WfR2fU6yB1nO6ds';
    if (!envCopy.OWNER_ANALYTICS_PASSWORD_HASH) envCopy.OWNER_ANALYTICS_PASSWORD_HASH = '$2a$12$e8nO6dsmbT5W9mE9t257U.k0e8zHhD0wYc2WfR2fU6yB1nO6ds';
    if (!envCopy.TURSO_DATABASE_URL) envCopy.TURSO_DATABASE_URL = 'libsql://test.turso.io';
    if (!envCopy.TURSO_AUTH_TOKEN) envCopy.TURSO_AUTH_TOKEN = 'test_token';
    if (!envCopy.RECAPTCHA_SECRET_KEY) envCopy.RECAPTCHA_SECRET_KEY = 'test_recaptcha';

    // Remove sabotaged vars
    targetVar.remove.forEach((v) => delete envCopy[v]);

    // Test runner code that imports env and tests behavior
    const code = `
      try {
        const { env } = await import('./src/lib/env.ts');
        console.log('BOOT_SUCCESS:', JSON.stringify(env));
      } catch (err) {
        console.error('BOOT_CRASH:', err.message);
        process.exit(1);
      }
    `;

    const child = spawn('node', ['--input-type=module', '-e', code], {
      cwd: process.cwd(),
      env: envCopy,
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));

    child.on('close', (code) => {
      resolve({
        variable: targetVar.name,
        mode,
        exitCode: code,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        behavior: code !== 0 ? 'CRASH' : stdout.includes('BOOT_SUCCESS') ? 'DEFAULT/WARN' : 'UNKNOWN',
      });
    });
  });
}

async function run() {
  console.log('=== PHASE 2: ENVIRONMENT SABOTAGE MATRIX ===\n');
  const results = [];
  for (const v of testVars) {
    const prodRes = await testEnvVar(v, 'production');
    const devRes = await testEnvVar(v, 'development');
    results.push({ variable: v.name, production: prodRes, development: devRes });
    console.log(`Variable: ${v.name}`);
    console.log(`  Production : ${prodRes.behavior} -> ${prodRes.stderr || prodRes.stdout}`);
    console.log(`  Development: ${devRes.behavior} -> ${devRes.stderr || devRes.stdout}\n`);
  }
}

run();
